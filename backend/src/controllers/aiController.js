const { Transaction, Budget, Account } = require('../models')

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

  return `Você é a Finora, uma assistente financeira em um chat contínuo. Responda em português brasileiro de forma natural, direta e humana.
REGRAS IMPORTANTES DA CONVERSA:
1. NÃO inicie suas respostas com saudações ("Olá", "Oi") a menos que seja a primeira mensagem. Mantenha o fluxo de uma conversa contínua.
2. NUNCA liste transações ou históricos a menos que o usuário PEÇA EXPLICITAMENTE para ver seus lançamentos, gastos ou resumo.
3. QUANDO o usuário pedir explicitamente para listar transações, liste os detalhes (descrição, valor e data) com base nas "Últimas transações" abaixo. Nunca resuma com "aqui estão" sem mostrá-las.

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
}

// ─── ENDPOINT DO CHAT ─────────────────────────────────────

async function chat(req, res) {
  const { mensagem, userId, historico = [] } = req.body

  try {
    const systemPrompt = await buildSystemPrompt(userId)

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historico,
      { role: 'user', content: mensagem },
    ]

    // Chamada para o Ollama (NÃO streaming, para poder detectar ações JSON)
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
      return res.json({ text: '❌ Sem resposta da IA. Tente novamente.' })
    }

    // ─── Detecta se a IA retornou uma ação JSON ───────────
    const jsonMatch = resposta.match(/\{[\s\S]*"acao"[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const { acao, params } = JSON.parse(jsonMatch[0])
        if (funcoes[acao]) {
          const resultado = await funcoes[acao]({ userId, ...params })
          return res.json({ text: resultado })
        }
      } catch (e) {
        console.error('Erro ao executar ação:', e.message)
        return res.json({ text: `❌ Erro ao executar ação: ${e.message}` })
      }
    }

    // ─── Resposta normal (texto) ──────────────────────────
    return res.json({ text: resposta })

  } catch (err) {
    console.error('Erro no chat web:', err.message)
    return res.json({ text: '❌ Erro ao processar. Verifique se o Ollama está rodando.' })
  }
}

module.exports = { chat }