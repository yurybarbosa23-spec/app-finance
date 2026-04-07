const { Item, Transaction, Account } = require('../models')

async function listar(req, res) {
  try {
    const itens = await Item.findAll({ where: { userId: req.userId }, order: [['createdAt','DESC']] })
    res.json(itens)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar itens' })
  }
}

async function criar(req, res) {
  try {
    const { nome, descricao, valor, tipo, accountId } = req.body
    if (tipo === 'compra' && accountId) {
      const conta = await Account.findOne({ where: { id: accountId, userId: req.userId } })
      if (conta) {
        conta.saldo = Number(conta.saldo) - Number(valor)
        await conta.save()
        await Transaction.create({
          descricao: `Compra: ${nome}`, valor, tipo: 'despesa',
          categoria: 'compras', data: new Date().toISOString().split('T')[0],
          accountId, userId: req.userId
        })
      }
    }
    const item = await Item.create({ nome, descricao, valor, tipo: tipo || 'venda', userId: req.userId, accountId: accountId || null })
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao criar item' })
  }
}

async function vender(req, res) {
  try {
    const { accountId, valor } = req.body
    const item = await Item.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!item) return res.status(404).json({ erro: 'Item não encontrado' })

    const conta = await Account.findOne({ where: { id: accountId, userId: req.userId } })
    if (!conta) return res.status(404).json({ erro: 'Conta não encontrada' })

    conta.saldo = Number(conta.saldo) + Number(valor)
    await conta.save()

    await Transaction.create({
      descricao: `Venda: ${item.nome}`, valor, tipo: 'receita',
      categoria: 'outro', data: new Date().toISOString().split('T')[0],
      accountId, userId: req.userId
    })

    item.status = 'vendido'
    await item.save()
    res.json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao vender item' })
  }
}

async function deletar(req, res) {
  try {
    await Item.destroy({ where: { id: req.params.id, userId: req.userId } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao deletar item' })
  }
}

module.exports = { listar, criar, vender, deletar }