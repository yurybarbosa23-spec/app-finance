const { Sequelize } = require('sequelize')

let sequelize

if (process.env.DATABASE_URL) {
  // Produção (Railway): usa a URL do PostgreSQL automaticamente
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
    logging: false,
  })
} else {
  // Desenvolvimento local: continua usando SQLite
  sequelize = new Sequelize({
    dialect:  'sqlite',
    storage:  './database.sqlite',
    logging:  false,
  })
}

module.exports = sequelize