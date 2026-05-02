const sequelize = require('./src/config/database')
const app       = require('./src/app')
const { User }  = require('./src/models')

async function seedAdmin() {
  const bcrypt = require('bcryptjs')
  const admin  = await User.findOne({ where: { email: 'admin@financeapp.com' } })
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10)
    await User.create({
      nome:         'Administrador',
      email:        'admin@financeapp.com',
      senha:        hash,
      senhaVisivel: 'admin123',
      isAdmin:      true,
    })
    console.log('✅ Admin criado → admin@financeapp.com / admin123')
  }
}

sequelize
  .sync({ force: false })
  .then(async () => {
    await seedAdmin()
    app.listen(3000, '0.0.0.0', () => console.log('🚀 Servidor rodando na porta 3000'))
  })
  .catch(err => {
    console.error('❌ Erro ao iniciar banco:', err)
    process.exit(1)
  })