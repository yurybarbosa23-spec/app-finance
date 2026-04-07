const sequelize     = require('../config/database')
const { DataTypes } = require('sequelize')

const User        = require('./User')(sequelize, DataTypes)
const Account     = require('./Account')(sequelize, DataTypes)
const Transaction = require('./Transaction')(sequelize, DataTypes)
const Item        = require('./Item')(sequelize, DataTypes)

User.hasMany(Account,          { foreignKey: 'userId', onDelete: 'CASCADE' })
Account.belongsTo(User,        { foreignKey: 'userId' })

User.hasMany(Transaction,      { foreignKey: 'userId', onDelete: 'CASCADE' })
Account.hasMany(Transaction,   { foreignKey: 'accountId', onDelete: 'CASCADE' })
Transaction.belongsTo(Account, { foreignKey: 'accountId' })
Transaction.belongsTo(User,    { foreignKey: 'userId' })

User.hasMany(Item,             { foreignKey: 'userId', onDelete: 'CASCADE' })
Item.belongsTo(User,           { foreignKey: 'userId' })
Item.belongsTo(Account,        { foreignKey: 'accountId', as: 'conta' })

module.exports = { sequelize, User, Account, Transaction, Item }