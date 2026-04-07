const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  const header = req.headers['authorization']
  if (!header) return res.status(401).json({ erro: 'Token não fornecido' })

  const token = header.startsWith('Bearer ') ? header.slice(7) : header
  if (!token) return res.status(401).json({ erro: 'Token inválido' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'segredo123')
    req.userId  = decoded.id
    req.isAdmin = decoded.isAdmin || false
    next()
  } catch (err) {
    return res.status(401).json({ erro: 'Token expirado ou inválido' })
  }
}