module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Transaction', {
    id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    descricao: { type: DataTypes.STRING,  allowNull: false },
    valor:     { type: DataTypes.FLOAT,   allowNull: false },
    tipo:      { type: DataTypes.ENUM('receita','despesa'), allowNull: false },
    categoria: { type: DataTypes.STRING,  defaultValue: 'outro' },
    data:      { type: DataTypes.DATEONLY, allowNull: false },
    accountId: { type: DataTypes.INTEGER, allowNull: false },
    userId:    { type: DataTypes.INTEGER, allowNull: false },
  })
}