const { Transaction, Budget, Account, User, Bill, Item } = require('../models')

// ─── FUNÇÕES QUE A IA PODE EXECUTAR ──────────────────────

const funcoes = {

  async registrarTransacao({ userId, descricao, valor, tipo, categoria, accountId }) {
    const conta = await Account.findOne({ where: { id: accountId, userId } })
    if (!conta) throw new Error('Conta não encontrada.')

    const hoje = new Date().toISOString().split('T')[0]
    await Transaction.create({ descricao, valor, tipo, categoria: categoria || 'outro', data: hoje, accountId, userId })

    const novoSaldo = tipo === 'receita'
      ? conta.saldo + valor
      : conta.saldo - valor
    await conta.update({ saldo: novoSaldo })

    return `✅ Transação registrada!\n📝 ${descricao}\n💰 R$${valor.toFixed(2)} (${tipo})\n🏦 Conta: ${conta.nome}\n💳 Novo saldo: R$${novoSaldo.toFixed(2)}`
  },

  async transferirEntreContas({ userId, origemId, destinoId, valor, descricao }) {
    const origem  = await Account.findOne({ where: { id: origemId,  userId } })
    const destino = await Account.findOne({ where: { id: destinoId, userId } })
    if (!origem)  throw new Error('Conta de origem não encontrada.')
    if (!destino) throw new Error('Conta de destino não encontrada.')
    if (origem.saldo < valor) throw new Error(`Saldo insuficiente. Saldo atual: R$${origem.saldo.toFixed(2)}`)

    const hoje = new Date().toISOString().split('T')[0]
    const desc = descricao || `Transferência para ${destino.nome}`

    await Transaction.create({ descricao: desc, valor, tipo: 'despesa', categoria: 'transferencia', data: hoje, accountId: origemId, userId })
    await Transaction.create({ descricao: desc, valor, tipo: 'receita', categoria: 'transferencia', data: hoje, accountId: destinoId, userId })
    await origem.update({ saldo: origem.saldo - valor })
    await destino.update({ saldo: destino.saldo + valor })

    return `✅ Transferência realizada!\n💸 R$${valor.toFixed(2)} de "${origem.nome}" → "${destino.nome}"\n🏦 ${origem.nome}: R$${(origem.saldo - valor).toFixed(2)}\n🏦 ${destino.nome}: R$${(destino.saldo + valor).toFixed(2)}`
  },

  async criarOrcamento({ userId, categoria, limite }) {
    const existente = await Budget.findOne({ where: { userId, categoria } })
    if (existente) {
      await existente.update({ limite })
      return `✅ Orçamento de "${categoria}" atualizado para R$${limite.toFixed(2)}`
    }
    await Budget.create({ categoria, limite, userId })
    return `✅ Orçamento criado!\n📂 Categoria: ${categoria}\n💰 Limite: R$${limite.toFixed(2)}`
  },

  async cancelarUltimaTransacao({ userId }) {
    const ultimaTransacao = await Transaction.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']]
    })
    if (!ultimaTransacao) {
      return '❌ Nenhuma transação recente encontrada para cancelar.'
    }
    const conta = await Account.findOne({ where: { id: ultimaTransacao.accountId, userId } })
    if (!conta) {
      await ultimaTransacao.destroy()
      return `✅ A última transação ("${ultimaTransacao.descricao}") foi cancelada (porém a conta original não foi encontrada para ajuste de saldo).`
    }
    const saldoRevertido = ultimaTransacao.tipo === 'despesa'
      ? conta.saldo + ultimaTransacao.valor
      : conta.saldo - ultimaTransacao.valor
    await conta.update({ saldo: saldoRevertido })
    const desc = ultimaTransacao.descricao
    const val = ultimaTransacao.valor
    const tipo = ultimaTransacao.tipo
    await ultimaTransacao.destroy()
    return `✅ Transação de ${tipo} ("${desc}") no valor de R$${val.toFixed(2)} foi cancelada com sucesso!\n🏦 Conta: ${conta.nome}\n💳 Saldo atualizado: R$${saldoRevertido.toFixed(2)}`
  },

  async corrigirUltimaTransacao({ userId, novoValor }) {
    const ultimaTransacao = await Transaction.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']]
    })
    if (!ultimaTransacao) {
      return '❌ Nenhuma transação recente encontrada para corrigir.'
    }
    const conta = await Account.findOne({ where: { id: ultimaTransacao.accountId, userId } })
    if (!conta) {
      return '❌ Conta associada à transação não encontrada.'
    }

    const valorAntigo = ultimaTransacao.valor
    const desc = ultimaTransacao.descricao
    const tipo = ultimaTransacao.tipo

    // Reverte o saldo antigo no banco de dados
    const saldoRevertido = tipo === 'despesa'
      ? conta.saldo + valorAntigo
      : conta.saldo - valorAntigo

    // Aplica o novo saldo
    const novoSaldo = tipo === 'despesa'
      ? saldoRevertido - novoValor
      : saldoRevertido + novoValor

    await conta.update({ saldo: novoSaldo })
    await ultimaTransacao.update({ valor: novoValor })

    return `📝 Correção de transação!\n📂 Descrição: ${desc}\n💰 R$${novoValor.toFixed(2)} (${tipo})\n🏦 Conta: ${conta.nome}\n💳 Novo saldo: R$${novoSaldo.toFixed(2)}`
  },

  async obterCategoriaMaiorGasto({ userId }) {
    const transacoes = await Transaction.findAll({
      where: { userId, tipo: 'despesa' }
    })
    if (transacoes.length === 0) {
      return '📊 Você ainda não tem nenhuma despesa registrada para análise.'
    }

    const categorias = {}
    for (const t of transacoes) {
      const catNorm = t.categoria || 'outro'
      categorias[catNorm] = (categorias[catNorm] || 0) + t.valor
    }

    let maiorCategoria = ''
    let maiorValor = 0
    for (const cat of Object.keys(categorias)) {
      if (categorias[cat] > maiorValor) {
        maiorValor = categorias[cat]
        maiorCategoria = cat
      }
    }

    const nomesFormatados = {
      mercado: 'Mercado',
      restaurante: 'Restaurante',
      transporte: 'Transporte',
      moradia: 'Moradia',
      saude: 'Saúde',
      lazer: 'Lazer',
      compras: 'Compras',
      contas: 'Contas',
      educacao: 'Educação',
      assinatura: 'Assinatura',
      combustivel: 'Combustível',
      transferencia: 'Transferência',
      outro: 'Outro'
    }
    const catBonita = nomesFormatados[maiorCategoria] || maiorCategoria.charAt(0).toUpperCase() + maiorCategoria.slice(1)

    return `📊 Analisando seus gastos deste mês, a categoria em que você **gastou mais** foi **${catBonita}**, totalizando **R$ ${maiorValor.toFixed(2)}**.`
  },

  async obterMaiorGasto({ userId }) {
    const maiorGasto = await Transaction.findOne({
      where: { userId, tipo: 'despesa' },
      order: [['valor', 'DESC']]
    })
    if (!maiorGasto) {
      return '📊 Você ainda não tem nenhuma despesa registrada para análise.'
    }
    const nomesFormatados = {
      mercado: 'Mercado',
      restaurante: 'Restaurante',
      transporte: 'Transporte',
      moradia: 'Moradia',
      saude: 'Saúde',
      lazer: 'Lazer',
      compras: 'Compras',
      contas: 'Contas',
      educacao: 'Educação',
      assinatura: 'Assinatura',
      combustivel: 'Combustível',
      transferencia: 'Transferência',
      outro: 'Outro'
    }
    const catBonita = nomesFormatados[maiorGasto.categoria] || maiorGasto.categoria.charAt(0).toUpperCase() + maiorGasto.categoria.slice(1)
    return `📊 O seu maior gasto registrado foi com **"${maiorGasto.descricao}"** na categoria **${catBonita}**, no valor de **R$ ${maiorGasto.valor.toFixed(2)}**.`
  },

  async obterSaldo({ userId }) {
    const contas = await Account.findAll({ where: { userId } })
    if (contas.length === 0) return '🏦 Nenhuma conta cadastrada.'

    if (contas.length === 1) {
      const c = contas[0]
      return `🏦 O saldo atual da sua conta *${c.nome}* (${c.banco}) é de *R$ ${c.saldo.toFixed(2)}*.`
    }

    let msg = '🏦 *Saldos das suas contas:*\n\n'
    let total = 0
    for (const c of contas) {
      msg += `• *${c.nome}* (${c.banco}): R$${c.saldo.toFixed(2)}\n`
      total += c.saldo
    }
    msg += `\n💰 *Total Geral:* R$${total.toFixed(2)}`
    return msg
  },

  async listarTransacoes({ userId }) {
    const transacoes = await Transaction.findAll({ where: { userId }, order: [['data', 'DESC'], ['createdAt', 'DESC']], limit: 15 })
    if (transacoes.length === 0) return '📝 Nenhuma transação registrada.'

    // Agrupa por data
    const grupos = {}
    for (const t of transacoes) {
      if (!grupos[t.data]) grupos[t.data] = []
      grupos[t.data].push(t)
    }

    let msg = '📝 *Suas últimas transações:* \n\n'
    for (const data of Object.keys(grupos)) {
      const partes = data.split('-')
      const dataFormatada = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data
      msg += `📅 *${dataFormatada}*\n`
      for (const t of grupos[data]) {
        const emoji = t.tipo === 'receita' ? '🟢' : '🔴'
        msg += `${emoji} *${t.descricao}* - R$ ${t.valor.toFixed(2)}\n`
      }
      msg += '\n'
    }
    return msg.trim()
  },

  async cadastrarContaPagar({ userId, descricao, valor, diaVencimento, tipo, recorrencia, totalParcelas }) {
    const bill = await Bill.create({
      descricao,
      valor: Number(valor),
      diaVencimento: Number(diaVencimento || 10),
      tipo: tipo || 'unica',
      recorrencia: recorrencia || 'indefinida',
      totalParcelas: Number(totalParcelas || 0),
      parcelasRestantes: (tipo === 'recorrente' && recorrencia === 'parcelas') ? Number(totalParcelas || 0) : 0,
      pagaEsteMes: false,
      userId
    })
    return `✅ Dívida/Conta a pagar cadastrada com sucesso!\n📝 ${bill.descricao}\n💰 R$${bill.valor.toFixed(2)}\n📅 Dia de Vencimento: ${bill.diaVencimento}\n🔄 Tipo: ${bill.tipo}`
  },

  async pagarConta({ userId, billId, accountId }) {
    const bill = await Bill.findOne({ where: { id: billId, userId } })
    if (!bill) throw new Error('Conta a pagar não encontrada.')

    const conta = await Account.findOne({ where: { id: accountId, userId } })
    if (!conta) throw new Error('Conta bancária não encontrada.')

    if (conta.saldo < bill.valor) throw new Error(`Saldo insuficiente na conta ${conta.nome}. Saldo: R$${conta.saldo.toFixed(2)}`)

    const hoje = new Date().toISOString().split('T')[0]
    await Transaction.create({
      descricao: `Pagamento: ${bill.descricao}`,
      valor: bill.valor,
      tipo: 'despesa',
      categoria: 'contas',
      data: hoje,
      accountId,
      userId
    })

    await conta.update({ saldo: conta.saldo - bill.valor })

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

    return `✅ Conta paga com sucesso!\n📝 ${bill.descricao} paga usando ${conta.nome}\n💰 R$${bill.valor.toFixed(2)}\n🏦 Novo saldo da conta: R$${conta.saldo.toFixed(2)}`
  },

  async listarContasPagar({ userId }) {
    const bills = await Bill.findAll({ where: { userId }, order: [['diaVencimento', 'ASC']] })
    if (bills.length === 0) return '📅 Nenhuma conta/dívida cadastrada.'

    let msg = '📅 *Suas Contas a Pagar/Dívidas:*\n\n'
    for (const b of bills) {
      const status = b.pagaEsteMes ? '🟢 Pago' : '🔴 Aberto'
      const parcelasInfo = (b.tipo === 'recorrente' && b.recorrencia === 'parcelas') 
        ? ` (${b.parcelasRestantes} parcelas restantes)` 
        : ''
      msg += `• *${b.descricao}* - R$${b.valor.toFixed(2)} - Vence dia ${b.diaVencimento} [${status}]${parcelasInfo}\n`
    }
    return msg
  },

  async cadastrarItemEstoque({ userId, nome, descricao, valor, tipo, accountId }) {
    let transacaoInfo = ''
    if (tipo === 'compra' && accountId) {
      const conta = await Account.findOne({ where: { id: accountId, userId } })
      if (!conta) throw new Error('Conta bancária não encontrada.')
      if (conta.saldo < valor) throw new Error(`Saldo insuficiente para realizar a compra. Saldo: R$${conta.saldo.toFixed(2)}`)

      conta.saldo = Number(conta.saldo) - Number(valor)
      await conta.save()
      await Transaction.create({
        descricao: `Compra: ${nome}`,
        valor,
        tipo: 'despesa',
        categoria: 'compras',
        data: new Date().toISOString().split('T')[0],
        accountId,
        userId
      })
      transacaoInfo = ` (Debitado de ${conta.nome}, novo saldo: R$${conta.saldo.toFixed(2)})`
    }

    const item = await Item.create({
      nome,
      descricao: descricao || '',
      valor: Number(valor),
      tipo: tipo || 'venda',
      status: 'disponivel',
      userId,
      accountId: accountId || null
    })

    return `✅ Item cadastrado no estoque/inventário!\n📦 ${item.nome} (${item.tipo === 'compra' ? 'Comprado' : 'Para Venda'})\n💰 Valor: R$${item.valor.toFixed(2)}${transacaoInfo}`
  },

  async venderItemEstoque({ userId, itemId, accountId, valorVenda }) {
    const item = await Item.findOne({ where: { id: itemId, userId } })
    if (!item) throw new Error('Item não encontrado.')
    if (item.status === 'vendido') throw new Error('Este item já consta como vendido.')

    const conta = await Account.findOne({ where: { id: accountId, userId } })
    if (!conta) throw new Error('Conta bancária não encontrada.')

    const precoVenda = valorVenda || item.valor
    conta.saldo = Number(conta.saldo) + Number(precoVenda)
    await conta.save()

    await Transaction.create({
      descricao: `Venda: ${item.nome}`,
      valor: precoVenda,
      tipo: 'receita',
      categoria: 'outro',
      data: new Date().toISOString().split('T')[0],
      accountId,
      userId
    })

    item.status = 'vendido'
    await item.save()

    return `✅ Venda registrada com sucesso!\n📦 ${item.nome} vendido por R$${Number(precoVenda).toFixed(2)}\n🏦 Creditado em ${conta.nome} (novo saldo: R$${conta.saldo.toFixed(2)})`
  },

  async listarItensEstoque({ userId }) {
    const itens = await Item.findAll({ where: { userId }, order: [['createdAt', 'DESC']] })
    if (itens.length === 0) return '📦 Nenhum item no estoque/inventário.'

    let msg = '📦 *Itens do seu Estoque/Inventário:*\n\n'
    for (const item of itens) {
      const statusEmoji = item.status === 'vendido' ? '❌ Vendido' : '🟢 Disponível'
      const tipoStr = item.tipo === 'compra' ? 'Comprado' : 'Para Venda'
      msg += `• *${item.nome}* - R$${item.valor.toFixed(2)} [${tipoStr}] - ${statusEmoji}\n`
    }
    return msg
  },
}

// ─── PROMPT DO SISTEMA ────────────────────────────────────

async function buildSystemPrompt(userId) {
  const [transacoes, orcamentos, contas, usuario, dividas, itens] = await Promise.all([
    Transaction.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 50 }),
    Budget.findAll({ where: { userId } }),
    Account.findAll({ where: { userId } }),
    User.findByPk(userId),
    Bill.findAll({ where: { userId } }),
    Item.findAll({ where: { userId } })
  ])

  const nomeUsuario = usuario ? usuario.nome : 'usuário'

  return `Você é a Finora, uma assistente financeira pessoal inteligente e muito prestativa de ${nomeUsuario}. Responda em português brasileiro de forma natural, direta e muito humana.
REGRAS CRÍTICAS DA CONVERSA:
1. SAUDAÇÕES: Se o usuário iniciar a conversa APENAS com saudações ("olá", "oi", "bom dia"), responda de forma muito calorosa, amigável e prestativa! Cumprimente-o pelo nome (${nomeUsuario}), introduza-se e ofereça ajuda sugerindo o que você pode fazer (ex: "Olá, ${nomeUsuario}! Tudo bem? Sou a Finora, sua assistente financeira pessoal. Posso te ajudar a consultar saldos, ver transações ou registrar despesas/receitas. Como posso ajudar hoje?").
2. REGISTRAR, TRANSFERIR, CANCELAR OU ALTERAR ESTADOS: Se o usuário pedir para registrar um gasto, despesa, receita, transferir valor, criar orçamento, cadastrar conta a pagar/dívida, pagar conta, cadastrar item no estoque, registrar venda ou cancelar/desfazer a última transação (ex: "registre", "gastei", "recebi", "cancela", "desisti", "desfaz", "cadastre conta", "paguei a conta", "comprar produto", "vender item"), você OBRIGATORIAMENTE deve responder IMEDIATAMENTE e APENAS com o bloco JSON correspondente listado abaixo (sem saudações, sem pedir confirmação redundante, sem atrasar ou adiar a operação, sem texto antes, sem texto depois). É absolutamente proibido escrever qualquer explicação ou conversa quando a ordem for clara. Responda instantaneamente e APENAS com o JSON. Exemplo de resposta: {"acao":"registrarTransacao","params":{"descricao":"Uber","valor":50.0,"tipo":"despesa","categoria":"transporte","accountId":4}}
EXCEÇÃO PARA DÚVIDAS REAIS: Se a ordem do usuário for genuinamente ambígua ou faltarem informações fundamentais (ex: se ele disser apenas "registre um gasto" mas não disser o valor, ou se houver múltiplas contas e não for possível deduzir qual usar), você PODE e deve responder em texto normal fazendo uma pergunta natural, clara e amigável para tirar sua dúvida. Mas se as informações essenciais estiverem claras, execute a ação imediatamente sem pedir confirmação.
3. NUNCA FINJA OU FORCE TEXTO: Nunca finja em texto que gravou ou cancelou um gasto ou atualizou o saldo se não estiver respondendo com o JSON correspondente. A gravação ou cancelamento no banco de dados depende 100% de você enviar unicamente o JSON correspondente à ação. NUNCA tente digitar ou imitar as mensagens de sucesso formatadas com emojis (como "✅ Transação registrada!...", "📝...", "💰...", "🏦...", "💳...") que você ver no histórico de mensagens (historico). Aquelas mensagens de sucesso são inseridas automaticamente pelo sistema após a execução do seu JSON. Para qualquer novo registro ou cancelamento, responda APENAS com o bloco JSON correspondente.
4. CONSULTAR SALDO OU TRANSAÇÕES: Se o usuário perguntar o saldo ou pedir para listar lançamentos/transações, responda por texto de forma natural, super limpa e sem redundâncias usando os dados de "DADOS ATUAIS". Confie APENAS nos valores numéricos listados em DADOS ATUAIS (como o "saldo" das contas), e NUNCA faça cálculos matemáticos ou deduções baseando-se no histórico das mensagens da conversa, pois o histórico pode conter valores antigos ou simulados. É terminantemente proibido exibir identificadores técnicos como "(accountId: X)" ou "(id: X)" nas respostas para o usuário.
Exemplo correto de saldo: "O seu saldo na conta [nome da conta] é de R$ [saldo real da conta]."
5. PERGUNTAS HIPOTÉTICAS OU CONDICIONAIS: Se o usuário fizer uma pergunta hipotética, simulação ou condicional sobre o futuro (ex: "quanto ficarei de saldo se eu gastar X?", "se eu comprar Y, com quanto fico?", "quanto sobra se eu gastar Z?"), você NUNCA deve responder com JSON e NUNCA deve registrar transações reais. Limite-se a simular matematicamente o resultado e responda APENAS com texto explicativo simples (ex: "Se você gastar R$ X, seu saldo atual na conta [nome da conta] cairá de R$ [saldo atual] para R$ [novo saldo calculated].").
⚠️ REGRA CRÍTICA DE FORMATO DE LANÇAMENTOS: Quando o usuário pedir explicitamente para LISTAR, EXIBIR ou MOSTRAR o histórico de lançamentos/transações, você OBRIGATORIAMENTE deve agrupar os lançamentos por data (dia) de forma super organizada, minimalista, limpa e elegante. Use emojis indicadores de fluxo (🟢 para receita/entrada, 🔴 para despesa/saída), seguidos do nome da transação em negrito e o valor formatado em R$. NUNCA quebre linhas de forma desnecessária, nunca use marcadores como "*" na mesma linha do emoji, e nunca repita o tipo em parênteses.
Exemplo exato de formato de lançamentos desejado:
📅 **17/05/2026**
🔴 **Uber** - R$ 50,00
🟢 **Freelance** - R$ 20,00

📅 **15/05/2026**
🟢 **Presente** - R$ 50,00

6. PERGUNTAS DE ANÁLISE, SOMA OU COMPARAÇÃO: Se o usuário fizer perguntas analíticas sobre seus gastos, você NUNCA deve listar as transações individualmente. Faça a soma ou cálculo mental dos valores contidos em DADOS ATUAIS e responda diretamente em texto de forma natural, direta e muito humana.
⚠️ REGRA CRÍTICA DE NOMES DE CATEGORIAS: Quando o usuário perguntar sobre CATEGORIAS, você OBRIGATORIAMENTE deve responder usando o nome real e oficial de uma das categorias do sistema (use com a primeira letra maiúscula: "Mercado", "Restaurante", "Transporte", "Moradia", "Saúde", "Lazer", "Compras", "Contas", "Educação", "Assinatura", "Combustível", "Outro"). NUNCA confunda descrição de transação com categoria. Sempre responda mapeando para o nome oficial.

DADOS ATUAIS:
- Contas: ${JSON.stringify(contas.map(c => ({ id: c.id, nome: c.nome, banco: c.banco, saldo: c.saldo })))}
- Orçamentos: ${JSON.stringify(orcamentos.map(o => ({ id: o.id, categoria: o.categoria, limite: o.limite })))}
- Contas a Pagar/Dívidas: ${JSON.stringify(dividas.map(d => ({ id: d.id, descricao: d.descricao, valor: d.valor, diaVencimento: d.diaVencimento, pagaEsteMes: d.pagaEsteMes, tipo: d.tipo })))}
- Estoque/Inventário de Itens: ${JSON.stringify(itens.map(i => ({ id: i.id, nome: i.nome, valor: i.valor, tipo: i.tipo, status: i.status, descricao: i.descricao })))}
- Últimas transações: ${JSON.stringify(transacoes.map(t => ({ id: t.id, descricao: t.descricao, valor: t.valor, tipo: t.tipo, categoria: t.categoria, data: t.data, accountId: t.accountId })))}

AÇÕES DISPONÍVEIS — responda APENAS com o JSON correspondente à ação solicitada (sem texto antes ou depois):

Para registrar ENTRADA (salário, recebimento, pix recebido, dinheiro que entrou):
{"acao":"registrarTransacao","params":{"descricao":"string","valor":0.0,"tipo":"receita","categoria":"string","accountId":0}}

Para registrar SAÍDA (gasto, despesa, pagamento, compra, dinheiro que saiu, ou correções):
{"acao":"registrarTransacao","params":{"descricao":"string","valor":0.0,"tipo":"despesa","categoria":"string","accountId":0}}

⚠️ REGRA CRÍTICA DO accountId: Sempre selecione o "accountId" correto com base nas contas listadas em DADOS ATUAIS. Se o usuário não especificar a conta e houver apenas uma conta disponível, use o ID dela.
⚠️ REGRA CRÍTICA DO tipo: o campo "tipo" aceita SOMENTE os valores "receita" ou "despesa". NUNCA use outros valores.

Para transferir entre contas:
{"acao":"transferirEntreContas","params":{"origemId":0,"destinoId":0,"valor":0.0,"descricao":"string"}}

Para criar/atualizar orçamento:
{"acao":"criarOrcamento","params":{"categoria":"string","limite":0.0}}

Para desfazer, cancelar ou excluir a última transação registrada:
{"acao":"cancelarUltimaTransacao","params":{}}

Para corrigir o valor da última transação registrada:
{"acao":"corrigirUltimaTransacao","params":{"novoValor":0.0}}

Para cadastrar uma nova conta a pagar/dívida:
{"acao":"cadastrarContaPagar","params":{"descricao":"string","valor":0.0,"diaVencimento":10,"tipo":"unica|recorrente","recorrencia":"indefinida|parcelas","totalParcelas":0}}

Para pagar uma conta (dívida) registrada (deve debitar de uma conta bancária):
{"acao":"pagarConta","params":{"billId":0,"accountId":0}}

Para listar contas a pagar/dívidas:
{"acao":"listarContasPagar","params":{}}

Para cadastrar um item no estoque/inventário (tipo pode ser "venda" ou "compra" - se for "compra", precisa do accountId da conta bancária para debitar):
{"acao":"cadastrarItemEstoque","params":{"nome":"string","descricao":"string","valor":0.0,"tipo":"venda|compra","accountId":null}}

Para registrar a venda de um item do estoque:
{"acao":"venderItemEstoque","params":{"itemId":0,"accountId":0,"valorVenda":0.0}}

Para listar os itens do estoque:
{"acao":"listarItensEstoque","params":{}}

Categorias válidas para receita: salario, freelance, investimento, presente, transferencia, aluguel_rec, premio, outro
Categorias válidas para despesa: mercado, restaurante, transporte, moradia, saude, lazer, compras, contas, educacao, assinatura, combustivel, transferencia, outro

Para qualquer outra pergunta, responda normalmente em texto usando emojis.`
}

// ─── ENDPOINT DO CHAT ─────────────────────────────────────

async function chat(req, res) {
  const { mensagem, userId, historico = [], executarAcao } = req.body

  // ─── EXECUÇÃO DIRETA DE AÇÃO (quando frontend envia conta escolhida) ────
  if (executarAcao) {
    try {
      const { acao, params } = executarAcao
      if (funcoes[acao]) {
        const resultado = await funcoes[acao]({ userId, ...params })
        return res.json({ text: resultado })
      }
      return res.json({ text: '❌ Ação desconhecida.' })
    } catch (e) {
      return res.json({ text: `❌ Erro ao executar ação: ${e.message}` })
    }
  }

  try {

    const systemPrompt = await buildSystemPrompt(userId)
    console.log('--- DEBUG SYSTEM PROMPT DADOS ATUAIS ---')
    console.log(systemPrompt.substring(systemPrompt.indexOf('DADOS ATUAIS:')))
    console.log('---------------------------------------')

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historico,
      { role: 'user', content: mensagem },
    ]

    // Chamada para o Ollama com keep_alive=-1 (mantém modelo carregado na VRAM)
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b'
    const abortCtrl = new AbortController()
    const ollamaTimeout = setTimeout(() => abortCtrl.abort(), 30000)
    let ollamaRes
    try {
      ollamaRes = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages,
          options: { temperature: 0, num_predict: 512 },
          keep_alive: -1,
          stream: false
        }),
        signal: abortCtrl.signal
      })
    } catch (fetchErr) {
      clearTimeout(ollamaTimeout)
      return res.json({ text: '⏱️ A IA demorou demais para responder. Tente novamente.' })
    }
    clearTimeout(ollamaTimeout)

    const rawText = await ollamaRes.text()
    let data
    try {
      data = JSON.parse(rawText)
    } catch (parseErr) {
      return res.json({ text: `❌ Resposta inválida do Ollama: ${rawText}` })
    }

    if (data.error) {
      if (data.error.includes('requires more system memory')) {
        return res.json({ text: `⚠️ **O Ollama ficou sem memória para rodar a IA!**\n\nO modelo configurado (\`${OLLAMA_MODEL}\`) exige mais memória RAM/VRAM livre do que o seu computador tem disponível no momento.\n\n**Como resolver:**\n1. Feche navegadores com muitas abas ou programas pesados para liberar memória.\n2. **[Recomendado]** Abra o arquivo \`.env\` na pasta do seu backend e defina um modelo mais leve, como \`OLLAMA_MODEL=llama3.2:3b\` ou \`OLLAMA_MODEL=qwen2.5:3b\`, que exigem apenas 2-3 GB de RAM. Depois, rode no terminal: \`ollama pull <nome-do-modelo>\`.` })
      }
      return res.json({ text: `❌ Erro no Ollama: ${data.error}` })
    }

    let resposta = data.message?.content?.trim()

    // Remove bloco <think> do DeepSeek
    resposta = resposta?.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

    if (!resposta) {
      return res.json({ text: '❌ Sem resposta da IA. Tente novamente.' })
    }

    // ─── Detecta se a IA retornou uma ação JSON ───────────
    const jsonMatch = resposta.match(/\{[\s\S]*"acao"[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsedAction = JSON.parse(jsonMatch[0])
        const { acao, params } = parsedAction

        // Ações que precisam de accountId: verificar se precisa perguntar
        const acoesComConta = ['registrarTransacao', 'pagarConta', 'cadastrarItemEstoque', 'venderItemEstoque']
        if (acoesComConta.includes(acao) && !params.accountId) {
          const contas = await Account.findAll({ where: { userId } })
          if (contas.length === 1) {
            // Só uma conta, usa direto
            params.accountId = contas[0].id
          } else if (contas.length > 1) {
            // Pergunta qual conta
            const ehReceita = params.tipo === 'receita' || acao === 'venderItemEstoque'
            const pergunta = ehReceita
              ? '💰 Em qual conta devo **creditar** o valor?'
              : '💳 De qual conta devo **retirar** o valor?'
            return res.json({
              type: 'perguntarConta',
              mensagem: pergunta,
              contas: contas.map(c => ({ id: c.id, nome: c.nome, banco: c.banco, saldo: c.saldo })),
              acaoPendente: { acao, params }
            })
          }
        }

        if (funcoes[acao]) {
          const resultado = await funcoes[acao]({ userId, ...params })
          return res.json({ text: resultado })
        }
      } catch (e) {
        console.warn('Falha ao processar JSON da IA, tratando como texto:', e.message)
      }
    }

    // ─── Resposta normal (texto) ──────────────────────────
    return res.json({ text: resposta })

  } catch (err) {
    console.error('Erro no chat web:', err.message)
    return res.json({ text: '❌ Erro ao processar. Verifique se o Ollama está rodando.' })
  }
}

// ─── PRÉ-CARREGAMENTO DO MODELO NA VRAM ───────────────────
// Chamado no startup do servidor para evitar SSD lento na primeira pergunta

async function warmupModel() {
  try {
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b'
    console.log(`🔥 Pré-carregando modelo ${OLLAMA_MODEL} na VRAM...`)
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: 'user', content: 'oi' }],
        options: { temperature: 0, num_predict: 1 },
        keep_alive: -1,
        stream: false
      })
    })
    if (res.ok) {
      console.log('✅ Modelo carregado na VRAM e pronto para uso!')
    }
  } catch (e) {
    console.warn('⚠️  Ollama não disponível no startup (isso é normal se o Ollama ainda não iniciou):', e.message)
  }
}

module.exports = { chat, buildSystemPrompt, funcoes, warmupModel }