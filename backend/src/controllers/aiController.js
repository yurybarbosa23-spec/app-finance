const { Transaction, Budget, Account } = require('../models')

async function chat(req, res) {
  const { mensagem, userId } = req.body

  // Busca dados financeiros do usuário
  const [transacoes, orcamentos, contas] = await Promise.all([
    Transaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    }),
    Budget.findAll({ where: { userId } }),
    Account.findAll({ where: { userId } }),
  ])

  const contexto = `
Você é um assistente financeiro pessoal. Responda sempre em português brasileiro de forma clara e direta.

DADOS FINANCEIROS DO USUÁRIO:
- Contas: ${JSON.stringify(contas.map(c => ({ nome: c.nome, saldo: c.saldo })))}
- Orçamentos: ${JSON.stringify(orcamentos.map(o => ({ categoria: o.categoria, limite: o.limite, gasto: o.gasto })))}
- Últimas transações: ${JSON.stringify(transacoes.map(t => ({ descricao: t.descricao, valor: t.valor, tipo: t.tipo, data: t.createdAt })))}

Pergunta do usuário: ${mensagem}
`

  // Chamada para o Ollama (streaming)
  const ollamaRes = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      prompt: contexto,
      stream: true,
    }),
  })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const reader = ollamaRes.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const json = JSON.parse(line)
        if (json.response) res.write(`data: ${json.response}\n\n`)
        if (json.done) res.end()
      } catch {}
    }
  }
}

module.exports = { chat }