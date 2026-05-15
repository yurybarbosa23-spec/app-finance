require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
const { Transaction, Budget, Account, User } = require('../models')

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

// ─── FUNÇÕES QUE A IA PODE EXECUTAR ──────────────────────

const funcoes = {

  async registrarTransacao({ userId, descricao, valor, tipo, categoria, accountId }) {
    const conta = await Account.findOne({ where: { id: accountId, userId } })
    if (!conta) throw new Error('Conta não encontrada.')

    const hoje = new Date().toISOString().split('T')[0]
    await Transaction.create({ descricao, valor, tipo, categoria: categoria || 'outro', data: hoje, accountId, userId })

    const novoSaldo = tipo === 'receita'
      ? conta.saldo + valor
      : conta.saldo - valor
    await conta.update({ saldo: novoSaldo })

    return `✅ Transação registrada!\n📝 ${descricao}\n💰 R$${valor.toFixed(2)} (${tipo})\n🏦 Conta: ${conta.nome}\n💳 Novo saldo: R$${novoSaldo.toFixed(2)}`
  },

  async transferirEntreContas({ userId, origemId, destinoId, valor, descricao }) {
    const origem  = await Account.findOne({ where: { id: origemId,  userId } })
    const destino = await Account.findOne({ where: { id: destinoId, userId } })
    if (!origem)  throw new Error('Conta de origem não encontrada.')
    if (!destino) throw new Error('Conta de destino não encontrada.')
    if (origem.saldo < valor) throw new Error(`Saldo insuficiente. Saldo atual: R$${origem.saldo.toFixed(2)}`)

    const hoje = new Date().toISOString().split('T')[0]
    const desc = descricao || `Transferência para ${destino.nome}`

    await Transaction.create({ descricao: desc, valor, tipo: 'despesa', categoria: 'transferencia', data: hoje, accountId: origemId, userId })
    await Transaction.create({ descricao: desc, valor, tipo: 'receita', categoria: 'transferencia', data: hoje, accountId: destinoId, userId })
    await origem.update({ saldo: origem.saldo - valor })
    await destino.update({ saldo: destino.saldo + valor })

    return `✅ Transferência realizada!\n💸 R$${valor.toFixed(2)} de "${origem.nome}" → "${destino.nome}"\n🏦 ${origem.nome}: R$${(origem.saldo - valor).toFixed(2)}\n🏦 ${destino.nome}: R$${(destino.saldo + valor).toFixed(2)}`
  },

  async criarOrcamento({ userId, categoria, limite }) {
    const existente = await Budget.findOne({ where: { userId, categoria } })
    if (existente) {
      await existente.update({ limite })
      return `✅ Orçamento de "${categoria}" atualizado para R$${limite.toFixed(2)}`
    }
    await Budget.create({ categoria, limite, userId })
    return `✅ Orçamento criado!\n📂 Categoria: ${categoria}\n💰 Limite: R$${limite.toFixed(2)}`
  },
}

// ─── PROMPT DO SISTEMA ────────────────────────────────────

async function buildSystemPrompt(userId) {
  const [transacoes, orcamentos, contas] = await Promise.all([
    Transaction.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 50 }),
    Budget.findAll({ where: { userId } }),
    Account.findAll({ where: { userId } }),
  ])

  return `Você é um assistente financeiro pessoal. Responda sempre em português brasileiro.

DADOS ATUAIS:
- Contas: ${JSON.stringify(contas.map(c => ({ id: c.id, nome: c.nome, banco: c.banco, saldo: c.saldo })))}
- Orçamentos: ${JSON.stringify(orcamentos.map(o => ({ id: o.id, categoria: o.categoria, limite: o.limite })))}
- Últimas transações: ${JSON.stringify(transacoes.map(t => ({ id: t.id, descricao: t.descricao, valor: t.valor, tipo: t.tipo, categoria: t.categoria, data: t.data, accountId: t.accountId })))}

AÇÕES DISPONÍVEIS — quando o usuário pedir para registrar, transferir ou criar orçamento, responda APENAS com um JSON neste formato exato (sem texto antes ou depois):

Para registrar ENTRADA (salário, recebimento, pix recebido, dinheiro que entrou):
{"acao":"registrarTransacao","params":{"descricao":"string","valor":0.0,"tipo":"receita","categoria":"string","accountId":0}}

Para registrar SAÍDA (gasto, despesa, pagamento, compra, dinheiro que saiu):
{"acao":"registrarTransacao","params":{"descricao":"string","valor":0.0,"tipo":"despesa","categoria":"string","accountId":0}}

⚠️ REGRA CRÍTICA: o campo "tipo" aceita SOMENTE os valores "receita" ou "despesa".
NUNCA use: "entrada", "saida", "gasto", "crédito", "débito" ou qualquer outro valor.

Para transferir entre contas:
{"acao":"transferirEntreContas","params":{"origemId":0,"destinoId":0,"valor":0.0,"descricao":"string"}}

Para criar/atualizar orçamento:
{"acao":"criarOrcamento","params":{"categoria":"string","limite":0.0}}

Categorias válidas para receita: salario, freelance, investimento, presente, transferencia, aluguel_rec, premio, outro
Categorias válidas para despesa: mercado, restaurante, transporte, moradia, saude, lazer, compras, contas, educacao, assinatura, combustivel, transferencia, outro

Para qualquer outra pergunta, responda normalmente em texto usando emojis.`
} // ← fechamento do buildSystemPrompt

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
    const systemPrompt = await buildSystemPrompt(userId)

    const messages = [
      { role: 'system', content: systemPrompt },
      ...sessao.historico,
      { role: 'user', content: texto },
    ]

    loadMsg = await bot.sendMessage(chatId, '🤔 Processando...')

    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-r1:8b', messages, stream: false }),
    })

    const data = JSON.parse(await ollamaRes.text())
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
          addHistorico(chatId, 'assistant', resultado)
          return bot.editMessageText(resultado, {
            chat_id: chatId, message_id: loadMsg.message_id,
          })
        }
      } catch (e) {
        console.error('Erro ao executar ação:', e.message)
      }
    }

    // ─── Resposta normal ──────────────────────────────────
    addHistorico(chatId, 'user', texto)
    addHistorico(chatId, 'assistant', resposta)

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