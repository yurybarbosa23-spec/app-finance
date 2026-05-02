const { Account } = require('../models')

async function listar(req, res) {
  try {
    const contas = await Account.findAll({ where: { userId: req.userId } })
    res.json(contas)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar contas' })
  }
}

async function criar(req, res) {
  try {
    const { nome, banco, saldo, cor } = req.body
    const conta = await Account.create({ nome, banco, saldo: saldo || 0, cor: cor || '#14b8a6', userId: req.userId })
    res.status(201).json(conta)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao criar conta' })
  }
}

async function deletar(req, res) {
  try {
    await Account.destroy({ where: { id: req.params.id, userId: req.userId } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao deletar conta' })
  }
}

module.exports = { listar, criar, deletar }