require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
const { User } = require('../models')
const { buildSystemPrompt, funcoes } = require('../controllers/aiController')

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })

const sessoes = {}
const MAX_HISTORICO = 20

function getSessao(chatId) { return sessoes[chatId] || null }

function addHistorico(chatId, papel, conteudo) {
  if (!sessoes[chatId]) return
  sessoes[chatId].historico.push({ role: papel, content: conteudo })
  if (sessoes[chatId].historico.length > MAX_HISTORICO)
    sessoes[chatId].historico = sessoes[chatId].historico.slice(-MAX_HISTORICO)
}

// ─── COMANDOS ─────────────────────────────────────────────

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    '👋 Olá! Sou seu assistente financeiro com IA.\n\n' +
    '📧 Para começar: /login seu@email.com'
  )
})

bot.onText(/\/login (.+)/, async (msg, match) => {
  const chatId = msg.chat.id
  const email  = match[1].trim()
  try {
    const user = await User.findOne({ where: { email } })
    if (!user) return bot.sendMessage(chatId, '❌ E-mail não encontrado.')

    sessoes[chatId] = { userId: user.id, historico: [] }
    bot.sendMessage(chatId,
      `✅ Conectado como *${user.nome}*!\n\n` +
      'Posso consultar e *registrar* dados. Exemplos:\n' +
      '• _Qual meu saldo atual?_\n' +
      '• _Registra R$50 de despesa no mercado_\n' +
      '• _Transfere R$100 da conta X para Y_\n' +
      '• _Cria orçamento de alimentação com limite R$500_\n\n' +
      '/limpar — apaga histórico | /logout — sair | /ajuda — comandos',
      { parse_mode: 'Markdown' }
    )
  } catch (err) {
    console.error('Erro login:', err.message)
    bot.sendMessage(chatId, '❌ Erro ao buscar usuário.')
  }
})

bot.onText(/\/limpar/, (msg) => {
  const sessao = getSessao(msg.chat.id)
  if (!sessao) return bot.sendMessage(msg.chat.id, '⚠️ Você não está logado.')
  sessoes[msg.chat.id].historico = []
  bot.sendMessage(msg.chat.id, '🗑 Histórico apagado!')
})

bot.onText(/\/logout/, (msg) => {
  delete sessoes[msg.chat.id]
  bot.sendMessage(msg.chat.id, '👋 Sessão encerrada. Use /login para entrar novamente.')
})

bot.onText(/\/ajuda/, (msg) => {
  bot.sendMessage(msg.chat.id,
    '📋 *Comandos:*\n\n' +
    '/start — Inicia o bot\n' +
    '/login email — Conecta sua conta\n' +
    '/limpar — Apaga o histórico\n' +
    '/logout — Encerra a sessão\n' +
    '/ajuda — Esta lista\n\n' +
    '💬 *Exemplos de ações:*\n' +
    '• "Registra R$30 de despesa no uber"\n' +
    '• "Transfere R$200 da conta corrente para poupança"\n' +
    '• "Cria orçamento de lazer com R$300"\n' +
    '• "Qual meu saldo atual?"',
    { parse_mode: 'Markdown' }
  )
})

// ─── MENSAGENS LIVRES ─────────────────────────────────────

bot.on('message', async (msg) => {
  const chatId = msg.chat.id
  const texto  = msg.text
  if (!texto || texto.startsWith('/')) return

  const sessao = getSessao(chatId)
  if (!sessao) return bot.sendMessage(chatId, '⚠️ Faça login com:\n/login seu@email.com')

  let loadMsg
  try {
    const { userId } = sessao


    // ─── PROCESSAMENTO PELA IA ──────────────────────────────────────
    const systemPrompt = await buildSystemPrompt(userId)

    const messages = [
      { role: 'system', content: systemPrompt },
      ...sessao.historico,
      { role: 'user', content: texto },
    ]

    loadMsg = await bot.sendMessage(chatId, '🤔 Processando...')

    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b'
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        options: { temperature: 0 },
        stream: false
      }),
    })

    const rawText = await ollamaRes.text()
    let data
    try {
      data = JSON.parse(rawText)
    } catch (parseErr) {
      return bot.editMessageText(`❌ Resposta inválida do Ollama: ${rawText}`, {
        chat_id: chatId, message_id: loadMsg.message_id,
      })
    }

    if (data.error) {
      let errStr = `❌ Erro no Ollama: ${data.error}`
      if (data.error.includes('requires more system memory')) {
        errStr = `⚠️ **O Ollama ficou sem memória!**\n\nO modelo (\`${OLLAMA_MODEL}\`) exige mais memória RAM livre do que está disponível no momento.`
      }
      return bot.editMessageText(errStr, {
        chat_id: chatId, message_id: loadMsg.message_id,
      })
    }

    let resposta = data.message?.content?.trim()

    // Remove bloco <think> do DeepSeek
    resposta = resposta?.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

    if (!resposta) {
      return bot.editMessageText('❌ Sem resposta da IA. Tente novamente.', {
        chat_id: chatId, message_id: loadMsg.message_id,
      })
    }

    // ─── Detecta se a IA retornou uma ação JSON ───────────
    let jsonMatch = resposta.match(/\{[\s\S]*"acao"[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const { acao, params } = JSON.parse(jsonMatch[0])
        if (funcoes[acao]) {
          const resultado = await funcoes[acao]({ userId, ...params })
          addHistorico(chatId, 'user', texto)
          addHistorico(chatId, 'model', resultado)
          return bot.editMessageText(resultado, {
            chat_id: chatId,
            message_id: loadMsg.message_id,
            parse_mode: 'Markdown',
          })
        }
      } catch (e) {
        console.error('Erro ao executar ação:', e.message)
      }
    }

    // ─── Resposta normal ──────────────────────────────────
    addHistorico(chatId, 'user', texto)
    addHistorico(chatId, 'model', resposta)

    await bot.editMessageText(resposta, {
      chat_id: chatId,
      message_id: loadMsg.message_id,
      parse_mode: 'Markdown',
    }).catch(() => {
      bot.editMessageText(resposta, { chat_id: chatId, message_id: loadMsg.message_id })
    })

  } catch (err) {
    console.error('Erro:', err.message)
    const errorMsg = '❌ Erro ao processar. Verifique se o Ollama está rodando.'
    if (loadMsg) bot.editMessageText(errorMsg, { chat_id: chatId, message_id: loadMsg.message_id })
    else bot.sendMessage(chatId, errorMsg)
  }
})

module.exports = bot