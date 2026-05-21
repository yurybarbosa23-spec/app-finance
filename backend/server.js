require('dotenv').config()

const sequelize = require('./src/config/database')
const app = require('./src/app')
const { User } = require('./src/models')
const { warmupModel } = require('./src/controllers/aiController')

// ❌ removido: require('./src/telegram/bot')

async function seedAdmin() {
  const bcrypt = require('bcryptjs')
  const admin = await User.findOne({ where: { email: 'admin@financeapp.com' } })
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10)
    await User.create({
      nome: 'Administrador',
      email: 'admin@financeapp.com',
      senha: hash,
      senhaVisivel: 'admin123',
      isAdmin: true,
    })
    console.log('✅ Admin criado → admin@financeapp.com / admin123')
  }
}

async function migrarBanco() {
  try {
    // Tenta adicionar a coluna dataVencimento na tabela Bills caso ela ainda não exista
    await sequelize.query("ALTER TABLE Bills ADD COLUMN dataVencimento VARCHAR(255);")
    console.log('💎 Migração: Coluna dataVencimento adicionada com sucesso à tabela Bills.')
  } catch (err) {
    // Se a coluna já existir ou a tabela ainda não tiver sido criada, ignora o erro silenciosamente
    if (err.message.includes('duplicate column name') || err.message.includes('no such table')) {
      // Ignora erros esperados de duplicidade ou inicialização
    } else {
      console.warn('⚠️ Nota sobre migração:', err.message)
    }
  }
}

sequelize
  .sync({ force: false })
  .then(async () => {
    await migrarBanco()
    await seedAdmin()
    app.listen(3000, '0.0.0.0', () => {
      console.log('🚀 Servidor rodando na porta 3000')
      // Pré-carrega o modelo Ollama na VRAM para evitar lentidão do SSD na 1ª pergunta
      // Aguarda 3s para o Ollama estar completamente iniciado
      setTimeout(() => warmupModel(), 3000)
    })
  })
  .catch(err => {
    console.error('❌ Erro ao iniciar banco:', err)
    process.exit(1)
  })