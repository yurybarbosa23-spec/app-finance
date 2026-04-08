// backend/src/routes/transfers.js
const express = require('express')
const router = express.Router()
const { Op } = require('sequelize')
const authMiddleware = require('../middlewares/auth')
const { Account, Transaction, User, sequelize } = require('../models')

// GET /api/transfers/destinatarios
// Lista contas de outros usuários para preencher o select/autocomplete
router.get('/destinatarios', authMiddleware, async (req, res) => {
  try {
    const termo = (req.query.q || '').trim()

    const whereAccount = {
      userId: { [Op.ne]: req.userId },
    }

    const whereUser = termo
      ? {
          [Op.or]: [
            { nome: { [Op.like]: `%${termo}%` } },
            { email: { [Op.like]: `%${termo}%` } },
          ],
        }
      : undefined

    const contas = await Account.findAll({
      where: whereAccount,
      include: [
        {
          model: User,
          attributes: ['id', 'nome', 'email'],
          where: whereUser,
        },
      ],
      attributes: ['id', 'nome', 'banco', 'saldo', 'cor', 'userId'],
      order: [['id', 'ASC']],
    })

    const destinatarios = contas.map((conta) => ({
      contaId: conta.id,
      userId: conta.User.id,
      nomeUsuario: conta.User.nome,
      emailUsuario: conta.User.email,
      nomeConta: conta.nome,
      banco: conta.banco,
      label: `${conta.User.nome} - ${conta.banco} (${conta.nome})`,
    }))

    return res.json(destinatarios)
  } catch (err) {
    console.error('Erro ao buscar destinatários:', err)
    return res.status(500).json({ erro: 'Erro ao buscar destinatários' })
  }
})

// POST /api/transfers — transferência entre contas de usuários diferentes
router.post('/', authMiddleware, async (req, res) => {
  const { contaOrigemId, contaDestinoId, valor, descricao } = req.body

  if (!contaOrigemId || !contaDestinoId || !valor || valor <= 0) {
    return res.status(400).json({ erro: 'Dados inválidos' })
  }

  const t = await sequelize.transaction()

  try {
    const contaOrigem = await Account.findOne({
      where: { id: contaOrigemId, userId: req.userId },
      include: [{ model: User, attributes: ['nome'] }],
      transaction: t,
      lock: true,
    })

    if (!contaOrigem) {
      await t.rollback()
      return res.status(403).json({ erro: 'Conta de origem não encontrada' })
    }

    if (Number(contaOrigem.id) === Number(contaDestinoId)) {
      await t.rollback()
      return res.status(400).json({ erro: 'Não é possível transferir para a mesma conta' })
    }

    if (Number(contaOrigem.saldo) < Number(valor)) {
      await t.rollback()
      return res.status(400).json({ erro: 'Saldo insuficiente' })
    }

    const contaDestino = await Account.findByPk(contaDestinoId, {
      include: [{ model: User, attributes: ['nome'] }],
      transaction: t,
      lock: true,
    })

    if (!contaDestino) {
      await t.rollback()
      return res.status(404).json({ erro: 'Conta destino não encontrada' })
    }

    if (Number(contaDestino.userId) === Number(req.userId)) {
      await t.rollback()
      return res.status(400).json({ erro: 'Selecione uma conta de outro usuário' })
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

    const nomeDestinatario = contaDestino.User?.nome || contaDestino.banco || contaDestino.nome
    const bancoDestino = contaDestino.banco || contaDestino.nome
    const nomeRemetente = contaOrigem.User?.nome || contaOrigem.banco || contaOrigem.nome
    const bancoOrigem = contaOrigem.banco || contaOrigem.nome

    await Transaction.create({
      tipo: 'despesa',
      categoria: 'transferencia',
      descricao: `${desc} → ${nomeDestinatario} (${bancoDestino})`,
      valor: Number(valor),
      data: hoje,
      accountId: contaOrigem.id,
      userId: req.userId,
    }, { transaction: t })

    await Transaction.create({
      tipo: 'receita',
      categoria: 'transferencia',
      descricao: `${desc} ← ${nomeRemetente} (${bancoOrigem})`,
      valor: Number(valor),
      data: hoje,
      accountId: contaDestino.id,
      userId: contaDestino.userId,
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