const jwt  = require('jsonwebtoken')
const { User } = require('../models') // ← corrigido também

const SECRET = process.env.JWT_SECRET || 'segredo123' // ← igual ao authController

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ erro: 'Sem token' })
  try {
    const decoded = jwt.verify(token, SECRET)
    const user    = await User.findByPk(decoded.id)
    if (!user || !user.isAdmin) return res.status(403).json({ erro: 'Acesso negado' })
    req.userId = decoded.id
    next()
  } catch {
    res.status(401).json({ erro: 'Token inválido' })
  }
}