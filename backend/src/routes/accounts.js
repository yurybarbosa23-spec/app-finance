// backend/src/routes/accounts.js
const express        = require('express')
const router         = express.Router()
const authMiddleware = require('../middlewares/auth')
const { Account, Transaction, Item, sequelize } = require('../models')

// GET /api/accounts — lista as contas do usuário logado
router.get('/', authMiddleware, async (req, res) => {
  try {
    const contas = await Account.findAll({
      where: { userId: req.userId },
      order: [['createdAt', 'ASC']],
    })
    return res.json(contas)
  } catch (err) {
    console.error('Erro ao listar contas:', err)
    return res.status(500).json({ erro: 'Erro interno' })
  }
})

// GET /api/accounts/user/:userId — contas de outro usuário (sem saldo)
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const contas = await Account.findAll({
      where: { userId: req.params.userId },
      attributes: ['id', 'banco', 'nome', 'cor'],
    })
    return res.json(contas)
  } catch (err) {
    console.error('Erro ao buscar contas do usuário:', err)
    return res.status(500).json({ erro: 'Erro interno' })
  }
})

// POST /api/accounts — cria nova conta
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { nome, banco, saldo, cor } = req.body
    if (!banco) return res.status(400).json({ erro: 'Banco é obrigatório' })

    const conta = await Account.create({
      nome:   nome  || banco,
      banco:  banco,
      saldo:  saldo || 0,
      cor:    cor   || '#14b8a6',
      userId: req.userId,
    })
    return res.status(201).json(conta)
  } catch (err) {
    console.error('Erro ao criar conta:', err)
    return res.status(500).json({ erro: 'Erro interno' })
  }
})

// PUT /api/accounts/:id — atualiza conta
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const conta = await Account.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!conta) return res.status(404).json({ erro: 'Conta não encontrada' })

    await conta.update(req.body)
    return res.json(conta)
  } catch (err) {
    console.error('Erro ao atualizar conta:', err)
    return res.status(500).json({ erro: 'Erro interno' })
  }
})

// DELETE /api/accounts/:id — deleta conta
router.delete('/:id', authMiddleware, async (req, res) => {
  const t = await sequelize.transaction()
  try {
    const conta = await Account.findOne({
      where: { id: req.params.id, userId: req.userId },
      transaction: t,
    })
    if (!conta) {
      await t.rollback()
      return res.status(404).json({ erro: 'Conta não encontrada' })
    }

    // Delete transactions referencing this account first
    await Transaction.destroy({ where: { accountId: req.params.id }, transaction: t })

    // Set accountId to null on items referencing this account
    await Item.update({ accountId: null }, { where: { accountId: req.params.id }, transaction: t })

    // Finally, destroy the account
    await conta.destroy({ transaction: t })

    await t.commit()
    return res.json({ mensagem: 'Conta removida' })
  } catch (err) {
    await t.rollback()
    console.error('Erro ao deletar conta:', err)
    return res.status(500).json({ erro: 'Erro interno' })
  }
})

module.exports = router