module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Bill', {
    id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    descricao:         { type: DataTypes.STRING,  allowNull: false },
    valor:             { type: DataTypes.FLOAT,   allowNull: false },
    diaVencimento:     { type: DataTypes.INTEGER, allowNull: false },
    dataVencimento:    { type: DataTypes.STRING,  defaultValue: null }, // Armazena a data completa YYYY-MM-DD
    tipo:              { type: DataTypes.STRING,  allowNull: false, defaultValue: 'unica' }, // 'unica' ou 'recorrente'
    recorrencia:       { type: DataTypes.STRING,  allowNull: false, defaultValue: 'indefinida' }, // 'indefinida' ou 'parcelas'
    totalParcelas:     { type: DataTypes.INTEGER, defaultValue: 0 },
    parcelasRestantes: { type: DataTypes.INTEGER, defaultValue: 0 },
    pagaEsteMes:       { type: DataTypes.BOOLEAN, defaultValue: false },
    ultimoPagamento:   { type: DataTypes.STRING,  defaultValue: null }, // Armazena 'YYYY-MM' do último mês pago
    userId:            { type: DataTypes.INTEGER, allowNull: false }
  })
}
