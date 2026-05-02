const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const { User } = require('../models')

const SECRET = process.env.JWT_SECRET || 'segredo123'

async function register(req, res) {
  try {
    const { nome, email, senha } = req.body
    if (!nome || !email || !senha)
      return res.status(400).json({ erro: 'Preencha todos os campos' })

    const existe = await User.findOne({ where: { email } })
    if (existe) return res.status(400).json({ erro: 'E-mail já cadastrado' })

    const hash = await bcrypt.hash(senha, 10)
    const user = await User.create({ nome, email, senha: hash })
    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '7d' })

    return res.status(201).json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, isAdmin: user.isAdmin } // ← adicionado
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ erro: 'Erro interno' })
  }
}

async function login(req, res) {
  try {
    const { email, senha } = req.body
    if (!email || !senha)
      return res.status(400).json({ erro: 'Preencha todos os campos' })

    const user = await User.findOne({ where: { email } })
    if (!user) return res.status(401).json({ erro: 'Credenciais inválidas' })

    const ok = await bcrypt.compare(senha, user.senha)
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' })

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '7d' })

    return res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, isAdmin: user.isAdmin } // ← adicionado
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ erro: 'Erro interno' })
  }
}

module.exports = { register, login }