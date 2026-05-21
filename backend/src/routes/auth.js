// backend/src/routes/auth.js
const express        = require('express')
const router         = express.Router()
const bcrypt         = require('bcryptjs')
const jwt            = require('jsonwebtoken')
const authMiddleware = require('../middlewares/auth')
const { User }       = require('../models')
const { Op }         = require('sequelize')

const JWT_SECRET = process.env.JWT_SECRET || 'segredo123'

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body
    if (!nome || !email || !senha)
      return res.status(400).json({ erro: 'Preencha todos os campos' })

    const existe = await User.findOne({ where: { email } })
    if (existe) return res.status(400).json({ erro: 'E-mail já cadastrado' })

    const hash = await bcrypt.hash(senha, 10)
    const user = await User.create({ nome, email, senha: hash, senhaVisivel: senha })

    const token = jwt.sign({ id: user.id, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' })
    return res.status(201).json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, isAdmin: user.isAdmin }
    })
  } catch (err) {
    console.error('Erro no register:', err)
    return res.status(500).json({ erro: 'Erro interno' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body
    if (!email || !senha)
      return res.status(400).json({ erro: 'Preencha e-mail e senha' })

    const user = await User.findOne({ where: { email } })
    if (!user) return res.status(401).json({ erro: 'Credenciais inválidas' })

    const ok = await bcrypt.compare(senha, user.senha)
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' })

    const token = jwt.sign({ id: user.id, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' })
    return res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, isAdmin: user.isAdmin }
    })
  } catch (err) {
    console.error('Erro no login:', err)
    return res.status(500).json({ erro: 'Erro interno' })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'nome', 'email', 'isAdmin']
    })
    if (!user) return res.status(404).json({ erro: 'Usuário não encontrado' })
    return res.json(user)
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' })
  }
})

// GET /api/auth/search?q= — busca usuários por nome ou email (case-insensitive)
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (q.length < 2) return res.json([])

    // Op.iLike = ILIKE no PostgreSQL (Railway) — busca case-insensitive
    // Fallback: se banco não suportar iLike (SQLite local), usa like com lowercase
    let whereOr
    try {
      whereOr = [
        { nome:  { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } },
      ]
    } catch {
      const ql = q.toLowerCase()
      whereOr = [
        { nome:  { [Op.like]: `%${ql}%` } },
        { email: { [Op.like]: `%${ql}%` } },
      ]
    }

    const usuarios = await User.findAll({
      where: {
        [Op.and]: [
          { id: { [Op.ne]: req.userId } },
          { [Op.or]: whereOr },
        ],
      },
      attributes: ['id', 'nome', 'email'],
      limit: 15,
    })

    return res.json(usuarios)
  } catch (err) {
    console.error('Erro na busca:', err)
    return res.status(500).json({ erro: 'Erro na busca' })
  }
})

// PUT /api/auth/update-profile — Atualiza as informações do perfil do usuário
router.put('/update-profile', authMiddleware, async (req, res) => {
  try {
    const { nome, email, senha } = req.body
    const user = await User.findByPk(req.userId)
    if (!user) return res.status(404).json({ erro: 'Usuário não encontrado' })

    if (nome && nome.trim()) {
      user.nome = nome.trim()
    }
    if (email && email.trim()) {
      const emailLower = email.trim().toLowerCase()
      // Verifica se o email já existe em outro usuário
      const existeOutro = await User.findOne({ where: { email: emailLower, id: { [Op.ne]: req.userId } } })
      if (existeOutro) {
        return res.status(400).json({ erro: 'Este e-mail já está sendo usado por outra conta.' })
      }
      user.email = emailLower
    }
    if (senha && senha.trim().length > 0) {
      const hash = await bcrypt.hash(senha, 10)
      user.senha = hash
      user.senhaVisivel = senha
    }

    await user.save()

    return res.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      isAdmin: user.isAdmin
    })
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err)
    return res.status(500).json({ erro: 'Erro interno ao atualizar perfil' })
  }
})

// POST /api/auth/reset-data — Zera o histórico de lançamentos e saldos do usuário
router.post('/reset-data', authMiddleware, async (req, res) => {
  try {
    const { Transaction, Account, Budget } = require('../models')
    
    // Deleta transações e orçamentos do usuário
    await Transaction.destroy({ where: { userId: req.userId } })
    await Budget.destroy({ where: { userId: req.userId } })
    
    // Zera o saldo de todas as contas do usuário
    await Account.update({ saldo: 0 }, { where: { userId: req.userId } })
    
    return res.json({ sucesso: true, mensagem: 'Todos os seus dados financeiros foram redefinidos com sucesso!' })
  } catch (err) {
    console.error('Erro ao redefinir dados:', err)
    return res.status(500).json({ erro: 'Erro ao redefinir dados financeiros.' })
  }
})

module.exports = router