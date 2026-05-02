const { Budget, Transaction, Op } = require('../models')
const { Sequelize } = require('../models').sequelize.constructor

async function listar(req, res) {
  try {
    const budgets = await Budget.findAll({ where: { userId: req.userId } })

    // Calcula gasto atual do mês para cada categoria
    const agora   = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
      .toISOString().split('T')[0]
    const fimMes  = new Date(agora.getFullYear(), agora.getMonth() + 1, 0)
      .toISOString().split('T')[0]

    const gastos = await Transaction.findAll({
      where: {
        userId: req.userId,
        tipo:   'despesa',
        data:   { [Sequelize.Op.between]: [inicioMes, fimMes] },
      },
      attributes: [
        'categoria',
        [Sequelize.fn('SUM', Sequelize.col('valor')), 'total'],
      ],
      group: ['categoria'],
      raw: true,
    })

    const gastoMap = {}
    gastos.forEach(g => { gastoMap[g.categoria] = Number(g.total) })

    const resultado = budgets.map(b => ({
      ...b.toJSON(),
      gastoAtual: gastoMap[b.categoria] || 0,
    }))

    res.json(resultado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao listar alertas' })
  }
}

async function salvar(req, res) {
  try {
    const { categoria, limite, ativo } = req.body
    if (!categoria || !limite || limite <= 0)
      return res.status(400).json({ erro: 'Dados inválidos' })

    // Upsert: atualiza se já existe para a categoria, cria se não
    const [budget] = await Budget.findOrCreate({
      where: { userId: req.userId, categoria },
      defaults: { limite, ativo: ativo ?? true, userId: req.userId, categoria },
    })

    if (!budget.isNewRecord) {
      await budget.update({ limite, ativo: ativo ?? true })
    }

    res.json(budget)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao salvar alerta' })
  }
}

async function atualizar(req, res) {
  try {
    const budget = await Budget.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!budget) return res.status(404).json({ erro: 'Alerta não encontrado' })
    await budget.update(req.body)
    res.json(budget)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar alerta' })
  }
}

async function deletar(req, res) {
  try {
    const budget = await Budget.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!budget) return res.status(404).json({ erro: 'Alerta não encontrado' })
    await budget.destroy()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao deletar alerta' })
  }
}

module.exports = { listar, salvar, atualizar, deletar }