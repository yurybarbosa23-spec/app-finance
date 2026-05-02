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

module.exports = router