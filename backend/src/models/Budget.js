module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Budget', {
    id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    categoria: { type: DataTypes.STRING,  allowNull: false },
    limite:    { type: DataTypes.FLOAT,   allowNull: false },
    ativo:     { type: DataTypes.BOOLEAN, defaultValue: true },
    userId:    { type: DataTypes.INTEGER, allowNull: false },
  })
}