const { Transaction, Account } = require('../models')

async function listar(req, res) {
  try {
    const tx = await Transaction.findAll({
      where: { userId: req.userId },
      include: [{ model: Account, attributes: ['banco', 'nome', 'cor'] }],
      order: [['createdAt', 'DESC']],
    })
    res.json(tx)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar transações' })
  }
}

async function criar(req, res) {
  try {
    const { descricao, valor, tipo, categoria, data, accountId } = req.body
    const conta = await Account.findOne({ where: { id: accountId, userId: req.userId } })
    if (!conta) return res.status(404).json({ erro: 'Conta não encontrada' })

    conta.saldo = tipo === 'receita'
      ? Number(conta.saldo) + Number(valor)
      : Number(conta.saldo) - Number(valor)
    await conta.save()

    const tx = await Transaction.create({
      descricao, valor, tipo, categoria, data, accountId, userId: req.userId
    })
    res.status(201).json(tx)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao criar transação' })
  }
}

async function deletar(req, res) {
  try {
    const tx = await Transaction.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!tx) return res.status(404).json({ erro: 'Não encontrada' })

    const conta = await Account.findByPk(tx.accountId)
    if (conta) {
      conta.saldo = tx.tipo === 'receita'
        ? Number(conta.saldo) - Number(tx.valor)
        : Number(conta.saldo) + Number(tx.valor)
      await conta.save()
    }
    await tx.destroy()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao deletar transação' })
  }
}

module.exports = { listar, criar, deletar }