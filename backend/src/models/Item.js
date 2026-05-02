module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Item', {
    id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome:      { type: DataTypes.STRING,  allowNull: false },
    descricao: { type: DataTypes.STRING,  defaultValue: '' },
    valor:     { type: DataTypes.FLOAT,   allowNull: false },
    tipo:      { type: DataTypes.ENUM('venda','compra'), defaultValue: 'venda' },
    status:    { type: DataTypes.ENUM('disponivel','vendido'), defaultValue: 'disponivel' },
    userId:    { type: DataTypes.INTEGER, allowNull: false },
    accountId: { type: DataTypes.INTEGER, allowNull: true },
  })
}