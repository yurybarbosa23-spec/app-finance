const { Bill } = require('../models')

async function listar(req, res) {
  try {
    const bills = await Bill.findAll({ where: { userId: req.userId } })
    const agora = new Date()
    const mesAtualStr = agora.toISOString().slice(0, 7) // Ex: "2026-05"

    // Processa atualizações automáticas de mês
    for (const bill of bills) {
      // Se a conta for de pagamento ÚNICO, e já foi paga em um mês anterior, vamos deletar ela automaticamente
      if (bill.tipo === 'unica' && bill.pagaEsteMes && bill.ultimoPagamento && bill.ultimoPagamento !== mesAtualStr) {
        await bill.destroy()
        continue
      }

      // Se a conta for recorrente com parcelas limitadas e acabaram as parcelas e o mês virou, deleta ela
      if (bill.tipo === 'recorrente' && bill.recorrencia === 'parcelas' && bill.parcelasRestantes === 0 && bill.pagaEsteMes && bill.ultimoPagamento && bill.ultimoPagamento !== mesAtualStr) {
        await bill.destroy()
        continue
      }

      // Se o mês virou e a conta estava marcada como paga, reseta o status para "não paga" para o novo mês!
      if (bill.pagaEsteMes && bill.ultimoPagamento && bill.ultimoPagamento !== mesAtualStr) {
        await bill.update({ pagaEsteMes: false })
      }
    }

    // Carrega a lista final organizada por dia de vencimento
    const listaFinal = await Bill.findAll({
      where: { userId: req.userId },
      order: [['diaVencimento', 'ASC']]
    })

    res.json(listaFinal)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao listar contas a pagar' })
  }
}

async function salvar(req, res) {
  try {
    const { descricao, valor, diaVencimento, dataVencimento, tipo, recorrencia, totalParcelas } = req.body
    if (!descricao || !valor || !diaVencimento) {
      return res.status(400).json({ erro: 'Dados inválidos' })
    }

    const bill = await Bill.create({
      descricao,
      valor: Number(valor),
      diaVencimento: Number(diaVencimento),
      dataVencimento: dataVencimento || null,
      tipo: tipo || 'unica',
      recorrencia: recorrencia || 'indefinida',
      totalParcelas: Number(totalParcelas || 0),
      parcelasRestantes: (tipo === 'recorrente' && recorrencia === 'parcelas') ? Number(totalParcelas || 0) : 0,
      pagaEsteMes: false,
      ultimoPagamento: null,
      userId: req.userId
    })

    res.json(bill)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao salvar conta a pagar' })
  }
}

async function pagar(req, res) {
  try {
    const bill = await Bill.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!bill) return res.status(404).json({ erro: 'Conta não encontrada' })

    const agora = new Date()
    const mesAtualStr = agora.toISOString().slice(0, 7)

    let updates = {
      pagaEsteMes: true,
      ultimoPagamento: mesAtualStr
    }

    if (bill.tipo === 'recorrente' && bill.recorrencia === 'parcelas') {
      updates.parcelasRestantes = Math.max(0, bill.parcelasRestantes - 1)
    }

    await bill.update(updates)
    res.json(bill)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao pagar conta' })
  }
}

async function estornar(req, res) {
  try {
    const bill = await Bill.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!bill) return res.status(404).json({ erro: 'Conta não encontrada' })

    let updates = {
      pagaEsteMes: false,
      ultimoPagamento: null
    }

    if (bill.tipo === 'recorrente' && bill.recorrencia === 'parcelas') {
      updates.parcelasRestantes = bill.parcelasRestantes + 1
    }

    await bill.update(updates)
    res.json(bill)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao estornar conta' })
  }
}

async function deletar(req, res) {
  try {
    const bill = await Bill.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!bill) return res.status(404).json({ erro: 'Conta não encontrada' })

    await bill.destroy()
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao deletar conta' })
  }
}

async function atualizar(req, res) {
  try {
    const { id } = req.params
    const { descricao, valor, diaVencimento, dataVencimento, tipo, recorrencia, totalParcelas } = req.body
    
    const bill = await Bill.findOne({ where: { id, userId: req.userId } })
    if (!bill) {
      return res.status(404).json({ erro: 'Dívida não encontrada' })
    }
    
    await bill.update({
      descricao,
      valor: Number(valor),
      diaVencimento: Number(diaVencimento),
      dataVencimento: dataVencimento || null,
      tipo: tipo || 'unica',
      recorrencia: recorrencia || 'indefinida',
      totalParcelas: Number(totalParcelas || 0)
    })
    
    res.json(bill)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao atualizar dívida' })
  }
}

module.exports = { listar, salvar, pagar, estornar, deletar, atualizar }
