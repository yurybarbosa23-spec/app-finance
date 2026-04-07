// backend/src/routes/accounts.js
const express        = require('express')
const router         = express.Router()
const authMiddleware = require('../middlewares/auth')
const { Account }    = require('../models')

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
  try {
    const conta = await Account.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!conta) return res.status(404).json({ erro: 'Conta não encontrada' })

    await conta.destroy()
    return res.json({ mensagem: 'Conta removida' })
  } catch (err) {
    console.error('Erro ao deletar conta:', err)
    return res.status(500).json({ erro: 'Erro interno' })
  }
})

module.exports = router