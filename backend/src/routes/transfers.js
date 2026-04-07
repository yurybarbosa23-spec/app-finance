// backend/src/routes/transfers.js
const express        = require('express')
const router         = express.Router()
const authMiddleware = require('../middlewares/auth')
const { Account, Transaction, sequelize } = require('../models')

// POST /api/transfers — transferência entre contas de usuários diferentes
router.post('/', authMiddleware, async (req, res) => {
  const { contaOrigemId, contaDestinoId, valor, descricao } = req.body

  if (!contaOrigemId || !contaDestinoId || !valor || valor <= 0)
    return res.status(400).json({ erro: 'Dados inválidos' })

  const t = await sequelize.transaction()

  try {
    const contaOrigem = await Account.findOne({
      where: { id: contaOrigemId, userId: req.userId },
      transaction: t,
      lock: true,
    })

    if (!contaOrigem) {
      await t.rollback()
      return res.status(403).json({ erro: 'Conta de origem não encontrada' })
    }

    if (Number(contaOrigem.saldo) < Number(valor)) {
      await t.rollback()
      return res.status(400).json({ erro: 'Saldo insuficiente' })
    }

    const contaDestino = await Account.findByPk(contaDestinoId, {
      transaction: t,
      lock: true,
    })

    if (!contaDestino) {
      await t.rollback()
      return res.status(404).json({ erro: 'Conta destino não encontrada' })
    }

    await contaOrigem.update(
      { saldo: Number(contaOrigem.saldo) - Number(valor) },
      { transaction: t }
    )

    await contaDestino.update(
      { saldo: Number(contaDestino.saldo) + Number(valor) },
      { transaction: t }
    )

    const hoje = new Date().toISOString().split('T')[0]
    const desc = descricao || 'Transferência'

    await Transaction.create({
      tipo:      'despesa',
      categoria: 'transferencia',
      descricao: `${desc} → ${contaDestino.banco || contaDestino.nome}`,
      valor:     Number(valor),
      data:      hoje,
      accountId: contaOrigem.id,
      userId:    req.userId,
    }, { transaction: t })

    await Transaction.create({
      tipo:      'receita',
      categoria: 'transferencia',
      descricao: `${desc} ← ${contaOrigem.banco || contaOrigem.nome}`,
      valor:     Number(valor),
      data:      hoje,
      accountId: contaDestino.id,
      userId:    contaDestino.userId,
    }, { transaction: t })

    await t.commit()
    return res.json({ mensagem: 'Transferência realizada com sucesso' })

  } catch (err) {
    await t.rollback()
    console.error('Erro na transferência:', err)
    return res.status(500).json({ erro: 'Erro interno' })
  }
})

module.exports = router