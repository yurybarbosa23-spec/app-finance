const bcrypt = require('bcryptjs')
const { Op } = require('sequelize')
const { User, Account, Transaction, Item } = require('../models')

exports.stats = async (req, res) => {
  try {
    const totalUsuarios   = await User.count({ where: { isAdmin: false } })
    const totalContas     = await Account.count()
    const totalTransacoes = await Transaction.count()
    const accounts        = await Account.findAll()
    const saldoTotal      = accounts.reduce((a, c) => a + Number(c.saldo), 0)
    const ultimosUsuarios = await User.findAll({
      where: { isAdmin: false },
      order: [['createdAt', 'DESC']],
      limit: 5,
    })
    res.json({ totalUsuarios, totalContas, totalTransacoes, saldoTotal, ultimosUsuarios })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar stats' })
  }
}

exports.listarUsuarios = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { isAdmin: false },
      order: [['createdAt', 'DESC']],
    })
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao listar usuários' })
  }
}

exports.criarUsuario = async (req, res) => {
  try {
    const { nome, email, senha, isAdmin } = req.body
    if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos' })

    const existe = await User.findOne({ where: { email } })
    if (existe) return res.status(400).json({ erro: 'Email já cadastrado' })

    const hash = await bcrypt.hash(senha, 10)
    const user = await User.create({
      nome,
      email,
      senha: hash,
      senhaVisivel: senha,
      isAdmin: !!isAdmin,
    })

    res.status(201).json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao criar usuário' })
  }
}

exports.deletarUsuario = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user || user.isAdmin) return res.status(404).json({ erro: 'Usuário não encontrado' })

    const accounts = await Account.findAll({ where: { userId: req.params.id } })
    for (const acc of accounts) {
      await Transaction.destroy({ where: { accountId: acc.id } })
    }

    await Account.destroy({ where: { userId: req.params.id } })
    await Item.destroy({ where: { userId: req.params.id } })
    await user.destroy()

    res.json({ mensagem: 'Usuário removido com sucesso' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao deletar usuário' })
  }
}

exports.resetarSenha = async (req, res) => {
  try {
    const { senha } = req.body
    if (!senha || senha.length < 4) return res.status(400).json({ erro: 'Senha muito curta' })

    const user = await User.findByPk(req.params.id)
    if (!user || user.isAdmin) return res.status(404).json({ erro: 'Usuário não encontrado' })

    user.senha        = await bcrypt.hash(senha, 10)
    user.senhaVisivel = senha
    await user.save()

    res.json({ mensagem: 'Senha alterada com sucesso' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao resetar senha' })
  }
}

exports.dadosUsuario = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user || user.isAdmin) return res.status(404).json({ erro: 'Não encontrado' })
    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar usuário' })
  }
}

exports.transacoesUsuario = async (req, res) => {
  try {
    const accounts   = await Account.findAll({ where: { userId: req.params.id } })
    const accountIds = accounts.map(a => a.id)

    if (!accountIds.length) return res.json([])

    const transacoes = await Transaction.findAll({
      where: { accountId: { [Op.in]: accountIds } },
      order: [['createdAt', 'DESC']],
    })

    res.json(transacoes)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar transações' })
  }
}

exports.listarContasUsuario = async (req, res) => {
  try {
    const accounts = await Account.findAll({
      where: { userId: req.params.id },
      order: [['createdAt', 'ASC']],
    })
    res.json(accounts)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao listar contas' })
  }
}

exports.criarContaUsuario = async (req, res) => {
  try {
    const { nome, banco, saldo, cor } = req.body
    if (!nome || !banco) return res.status(400).json({ erro: 'Preencha nome e banco' })

    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ erro: 'Usuário não encontrado' })

    const account = await Account.create({
      nome,
      banco,
      saldo: Number(saldo) || 0,
      cor: cor || '#14b8a6',
      userId: req.params.id,
    })

    res.status(201).json(account)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao criar conta' })
  }
}

exports.deletarConta = async (req, res) => {
  try {
    const account = await Account.findByPk(req.params.id)
    if (!account) return res.status(404).json({ erro: 'Conta não encontrada' })

    await Transaction.destroy({ where: { accountId: account.id } })
    await account.destroy()

    res.json({ mensagem: 'Conta removida' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao deletar conta' })
  }
}

exports.resetarTudo = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user || user.isAdmin) return res.status(404).json({ erro: 'Usuário não encontrado' })

    const accounts = await Account.findAll({ where: { userId: req.params.id } })
    for (const acc of accounts) {
      await Transaction.destroy({ where: { accountId: acc.id } })
    }

    await Account.destroy({ where: { userId: req.params.id } })
    await Item.destroy({ where: { userId: req.params.id } })

    res.json({ mensagem: 'Conta resetada com sucesso' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao resetar conta' })
  }
}

exports.verSenha = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user || user.isAdmin) return res.status(404).json({ erro: 'Não encontrado' })

    res.json({ senhaVisivel: user.senhaVisivel || '(não disponível)' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar senha' })
  }
}