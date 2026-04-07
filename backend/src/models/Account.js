module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Account', {
    id:     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome:   { type: DataTypes.STRING,  allowNull: false },
    banco:  { type: DataTypes.STRING,  allowNull: false },
    saldo:  { type: DataTypes.FLOAT,   defaultValue: 0 },
    cor:    { type: DataTypes.STRING,  defaultValue: '#14b8a6' },
    userId: { type: DataTypes.INTEGER, allowNull: false },
  })
}