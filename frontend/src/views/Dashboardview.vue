<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAuthStore }         from '../stores/auth'
import { useAccountsStore }     from '../stores/accounts'
import { useTransactionsStore } from '../stores/transactions'
import { useBudgetsStore }     from '../stores/budgets'
import { useItemsStore }        from '../stores/items'
import { useCurrency }          from '../composables/useCurrency'
import api from '../services/api'


const auth     = useAuthStore()
const accounts = useAccountsStore()
const tx       = useTransactionsStore()
const items    = useItemsStore()
const budgets  = useBudgetsStore()
const { mascaraMoeda, parseMoeda, formatar, formatarParaInput } = useCurrency()


// ── Navegação items
const navItems = [
  { val:'inicio',        icon:'🏠', label:'Início'    },
  { val:'contas',        icon:'🏦', label:'Contas'    },
  { val:'historico',     icon:'📋', label:'Histórico' },
  { val:'metricas',      icon:'📊', label:'Métricas'  },
  { val:'investimentos', icon:'📦', label:'Itens'     },
]

// ── Navegação
const aba             = ref('inicio')
const subAbaInv       = ref('venda')
const subAbaHistorico = ref('lancamentos')

// ── Modais
const modalLancamento    = ref(false)
const modalConta         = ref(false)
const modalItem          = ref(false)
const modalTransferencia = ref(false)
const modalEditar        = ref(false)
const modalAlertas       = ref(false)
const appCarregando      = ref(true)
const loadingGlobal      = ref(false)
const loadingMsg         = ref('Carregando...')
const itemParaVenda      = ref(null)
const contaParaDel       = ref(null)

// ── Refs inputs
const inputValor      = ref(null)
const inputSaldo      = ref(null)
const inputValorItem  = ref(null)
const inputValorVenda = ref(null)
const inputValorTransf  = ref(null)
const inputValorEditar  = ref(null)

// ── Animação saldo
const saldoExibido  = ref(0)
const saldoAnimando = ref('')
const diffValor     = ref(0)
const diffVisivel   = ref(false)

function animarSaldo(novoSaldo) {
  const inicio = saldoExibido.value
  const diff   = Math.round((novoSaldo - inicio) * 100) / 100
  if (diff === 0) return
  diffValor.value = diff
  setTimeout(() => {
    saldoAnimando.value = diff > 0 ? 'up' : 'down'
    diffVisivel.value   = true
    const duracao   = 1400
    const startTime = performance.now()
    function step(now) {
      const progress = Math.min((now - startTime) / duracao, 1)
      const eased    = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      saldoExibido.value = inicio + diff * eased
      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        saldoExibido.value = novoSaldo
        setTimeout(() => { saldoAnimando.value = ''; diffVisivel.value = false }, 2000)
      }
    }
    requestAnimationFrame(step)
  }, 500)
}

// ── Filtros
const filtroAtivo = ref('todos')
const filtros = [
  { val:'todos',   label:'🔀 Todos'    },
  { val:'receita', label:'⬆️ Entradas' },
  { val:'despesa', label:'⬇️ Saídas'  },
]

// ── Valores rápidos lançamento
const valoresRapidos = [
  { val:0.25, label:'25¢'   }, { val:0.50, label:'50¢'   },
  { val:2,    label:'R$2'   }, { val:5,    label:'R$5'    },
  { val:10,   label:'R$10'  }, { val:20,   label:'R$20'   },
  { val:50,   label:'R$50'  }, { val:100,  label:'R$100'  },
  { val:200,  label:'R$200' },
]
function setValorRapido(val) {
  if (!inputValor.value) return
  const novo = Math.round((parseMoeda(inputValor.value.value || '0') + val) * 100) / 100
  inputValor.value.value = formatarParaInput(novo)
}

// ── Categorias
const categoriasEntrada = [
  { id:'salario',       label:'Salário',      emoji:'💼' },
  { id:'freelance',     label:'Freelance',    emoji:'💻' },
  { id:'investimento',  label:'Investimento', emoji:'📈' },
  { id:'presente',      label:'Presente',     emoji:'🎁' },
  { id:'transferencia', label:'Transf.',      emoji:'🔄' },
  { id:'aluguel_rec',   label:'Aluguel',      emoji:'🏠' },
  { id:'premio',        label:'Prêmio',       emoji:'🏆' },
  { id:'outro',         label:'Outro',        emoji:'✨' },
]
const categoriasSaida = [
  { id:'mercado',     label:'Mercado',     emoji:'🛒' },
  { id:'restaurante', label:'Restaurante', emoji:'🍽️' },
  { id:'transporte',  label:'Transporte',  emoji:'🚗' },
  { id:'moradia',     label:'Moradia',     emoji:'🏠' },
  { id:'saude',       label:'Saúde',       emoji:'💊' },
  { id:'lazer',       label:'Lazer',       emoji:'🎮' },
  { id:'compras',     label:'Compras',     emoji:'🛍️' },
  { id:'contas',      label:'Contas',      emoji:'💡' },
  { id:'educacao',    label:'Educação',    emoji:'📚' },
  { id:'assinatura',  label:'Assinatura',  emoji:'📱' },
  { id:'combustivel', label:'Combustível', emoji:'⛽' },
  { id:'outro',       label:'Outro',       emoji:'➕' },
]

const emojiCat      = Object.fromEntries([...categoriasEntrada,...categoriasSaida].map(c=>[c.id,c.emoji]))
const bancosRapidos = ['Nubank','Itaú','Bradesco','Neon','C6 Bank','Inter']
const cores         = ['#14b8a6','#6366f1','#f59e0b','#ef4444','#22c55e','#3b82f6','#ec4899','#8b5cf6']

// ── Métricas
const CIRCUMFERENCE   = 2 * Math.PI * 45
const periodoMetricas = ref('atual')
const periodos = [
  { val:'atual',    label:'📅 Este mês'     },
  { val:'anterior', label:'📅 Mês anterior'  },
  { val:'tudo',     label:'🗂 Tudo'          },
]
const corCat = {
  salario:'#14b8a6', freelance:'#06b6d4', investimento:'#22c55e',
  presente:'#a855f7', transferencia:'#3b82f6', aluguel_rec:'#8b5cf6', premio:'#f59e0b',
  mercado:'#22c55e', restaurante:'#f59e0b', transporte:'#3b82f6',
  moradia:'#8b5cf6', saude:'#ef4444', lazer:'#ec4899',
  compras:'#f97316', contas:'#06b6d4', educacao:'#84cc16',
  assinatura:'#a855f7', combustivel:'#eab308', outro:'#6b7280',
}
const labelCat = {
  salario:'Salário', freelance:'Freelance', investimento:'Investimento',
  presente:'Presente', transferencia:'Transferência', aluguel_rec:'Aluguel', premio:'Prêmio',
  mercado:'Mercado', restaurante:'Restaurante', transporte:'Transporte',
  moradia:'Moradia', saude:'Saúde', lazer:'Lazer',
  compras:'Compras', contas:'Contas', educacao:'Educação',
  assinatura:'Assinatura', combustivel:'Combustível', outro:'Outro',
}

const txPeriodo = computed(() => {
  const agora = new Date()
  return tx.transacoes.filter(t => {
    if (periodoMetricas.value === 'tudo') return true
    const data = new Date(t.data + 'T12:00:00')
    if (periodoMetricas.value === 'atual')
      return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear()
    const mes = agora.getMonth() === 0 ? 11 : agora.getMonth() - 1
    const ano = agora.getMonth() === 0 ? agora.getFullYear() - 1 : agora.getFullYear()
    return data.getMonth() === mes && data.getFullYear() === ano
  })
})
const labelPeriodo = computed(() => {
  const agora = new Date()
  if (periodoMetricas.value === 'atual')
    return agora.toLocaleDateString('pt-BR', { month:'long', year:'numeric' })
  if (periodoMetricas.value === 'anterior') {
    const d = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
    return d.toLocaleDateString('pt-BR', { month:'long', year:'numeric' })
  }
  return 'Todo o período'
})
const totalGastoPeriodo = computed(() => txPeriodo.value.filter(t=>t.tipo==='despesa').reduce((a,t)=>a+Number(t.valor),0))
const totalRecebPeriodo = computed(() => txPeriodo.value.filter(t=>t.tipo==='receita').reduce((a,t)=>a+Number(t.valor),0))
const taxaEconomia      = computed(() => {
  if (!totalRecebPeriodo.value) return 0
  return Math.max(0, Math.round(((totalRecebPeriodo.value - totalGastoPeriodo.value) / totalRecebPeriodo.value) * 100))
})

function calcCategorias(tipo) {
  const lista = txPeriodo.value.filter(t => t.tipo === tipo)
  const total = lista.reduce((a,t) => a + Number(t.valor), 0)
  const mapa  = {}
  lista.forEach(t => { mapa[t.categoria] = (mapa[t.categoria] || 0) + Number(t.valor) })
  return Object.entries(mapa)
    .map(([cat, valor]) => ({
      cat, valor,
      pct:   total > 0 ? Math.round((valor / total) * 100) : 0,
      emoji: emojiCat[cat]  || '📦',
      label: labelCat[cat]  || cat,
      cor:   corCat[cat]    || '#6b7280',
    }))
    .sort((a,b) => b.valor - a.valor)
}
const gastosPorCat   = computed(() => calcCategorias('despesa'))
const receitasPorCat = computed(() => calcCategorias('receita'))

const donutDespesas = computed(() => {
  let offset = 0
  return gastosPorCat.value.map(item => {
    const dash = (item.pct / 100) * CIRCUMFERENCE
    const seg  = { ...item, dash, offset: offset + CIRCUMFERENCE * 0.01 }
    offset += dash
    return seg
  })
})
const donutReceitas = computed(() => {
  let offset = 0
  return receitasPorCat.value.map(item => {
    const dash = (item.pct / 100) * CIRCUMFERENCE
    const seg  = { ...item, dash, offset: offset + CIRCUMFERENCE * 0.01 }
    offset += dash
    return seg
  })
})

// ── Computed gerais
const mesAtual            = computed(() => new Date().toLocaleDateString('pt-BR', { month:'long', year:'numeric' }))
const totalEntradas       = computed(() => tx.transacoes.filter(t=>t.tipo==='receita').reduce((a,t)=>a+Number(t.valor),0))
const totalSaidas         = computed(() => tx.transacoes.filter(t=>t.tipo==='despesa').reduce((a,t)=>a+Number(t.valor),0))
const balanco             = computed(() => totalEntradas.value - totalSaidas.value)
const total               = computed(() => totalEntradas.value + totalSaidas.value)
const pctEntradas         = computed(() => total.value ? Math.round(totalEntradas.value/total.value*100) : 0)
const transacoesFiltradas = computed(() =>
  filtroAtivo.value==='todos' ? tx.transacoes : tx.transacoes.filter(t=>t.tipo===filtroAtivo.value)
)
const categoriasAtuais    = computed(() => formTx.value.tipo==='receita' ? categoriasEntrada : categoriasSaida)
const itensVenda          = computed(() => items.itens.filter(i=>i.tipo==='venda'))
const itensCompra         = computed(() => items.itens.filter(i=>i.tipo==='compra'))

// ── Tema dinâmico do saldo
const temaSaldo = computed(() => {
  if (saldoExibido.value > 0) {
    return {
      fundo: 'from-[#0a4f4b] via-[#0f766e] to-[#0d9488]',
      sombra: 'shadow-teal-500/20',
      borda: 'border-teal-500/30',
      texto: 'text-teal-100',
      icone: 'text-teal-300'
    }
  } else if (saldoExibido.value < 0) {
    return {
      fundo: 'from-[#450a0a] via-[#7f1d1d] to-[#b91c1c]',
      sombra: 'shadow-red-500/30',
      borda: 'border-red-500/40',
      texto: 'text-red-100',
      icone: 'text-red-300'
    }
  } else {
    return {
      fundo: 'from-[#1e293b] via-[#334155] to-[#475569]',
      sombra: 'shadow-slate-500/20',
      borda: 'border-slate-500/30',
      texto: 'text-slate-200',
      icone: 'text-slate-400'
    }
  }
})

// ── Forms
const formConta = ref({ banco:'', saldo:0, cor:'#14b8a6' })
const formTx    = ref({ descricao:'', valor:0, tipo:'despesa', categoria:'mercado', data:hoje(), accountId:'' })
const formItem  = ref({ nome:'', descricao:'', valor:0, tipo:'venda', accountId:'' })
const formVenda = ref({ accountId:'' })
const toast     = ref({ visivel:false, mensagem:'' })

function mostrarToast(msg) {
  toast.value = { visivel:true, mensagem:msg }
  setTimeout(() => toast.value.visivel = false, 2500)
}
function hoje() { return new Date().toISOString().split('T')[0] }
function fmtData(d) {
  if (!d) return ''
  const [y,m,day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ── Loading global helper
function mostrarLoading(msg = 'Carregando...') { loadingMsg.value = msg; loadingGlobal.value = true }
function ocultarLoading() { loadingGlobal.value = false }

// ── Lifecycle
let pollingInterval = null

async function sincronizarSaldo() {
  try {
    await accounts.carregar()
    const novoSaldo = Number(accounts.saldoTotal || 0)
    const atual     = Number(saldoExibido.value    || 0)
    if (Math.abs(novoSaldo - atual) >= 0.01) {
      animarSaldo(novoSaldo)
    } else {
      saldoExibido.value = novoSaldo
    }
  } catch (err) {
    console.error('Polling erro:', err)
  }
}

onMounted(async () => {
  await accounts.carregar()
  await tx.carregar()
  await items.carregar()
  await budgets.carregar()
  saldoExibido.value = Number(accounts.saldoTotal || 0)
  appCarregando.value = false
  pollingInterval = setInterval(sincronizarSaldo, 5000)
})

onUnmounted(() => {
  if (pollingInterval) clearInterval(pollingInterval)
})

// ── Ações existentes
function fecharLancamento() {
  modalLancamento.value = false
  if (inputValor.value) inputValor.value.value = ''
}
function confirmarDel(conta) { contaParaDel.value = conta }

async function deletarConta() {
  await accounts.deletar(contaParaDel.value.id)
  await accounts.carregar()
  animarSaldo(accounts.saldoTotal)
  contaParaDel.value = null
  mostrarToast('🗑️ Conta removida')
}

async function criarConta() {
  if (!formConta.value.banco) { mostrarToast('⚠️ Selecione ou digite o banco'); return }
  loadingConta.value = true
  mostrarLoading('Criando conta...')
  try {
    const saldo = parseMoeda(inputSaldo.value?.value || '0')
    await accounts.criar({
      nome:  formConta.value.banco,
      banco: formConta.value.banco,
      saldo: saldo,
      cor:   formConta.value.cor || '#14b8a6',
    })
    await accounts.carregar()
    await budgets.carregar()
    animarSaldo(accounts.saldoTotal)
    formConta.value = { banco: '', saldo: 0, cor: '#14b8a6' }
    if (inputSaldo.value) inputSaldo.value.value = ''
    modalConta.value = false
    mostrarToast('✅ Conta criada!')
  } catch (err) {
    console.error('Erro ao criar conta:', err)
    mostrarToast('❌ Erro ao criar conta')
  } finally {
    loadingConta.value = false
    ocultarLoading()
  }
}

async function criarTransacao() {
  if (!formTx.value.accountId) { mostrarToast('⚠️ Selecione uma conta'); return }
  const valor = parseMoeda(inputValor.value?.value || '0')
  if (!valor || valor <= 0) { mostrarToast('⚠️ Informe um valor'); return }
  const tipo = formTx.value.tipo
  if (!formTx.value.descricao) {
    const cat = categoriasAtuais.value.find(c=>c.id===formTx.value.categoria)
    formTx.value.descricao = cat?.label || 'Lançamento'
  }
  mostrarLoading('Salvando lançamento...')
  try {
    const contaAtual = formTx.value.accountId
    await tx.criar({ ...formTx.value, valor, data: hoje() })
    await accounts.carregar()
    await budgets.carregar()
    animarSaldo(accounts.saldoTotal)
    if (inputValor.value) inputValor.value.value = ''
    formTx.value = { descricao:'', valor:0, tipo:'despesa', categoria:'mercado', data:hoje(), accountId: contaAtual }
    modalLancamento.value = false
    mostrarToast(tipo==='receita'?'⬆️ Entrada registrada!':'⬇️ Saída registrada!')
  } catch (err) {
    console.error(err)
    mostrarToast('❌ Erro ao salvar lançamento.')
  } finally {
    ocultarLoading()
  }
}

async function criarItem() {
  if (!formItem.value.nome) { mostrarToast('⚠️ Informe o nome'); return }
  const valor = parseMoeda(inputValorItem.value?.value || '0')
  if (!valor || valor <= 0) { mostrarToast('⚠️ Informe o valor'); return }
  formItem.value.tipo = subAbaInv.value
  await items.criar({ ...formItem.value, valor })
  if (subAbaInv.value === 'compra') { await accounts.carregar(); animarSaldo(accounts.saldoTotal) }
  formItem.value = { nome:'', descricao:'', valor:0, tipo:'venda', accountId:'' }
  if (inputValorItem.value) inputValorItem.value.value = ''
  modalItem.value = false
  mostrarToast(subAbaInv.value==='venda'?'📦 Item adicionado!':'🛒 Compra registrada!')
}

function abrirVenda(item) {
  itemParaVenda.value = item
  formVenda.value = { accountId: accounts.contas[0]?.id || '' }
  nextTick(() => { if (inputValorVenda.value) inputValorVenda.value.value = formatarParaInput(item.valor) })
}

async function confirmarVenda() {
  if (!formVenda.value.accountId) { mostrarToast('⚠️ Selecione a conta'); return }
  const valor = parseMoeda(inputValorVenda.value?.value || '0')
  if (!valor || valor <= 0) { mostrarToast('⚠️ Informe o valor'); return }
  await items.vender(itemParaVenda.value.id, formVenda.value.accountId, valor)
  await accounts.carregar()
  animarSaldo(accounts.saldoTotal)
  itemParaVenda.value = null
  mostrarToast('✅ Venda registrada!')
}

// ── ALERTAS DE ORÇAMENTO
const loadingConta   = ref(false)
const loadingAlerta  = ref(false)
const inputValorAlerta = ref(null)
const formAlerta = ref({ categoria: 'mercado' })

watch(
  () => formAlerta.value.categoria,
  (cat) => {
    const b = budgets.budgets.find(b => b.categoria === cat)
    nextTick(() => {
      if (inputValorAlerta.value)
        inputValorAlerta.value.value = b ? formatarParaInput(b.limite) : ''
    })
  }
)

async function salvarAlerta() {
  const limite = parseMoeda(inputValorAlerta.value?.value || '0')
  if (!limite || limite <= 0) { mostrarToast('⚠️ Informe um valor limite'); return }
  loadingAlerta.value = true
  mostrarLoading('Salvando alerta...')
  try {
    await budgets.salvar({ categoria: formAlerta.value.categoria, limite })
    mostrarToast('✅ Alerta salvo!')
    if (inputValorAlerta.value) inputValorAlerta.value.value = ''
  } catch { mostrarToast('❌ Erro ao salvar alerta') }
  finally {
    loadingAlerta.value = false
    ocultarLoading()
  }
}

async function toggleAlerta(b) {
  await budgets.atualizar(b.id, { ativo: !b.ativo })
  mostrarToast(b.ativo ? '🔕 Alerta pausado' : '🔔 Alerta ativado')
}

// ── EDITAR TRANSAÇÃO
const loadingEditar = ref(false)
const formEditar = ref({
  id:          null,
  descricao:   '',
  valor:       0,
  tipo:        'despesa',
  categoria:   'mercado',
  data:        '',
  accountId:   '',
})

function abrirEditar(transacao) {
  formEditar.value = {
    id:        transacao.id,
    descricao: transacao.descricao || '',
    valor:     Number(transacao.valor),
    tipo:      transacao.tipo,
    categoria: transacao.categoria,
    data:      transacao.data,
    accountId: transacao.accountId,
  }
  modalEditar.value = true
  nextTick(() => {
    if (inputValorEditar.value)
      inputValorEditar.value.value = formatarParaInput(Number(transacao.valor))
  })
}

async function salvarEdicao() {
  const valor = parseMoeda(inputValorEditar.value?.value || '0')
  if (!valor || valor <= 0)      { mostrarToast('⚠️ Informe um valor'); return }
  if (!formEditar.value.accountId) { mostrarToast('⚠️ Selecione uma conta'); return }

  loadingEditar.value = true
  try {
    await tx.editar(formEditar.value.id, {
      descricao:  formEditar.value.descricao || formEditar.value.categoria,
      valor,
      tipo:       formEditar.value.tipo,
      categoria:  formEditar.value.categoria,
      data:       formEditar.value.data || hoje(),
      accountId:  formEditar.value.accountId,
    })
    await accounts.carregar()
    animarSaldo(accounts.saldoTotal)
    modalEditar.value = false
    mostrarToast('✅ Transação atualizada!')
  } catch (err) {
    console.error(err)
    mostrarToast('❌ Erro ao salvar. Tente novamente.')
  } finally {
    loadingEditar.value = false
  }
}

// ── TRANSFERÊNCIA
const buscaUsuario         = ref('')
const buscandoUsuarios     = ref(false)
const usuariosEncontrados  = ref([])
const contasUsuarioDestino = ref([])
let   debounceTimerTransf  = null

const formTransf = ref({
  tipo:             'propria',
  contaOrigemId:    '',
  contaDestinoId:   '',
  usuarioDestinoId: '',
  contaExternaId:   '',
  descricao:        '',
})

const valoresRapidosTransf = [
  { val: 10,  label: 'R$10'  },
  { val: 20,  label: 'R$20'  },
  { val: 50,  label: 'R$50'  },
  { val: 100, label: 'R$100' },
  { val: 200, label: 'R$200' },
  { val: 500, label: 'R$500' },
]

const contasDestino = computed(() =>
  accounts.contas.filter(c => c.id !== formTransf.value.contaOrigemId)
)

function fecharTransferencia() {
  modalTransferencia.value   = false
  buscaUsuario.value         = ''
  usuariosEncontrados.value  = []
  contasUsuarioDestino.value = []
  formTransf.value = {
    tipo: 'propria', contaOrigemId: '', contaDestinoId: '',
    usuarioDestinoId: '', contaExternaId: '', descricao: '',
  }
  if (inputValorTransf.value) inputValorTransf.value.value = ''
}

function setValorRapidoTransf(val) {
  if (!inputValorTransf.value) return
  const atual = parseMoeda(inputValorTransf.value.value || '0')
  inputValorTransf.value.value = formatarParaInput(Math.round((atual + val) * 100) / 100)
}

function debounceUsuarios() {
  clearTimeout(debounceTimerTransf)
  if (buscaUsuario.value.length < 2) { usuariosEncontrados.value = []; return }
  buscandoUsuarios.value = true
  debounceTimerTransf = setTimeout(async () => {
    try {
      const { data } = await api.get('/auth/search', {
        params: { q: buscaUsuario.value }
      })
      const filtrados = data.filter(u => u.id !== auth.user?.id)
      usuariosEncontrados.value = filtrados
      // Merge em recentes para aparecer na lista inicial também
      filtrados.forEach(u => {
        if (!usuariosRecentes.value.find(r => r.id === u.id)) {
          usuariosRecentes.value.push(u)
        }
      })
    } catch {
      usuariosEncontrados.value = []
    } finally {
      buscandoUsuarios.value = false
    }
  }, 300)
}

async function selecionarUsuarioDestino(usuario) {
  formTransf.value.usuarioDestinoId = usuario.id
  formTransf.value.contaExternaId   = ''
  contasUsuarioDestino.value         = []
  try {
    const { data } = await api.get(`/accounts/user/${usuario.id}`)
    contasUsuarioDestino.value = data
    if (data.length === 1) formTransf.value.contaExternaId = data[0].id
  } catch {
    mostrarToast('❌ Erro ao buscar contas do usuário')
  }
}

const loadingTransferencia = ref(false)

const previewTransferencia = computed(() => {
  const valor = parseMoeda(inputValorTransf.value?.value || '0')
  if (!valor || !formTransf.value.contaOrigemId) return null
  const origem = accounts.contas.find(c => c.id === formTransf.value.contaOrigemId)
  if (!origem) return null
  if (formTransf.value.tipo === 'propria') {
    const destino = accounts.contas.find(c => c.id === formTransf.value.contaDestinoId)
    if (!destino) return null
    return {
      valor,
      nomeOrigem:   origem.banco  || origem.nome,
      corOrigem:    origem.cor    || '#2dd4bf',
      saldoOrigem:  origem.saldo,
      nomeDestino:  destino.banco || destino.nome,
      corDestino:   destino.cor   || '#3b82f6',
      emailDestino: null,
    }
  } else {
    const usuario  = usuariosEncontrados.value.find(u => u.id === formTransf.value.usuarioDestinoId)
    const contaExt = contasUsuarioDestino.value.find(c => c.id === formTransf.value.contaExternaId)
    if (!usuario || !contaExt) return null
    return {
      valor,
      nomeOrigem:   origem.banco   || origem.nome,
      corOrigem:    origem.cor     || '#2dd4bf',
      saldoOrigem:  origem.saldo,
      nomeDestino:  contaExt.banco || contaExt.nome,
      corDestino:   '#3b82f6',
      emailDestino: usuario.email,
    }
  }
})

async function realizarTransferencia() {
  const valor = parseMoeda(inputValorTransf.value?.value || '0')
  if (!valor || valor <= 0)            { mostrarToast('⚠️ Informe um valor'); return }
  if (!formTransf.value.contaOrigemId) { mostrarToast('⚠️ Selecione a conta de origem'); return }

  const contaOrigem = accounts.contas.find(c => c.id === formTransf.value.contaOrigemId)
  if (!contaOrigem)                      { mostrarToast('⚠️ Conta de origem não encontrada'); return }
  if (Number(contaOrigem.saldo) < valor) { mostrarToast('❌ Saldo insuficiente'); return }

  loadingTransferencia.value = true
  try {
    if (formTransf.value.tipo === 'propria') {
      if (!formTransf.value.contaDestinoId) { mostrarToast('⚠️ Selecione a conta destino'); return }
      if (formTransf.value.contaOrigemId === formTransf.value.contaDestinoId) {
        mostrarToast('⚠️ Origem e destino não podem ser iguais'); return
      }
      const contaDestino = accounts.contas.find(c => c.id === formTransf.value.contaDestinoId)
      const base         = formTransf.value.descricao ? `${formTransf.value.descricao} · ` : ''
      const nomeOrigem   = contaOrigem.banco  || contaOrigem.nome
      const nomeDestino  = contaDestino?.banco || contaDestino?.nome || 'destino'
      const descSaida    = `${base}Transferência → ${nomeDestino}`
      const descEntrada  = `${base}Transferência ← ${nomeOrigem}`
      await tx.criar({ tipo: 'despesa', categoria: 'transferencia', descricao: descSaida,   valor, data: hoje(), accountId: formTransf.value.contaOrigemId })
      await tx.criar({ tipo: 'receita', categoria: 'transferencia', descricao: descEntrada, valor, data: hoje(), accountId: formTransf.value.contaDestinoId })
    } else {
      if (!formTransf.value.usuarioDestinoId) { mostrarToast('⚠️ Selecione o usuário destino'); return }
      if (!formTransf.value.contaExternaId)   { mostrarToast('⚠️ Selecione a conta do destinatário'); return }

      let erroTransf = null
      try {
        await api.post('/transfers', {
          contaOrigemId:  Number(formTransf.value.contaOrigemId),
          contaDestinoId: Number(formTransf.value.contaExternaId),
          valor,
          descricao: formTransf.value.descricao || 'Transferência',
        })
      } catch (errApi) {
        erroTransf = errApi.response?.data?.erro || 'Erro na transferência'
      }

      if (erroTransf) {
        mostrarToast('❌ ' + erroTransf)
        return
      }

      await tx.carregar()
    }
    await accounts.carregar()
    animarSaldo(accounts.saldoTotal)
    fecharTransferencia()
    mostrarToast('✅ Transferência realizada!')
  } catch (err) {
    console.error(err)
    mostrarToast('❌ Erro inesperado. Tente novamente.')
  } finally {
    loadingTransferencia.value = false
  }
}

// ── Steps modais
const passoLancamento  = ref(1)
const passoTransf        = ref(1)
const valorTransfGuardado  = ref(0)   // guarda o valor entre passos (input fica oculto)
const usuariosRecentes = ref([])
const buscandoRecentes = ref(false)

async function carregarTodosUsuarios() {
  buscandoRecentes.value = false
}

function fecharLancamentoStep() {
  modalLancamento.value = false
  passoLancamento.value = 1
  formTx.value = { descricao:'', valor:0, tipo:'despesa', categoria:'mercado', data:hoje(), accountId:'' }
  if (inputValor.value) inputValor.value.value = ''
}

function selecionarTipoLancamento(tipo) {
  formTx.value.tipo = tipo
  formTx.value.categoria = tipo === 'receita' ? 'salario' : 'mercado'
  passoLancamento.value = 2
}

function selecionarCategoriaStep(catId) {
  formTx.value.categoria = catId
  passoLancamento.value = 3
  nextTick(() => { if (inputValor.value) inputValor.value.focus() })
}

function confirmarValorLancamento() {
  const valor = parseMoeda(inputValor.value?.value || '0')
  if (!valor || valor <= 0) { mostrarToast('⚠️ Informe um valor'); return }
  if (accounts.contas.length === 1) {
    formTx.value.accountId = accounts.contas[0].id
    criarTransacao()
    passoLancamento.value = 1
  } else {
    passoLancamento.value = 4
  }
}

async function criarTransacaoStep() {
  if (!formTx.value.accountId) { mostrarToast('⚠️ Selecione uma conta'); return }
  await criarTransacao()
  passoLancamento.value = 1
}

function abrirTransferenciaStep() {
  modalTransferencia.value = true
  passoTransf.value = 1
  carregarTodosUsuarios()
}

function fecharTransferenciaStep() {
  fecharTransferencia()
  passoTransf.value = 1
  valorTransfGuardado.value = 0
}

function selecionarTipoTransf(tipo) {
  formTransf.value.tipo = tipo
  formTransf.value.contaOrigemId    = ''
  formTransf.value.contaDestinoId   = ''
  formTransf.value.usuarioDestinoId = ''
  formTransf.value.contaExternaId   = ''
  buscaUsuario.value = ''
  usuariosEncontrados.value = []
  passoTransf.value = 2
}

function selecionarContaDestinoStep(contaId) {
  formTransf.value.contaDestinoId = contaId
  passoTransf.value = 3
  nextTick(() => { if (inputValorTransf.value) inputValorTransf.value.focus() })
}

async function selecionarUsuarioStep(usuario) {
  await selecionarUsuarioDestino(usuario)
  passoTransf.value = 3
}

function selecionarContaExternaStep(contaId) {
  formTransf.value.contaExternaId = contaId
  passoTransf.value = 4
  nextTick(() => { if (inputValorTransf.value) inputValorTransf.value.focus() })
}

function confirmarValorTransf() {
  const valor = parseMoeda(inputValorTransf.value?.value || '0')
  if (!valor || valor <= 0) { mostrarToast('⚠️ Informe um valor'); return }
  valorTransfGuardado.value = valor   // salva antes de trocar de passo (input vai sumir)
  passoTransf.value = formTransf.value.tipo === 'propria' ? 4 : 5
}

async function realizarTransferenciaStep() {
  // O inputValorTransf está null aqui pois o input ficou no passo anterior (v-if oculto)
  // Usamos valorTransfGuardado que foi salvo em confirmarValorTransf()
  const valor = valorTransfGuardado.value
  if (!valor || valor <= 0) { mostrarToast('⚠️ Informe um valor'); return }
  if (!formTransf.value.contaOrigemId) { mostrarToast('⚠️ Selecione a conta de origem'); return }

  const contaOrigem = accounts.contas.find(c => c.id === formTransf.value.contaOrigemId)
  if (!contaOrigem)                      { mostrarToast('⚠️ Conta não encontrada'); return }
  if (Number(contaOrigem.saldo) < valor) { mostrarToast('❌ Saldo insuficiente'); return }

  loadingTransferencia.value = true
  try {
    if (formTransf.value.tipo === 'propria') {
      if (!formTransf.value.contaDestinoId) { mostrarToast('⚠️ Selecione a conta destino'); return }
      if (formTransf.value.contaOrigemId === formTransf.value.contaDestinoId) {
        mostrarToast('⚠️ Origem e destino iguais'); return
      }
      const contaDestino = accounts.contas.find(c => c.id === formTransf.value.contaDestinoId)
      const base        = formTransf.value.descricao ? `${formTransf.value.descricao} · ` : ''
      const nomeOrigem  = contaOrigem.banco  || contaOrigem.nome
      const nomeDestino = contaDestino?.banco || contaDestino?.nome || 'destino'
      await tx.criar({ tipo:'despesa', categoria:'transferencia', descricao:`${base}Transferência → ${nomeDestino}`, valor, data:hoje(), accountId: formTransf.value.contaOrigemId })
      await tx.criar({ tipo:'receita', categoria:'transferencia', descricao:`${base}Transferência ← ${nomeOrigem}`,  valor, data:hoje(), accountId: formTransf.value.contaDestinoId })
    } else {
      if (!formTransf.value.usuarioDestinoId) { mostrarToast('⚠️ Selecione o usuário'); return }
      if (!formTransf.value.contaExternaId)   { mostrarToast('⚠️ Selecione a conta do destinatário'); return }
      let erroTransf = null
      try {
        await api.post('/transfers', {
          contaOrigemId:  Number(formTransf.value.contaOrigemId),
          contaDestinoId: Number(formTransf.value.contaExternaId),
          valor,
          descricao: formTransf.value.descricao || 'Transferência',
        })
      } catch (errApi) {
        erroTransf = errApi.response?.data?.erro || 'Erro na transferência'
      }
      if (erroTransf) { mostrarToast('❌ ' + erroTransf); return }
      await tx.carregar()
    }
    await accounts.carregar()
    animarSaldo(accounts.saldoTotal)
    fecharTransferenciaStep()
    mostrarToast('✅ Transferência realizada!')
  } catch (err) {
    console.error(err)
    mostrarToast('❌ Erro inesperado. Tente novamente.')
  } finally {
    loadingTransferencia.value = false
  }
}

const usuariosDestino = computed(() => {
  const q = buscaUsuario.value.trim()
  return q.length >= 2 ? usuariosEncontrados.value : []
})

const contasOrigemTransf = computed(() =>
  formTransf.value.tipo === 'propria'
    ? accounts.contas.filter(c => c.id !== formTransf.value.contaDestinoId)
    : accounts.contas
)

</script>

<template>
  <!-- App carregando -->
  <div v-if="appCarregando" class="fixed inset-0 bg-[#0b0d12] flex items-center justify-center z-50">
    <div class="flex flex-col items-center gap-3">
      <div class="w-10 h-10 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin"></div>
      <p class="text-gray-400 text-sm">Carregando...</p>
    </div>
  </div>

  <!-- Toast -->
  <Transition name="toast-slide">
    <div v-if="toast.visivel"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-[#1c1f2e] border border-white/10 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold backdrop-blur-xl max-w-xs text-center whitespace-nowrap">
      {{ toast.mensagem }}
    </div>
  </Transition>

  <!-- Loading global -->
  <Transition name="fade">
    <div v-if="loadingGlobal" style="position:fixed;top:0;left:0;right:0;height:100dvh;z-index:9999;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;">
      <div class="bg-[#1c1f2e] border border-white/10 rounded-2xl px-8 py-6 flex items-center gap-4 shadow-2xl">
        <div class="w-6 h-6 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin"></div>
        <span class="text-sm text-gray-300 font-medium">{{ loadingMsg }}</span>
      </div>
    </div>
  </Transition>

  <div class="min-h-dvh bg-[#0b0d12] text-white flex flex-col overflow-x-hidden">

    <!-- ── HEADER ── -->
    <header class="bg-[#0b0d12]/95 backdrop-blur-xl border-b border-white/5 px-4 h-14 flex items-center justify-between sticky top-0 z-40 lg:pl-72 min-w-0">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-teal-500/30 flex-shrink-0">
          <span class="text-base leading-none">💰</span>
        </div>
        <span class="font-black tracking-tight text-sm hidden sm:block">FinanceApp</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 bg-white/5 border border-white/8 px-3 py-1.5 rounded-xl">
          <div class="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
            {{ auth.nome?.charAt(0).toUpperCase() }}
          </div>
          <span class="text-sm text-gray-300 font-medium hidden sm:block max-w-[120px] truncate">{{ auth.nome }}</span>
        </div>
        <button @click="auth.logout()"
          class="text-xs text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 px-3 py-1.5 rounded-xl transition-all">
          Sair
        </button>
      </div>
    </header>

    <!-- ── SIDEBAR (desktop) ── -->
    <aside class="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#0e1017] border-r border-white/5 z-30 pt-14">
      <div class="flex-1 p-4 space-y-1 overflow-y-auto">
        <p class="text-[10px] text-gray-600 font-black uppercase tracking-widest px-3 mb-3">Menu</p>
        <button v-for="item in navItems" :key="item.val" @click="aba = item.val"
          :class="aba === item.val
            ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
            : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all">
          <span class="text-lg leading-none">{{ item.icon }}</span>
          {{ item.label }}
        </button>

        <div class="pt-4 border-t border-white/5 mt-4 space-y-1">
          <p class="text-[10px] text-gray-600 font-black uppercase tracking-widest px-3 mb-3">Ações Rápidas</p>
          <button @click="abrirTransferenciaStep()"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent text-gray-500 hover:text-blue-400 hover:bg-blue-500/5 text-sm font-semibold transition-all">
            <span class="text-lg leading-none">🔄</span> Transferir
          </button>
          <button @click="modalLancamento = true; passoLancamento = 1"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent text-gray-500 hover:text-teal-400 hover:bg-teal-500/5 text-sm font-semibold transition-all">
            <span class="text-lg leading-none">⚡</span> Lançamento
          </button>
          <button @click="modalConta = true"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5 text-sm font-semibold transition-all">
            <span class="text-lg leading-none">🏦</span> Nova Conta
          </button>
          <button @click="modalAlertas = true"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/5 text-sm font-semibold transition-all">
            <span class="text-lg leading-none">🔔</span> Alertas
          </button>
        </div>
      </div>
    </aside>

    <!-- ── MAIN CONTENT ── -->
    <main class="flex-1 min-w-0 overflow-x-hidden px-3 pt-5 pb-28 lg:ml-64 lg:px-8 lg:pb-8">

      <div v-show="aba === 'inicio'" class="space-y-4">

        <div class="relative overflow-hidden rounded-3xl p-6 shadow-2xl transition-all duration-700 bg-gradient-to-br border"
          :class="[
            temaSaldo.fundo, 
            temaSaldo.sombra, 
            temaSaldo.borda,
            saldoAnimando==='up'?'ring-2 ring-green-400 ring-offset-2 ring-offset-[#0b0d12]':saldoAnimando==='down'?'ring-2 ring-red-400 ring-offset-2 ring-offset-[#0b0d12]':''
          ]">
          
          <div class="absolute inset-0 opacity-[0.15]" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 16px 16px;"></div>
          <div class="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none transition-colors duration-700"></div>
          <div class="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-black/20 blur-2xl pointer-events-none transition-colors duration-700"></div>

          <div class="relative flex items-start justify-between mb-4 z-10">
            <div>
              <p class="text-xs font-bold uppercase tracking-widest mb-0.5 opacity-70" :class="temaSaldo.texto">Saldo Total</p>
              <p class="text-xs opacity-60" :class="temaSaldo.texto">{{ accounts.contas.length }} conta(s) ativa(s)</p>
            </div>
            <div class="flex items-center gap-1 bg-black/20 border border-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-inner">
              <span class="text-xs font-semibold capitalize" :class="temaSaldo.texto">{{ mesAtual }} 📅</span>
            </div>
          </div>

          <div class="relative mb-5 z-10">
            <h2 class="text-4xl sm:text-5xl font-black tracking-tight tabular-nums transition-all duration-700 text-white"
              :class="saldoAnimando==='up'?'drop-shadow-[0_0_24px_rgba(74,222,128,0.8)] scale-105':saldoAnimando==='down'?'drop-shadow-[0_0_24px_rgba(248,113,113,0.8)] scale-95':''">
              {{ formatar(saldoExibido) }}
            </h2>
            <Transition name="diff-badge">
              <div v-if="diffVisivel"
                :class="diffValor>=0?'bg-green-500/20 text-green-300 border-green-400/40':'bg-red-500/20 text-red-300 border-red-400/40'"
                class="absolute -right-2 top-2 flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-black backdrop-blur-md shadow-lg">
                {{ diffValor>=0?'📈':'📉' }} {{ diffValor>=0?'+':'' }}{{ formatar(diffValor) }}
              </div>
            </Transition>
          </div>

          <div class="relative mb-5 z-10">
            <div class="h-2 rounded-full bg-black/30 overflow-hidden backdrop-blur-sm shadow-inner">
              <div class="h-full rounded-full transition-all duration-1000 ease-out" 
                   :class="pctEntradas > 50 ? 'bg-gradient-to-r from-green-400 to-teal-300' : 'bg-gradient-to-r from-amber-400 to-red-400'"
                   :style="{width: pctEntradas+'%'}">
              </div>
            </div>
            <div class="flex justify-between mt-2 text-[11px] font-semibold opacity-80" :class="temaSaldo.texto">
              <span class="flex items-center gap-1">⬆ Entradas: {{ formatar(totalEntradas) }}</span>
              <span class="flex items-center gap-1">⬇ Saídas: {{ formatar(totalSaidas) }}</span>
            </div>
          </div>

          <!-- ── BOTÕES LADO A LADO ── -->
          <div class="relative z-10 grid grid-cols-3 gap-2">
            <button @click="modalAlertas=true"
              class="relative bg-white/10 hover:bg-white/20 active:bg-black/10 border border-white/20 backdrop-blur-md py-3.5 rounded-2xl text-sm font-black text-white transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden group">
              <span class="text-lg group-hover:scale-125 transition-transform">🔔</span> Alertas
            </button>
            <button @click="abrirTransferenciaStep()"
              class="relative bg-white/10 hover:bg-white/20 active:bg-black/10 border border-white/20 backdrop-blur-md py-3.5 rounded-2xl text-sm font-black text-white transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden group">
              <span class="text-lg group-hover:scale-125 transition-transform">🔄</span> Transferir
            </button>
            <button @click="modalLancamento=true; passoLancamento=1"
              class="relative bg-white/10 hover:bg-white/20 active:bg-black/10 border border-white/20 backdrop-blur-md py-3.5 rounded-2xl text-sm font-black text-white transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden group">
              <div class="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span class="text-lg group-hover:scale-125 transition-transform">⚡</span> Lançamento Rápido
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="bg-[#13161f] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all cursor-pointer" @click="aba='historico'; filtroAtivo='receita'; subAbaHistorico='lancamentos'">
            <div class="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center text-sm mb-3">⬆️</div>
            <p class="text-xs text-gray-500 mb-1">Entradas</p>
            <p class="font-black text-green-400 text-sm sm:text-base tabular-nums">{{ formatar(totalEntradas) }}</p>
          </div>
          <div class="bg-[#13161f] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all cursor-pointer" @click="aba='historico'; filtroAtivo='despesa'; subAbaHistorico='lancamentos'">
            <div class="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center text-sm mb-3">⬇️</div>
            <p class="text-xs text-gray-500 mb-1">Saídas</p>
            <p class="font-black text-red-400 text-sm sm:text-base tabular-nums">{{ formatar(totalSaidas) }}</p>
          </div>
          <div class="bg-[#13161f] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm mb-3" :class="balanco>=0?'bg-teal-500/15':'bg-red-500/15'">⚖️</div>
            <p class="text-xs text-gray-500 mb-1">Balanço</p>
            <p class="font-black text-sm sm:text-base tabular-nums" :class="balanco>=0?'text-teal-400':'text-red-400'">{{ formatar(balanco) }}</p>
          </div>
        </div>

        <div v-if="accounts.contas.length > 0" class="bg-[#13161f] rounded-2xl border border-white/5 overflow-hidden">
          <div class="px-4 py-3 flex items-center justify-between border-b border-white/5">
            <p class="text-sm font-bold">🏦 Minhas Contas</p>
            <button @click="aba='contas'" class="text-teal-400 text-xs hover:underline">Gerenciar →</button>
          </div>
          <div class="divide-y divide-white/5">
            <div v-for="conta in accounts.contas" :key="conta.id" class="flex items-center gap-3 px-4 py-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                :style="{background:conta.cor+'22',color:conta.cor}">
                {{ conta.banco.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold">{{ conta.banco }}</p>
                <div class="h-1 rounded-full bg-white/5 mt-1.5">
                  <div class="h-1 rounded-full transition-all duration-700" :style="{width:(accounts.saldoTotal>0?(conta.saldo/accounts.saldoTotal)*100:0)+'%',backgroundColor:conta.cor}"></div>
                </div>
              </div>
              <p class="font-black text-sm tabular-nums flex-shrink-0" :style="{color:conta.cor}">{{ formatar(conta.saldo) }}</p>
            </div>
          </div>
        </div>
        <div v-else class="bg-[#13161f] rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <p class="text-3xl mb-2">🏦</p>
          <p class="text-gray-500 text-sm mb-3">Nenhuma conta ainda</p>
          <button @click="modalConta=true" class="text-teal-400 text-sm font-semibold hover:underline">+ Adicionar conta</button>
        </div>


        <!-- ── ALERTAS DE ORÇAMENTO ── -->
        <div v-if="budgets.budgets.filter(b=>b.ativo).length > 0">
          <!-- Alertas ultrapassados (vermelho) -->
          <div v-for="b in budgets.budgets.filter(b=>b.ativo && b.gastoAtual >= b.limite)" :key="'alerta-'+b.id"
            class="bg-[#13161f] rounded-2xl border border-red-500/30 overflow-hidden mb-3">
            <div class="px-4 py-3 flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-base flex-shrink-0">
                {{ emojiCat[b.categoria] || '⚠️' }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <p class="text-sm font-bold text-red-400">🚨 Limite ultrapassado!</p>
                  <span class="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-semibold">{{ labelCat[b.categoria] || b.categoria }}</span>
                </div>
                <p class="text-xs text-gray-400">
                  Você gastou <span class="text-red-400 font-black tabular-nums">{{ formatar(b.gastoAtual) }}</span>
                  de <span class="text-gray-300 font-semibold tabular-nums">{{ formatar(b.limite) }}</span> este mês
                </p>
                <div class="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div class="h-full rounded-full bg-red-500 transition-all duration-700"
                    :style="{width: Math.min((b.gastoAtual/b.limite)*100, 100)+'%'}"></div>
                </div>
              </div>
              <button @click="modalAlertas=true" class="text-gray-600 hover:text-gray-400 text-xs flex-shrink-0">⚙️</button>
            </div>
          </div>

          <!-- Alertas de aviso (amarelo, 70%-99%) -->
          <div v-for="b in budgets.budgets.filter(b=>b.ativo && b.gastoAtual >= b.limite*0.7 && b.gastoAtual < b.limite)" :key="'aviso-'+b.id"
            class="bg-[#13161f] rounded-2xl border border-amber-500/30 overflow-hidden mb-3">
            <div class="px-4 py-3 flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-base flex-shrink-0">
                {{ emojiCat[b.categoria] || '⚠️' }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <p class="text-sm font-bold text-amber-400">⚠️ Atenção!</p>
                  <span class="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-semibold">{{ labelCat[b.categoria] || b.categoria }}</span>
                </div>
                <p class="text-xs text-gray-400">
                  Você gastou <span class="text-amber-400 font-black tabular-nums">{{ formatar(b.gastoAtual) }}</span>
                  de <span class="text-gray-300 font-semibold tabular-nums">{{ formatar(b.limite) }}</span> este mês
                  <span class="text-amber-500">({{ Math.round((b.gastoAtual/b.limite)*100) }}%)</span>
                </p>
                <div class="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div class="h-full rounded-full bg-amber-500 transition-all duration-700"
                    :style="{width: Math.min((b.gastoAtual/b.limite)*100, 100)+'%'}"></div>
                </div>
              </div>
              <button @click="modalAlertas=true" class="text-gray-600 hover:text-gray-400 text-xs flex-shrink-0">⚙️</button>
            </div>
          </div>
        </div>

        <div v-if="items.itens.filter(i=>i.status==='disponivel').length > 0"
          class="bg-[#13161f] rounded-2xl border border-amber-500/20 overflow-hidden">
          <div class="px-4 py-3 flex items-center justify-between border-b border-white/5">
            <p class="text-sm font-bold text-amber-400">📦 À venda <span class="text-amber-400/60 font-normal">({{ items.itens.filter(i=>i.status==='disponivel').length }})</span></p>
            <button @click="aba='inventario'" class="text-amber-400 text-xs hover:underline">Ver tudo →</button>
          </div>
          <div class="divide-y divide-white/5">
            <div v-for="item in items.itens.filter(i=>i.status==='disponivel').slice(0,3)" :key="item.id"
              class="flex items-center gap-3 px-4 py-3">
              <span class="text-xl">📦</span>
              <p class="flex-1 text-sm font-medium truncate">{{ item.nome }}</p>
              <div class="flex items-center gap-2">
                <p class="text-amber-400 font-black text-sm tabular-nums">{{ formatar(item.valor) }}</p>
                <button @click="abrirVenda(item)" class="text-xs bg-teal-500/15 text-teal-400 hover:bg-teal-500/25 px-2.5 py-1.5 rounded-xl transition-all font-semibold">Vender</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-show="aba === 'contas'" class="space-y-4">
        <div class="flex items-center justify-between">
          <p class="font-black text-base">🏦 Contas</p>
          <div class="flex items-center gap-2">
            <button @click="abrirTransferenciaStep()"
              class="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5">
              🔄 Transferir
            </button>
            <button @click="modalConta=true" class="bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-teal-500/20">+ Nova Conta</button>
          </div>
        </div>

        <div v-if="accounts.contas.length > 0" class="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-2xl p-4 flex items-center justify-between">
          <p class="text-sm text-teal-300/70">Total consolidado</p>
          <p class="font-black text-xl text-teal-400 tabular-nums">{{ formatar(accounts.saldoTotal) }}</p>
        </div>

        <div v-if="accounts.contas.length===0" class="bg-[#13161f] rounded-2xl p-12 border border-white/5 text-center">
          <p class="text-4xl mb-3">🏦</p>
          <p class="text-gray-500 text-sm mb-3">Nenhuma conta ainda.</p>
          <button @click="modalConta=true" class="text-teal-400 text-sm hover:underline">Adicionar →</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="conta in accounts.contas" :key="conta.id"
            class="bg-[#13161f] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" :style="{backgroundColor:conta.cor}"></div>
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-black"
                  :style="{background:conta.cor+'18',color:conta.cor}">
                  {{ conta.banco.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="font-bold text-sm">{{ conta.banco }}</p>
                  <p class="text-gray-600 text-xs">Conta bancária</p>
                </div>
              </div>
              <button @click="confirmarDel(conta)"
                class="opacity-40 sm:opacity-0 sm:group-hover:opacity-100 text-gray-700 hover:text-red-400 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-all text-sm">✕</button>
            </div>
            <p class="text-3xl font-black tabular-nums" :style="{color:conta.cor}">{{ formatar(conta.saldo) }}</p>
            <div class="mt-4">
              <div class="flex justify-between text-xs text-gray-600 mb-1.5">
                <span>Participação</span>
                <span class="font-semibold">{{ accounts.saldoTotal>0 ? Math.round((conta.saldo/accounts.saldoTotal)*100) : 0 }}%</span>
              </div>
              <div class="h-1.5 rounded-full bg-white/5">
                <div class="h-1.5 rounded-full transition-all duration-700"
                  :style="{width:(accounts.saldoTotal>0?(conta.saldo/accounts.saldoTotal)*100:0)+'%',backgroundColor:conta.cor}"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-show="aba === 'historico'" class="space-y-4">
        <div class="flex bg-[#13161f] border border-white/5 rounded-2xl p-1 gap-1">
          <button @click="subAbaHistorico='lancamentos'"
            :class="subAbaHistorico==='lancamentos'?'bg-teal-500 text-white shadow':'text-gray-500 hover:text-white'"
            class="flex-1 py-2.5 rounded-xl text-xs font-black transition-all">
            📋 Lançamentos
          </button>
          <button @click="subAbaHistorico='metricas'"
            :class="subAbaHistorico==='metricas'?'bg-violet-600 text-white shadow shadow-violet-500/20':'text-gray-500 hover:text-white'"
            class="flex-1 py-2.5 rounded-xl text-xs font-black transition-all">
            📊 Métricas
          </button>
        </div>

        <div v-show="subAbaHistorico==='lancamentos'" class="space-y-4">
          <div class="flex bg-[#13161f] border border-white/5 rounded-2xl p-1 gap-1">
            <button v-for="f in filtros" :key="f.val" @click="filtroAtivo=f.val"
              :class="filtroAtivo===f.val?'bg-teal-500 text-white shadow':'text-gray-500 hover:text-white'"
              class="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all">
              {{ f.label }}
            </button>
          </div>
          <div class="flex items-center justify-between bg-[#13161f] border border-white/5 rounded-2xl px-4 py-3">
            <span class="text-xs text-gray-500">
              {{ filtroAtivo==='todos'?'Todas as movimentações':filtroAtivo==='receita'?'Entradas':'Saídas' }}
              <span class="text-gray-700 ml-1">({{ transacoesFiltradas.length }})</span>
            </span>
            <span class="font-black text-sm tabular-nums"
              :class="filtroAtivo==='despesa'?'text-red-400':filtroAtivo==='receita'?'text-green-400':'text-teal-400'">
              {{ filtroAtivo==='todos'?formatar(balanco):filtroAtivo==='receita'?formatar(totalEntradas):formatar(totalSaidas) }}
            </span>
          </div>
          <div v-if="transacoesFiltradas.length===0" class="bg-[#13161f] rounded-2xl p-12 border border-white/5 text-center">
            <p class="text-4xl mb-2">📭</p>
            <p class="text-gray-500 text-sm">Nenhum lançamento ainda.</p>
            <button @click="modalLancamento=true" class="mt-3 text-teal-400 text-sm font-semibold hover:underline">+ Criar lançamento</button>
          </div>
          <div class="bg-[#13161f] rounded-2xl border border-white/5 overflow-hidden">
            <div v-for="(t,i) in transacoesFiltradas" :key="t.id"
              :class="i>0?'border-t border-white/5':''"
              class="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-all group">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                :class="t.tipo==='receita'?'bg-green-500/15':'bg-red-500/15'">
                {{ emojiCat[t.categoria]||(t.tipo==='receita'?'💚':'🔴') }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ t.descricao }}</p>
                <p class="text-gray-600 text-xs">{{ t.Account?.banco || t.Account?.nome }} • {{ fmtData(t.data) }}</p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <p :class="t.tipo==='receita'?'text-green-400':'text-red-400'" class="text-sm font-black tabular-nums">
                  {{ t.tipo==='receita'?'+':'-' }}{{ formatar(t.valor) }}
                </p>
                <button @click="abrirEditar(t)"
                  class="opacity-40 sm:opacity-0 sm:group-hover:opacity-100 text-gray-700 hover:text-teal-400 w-7 h-7 flex items-center justify-center rounded-xl hover:bg-teal-500/10 transition-all text-sm">✏️</button>
                <button @click="tx.deletar(t.id).then(()=>mostrarToast('🗑️ Removido'))"
                  class="opacity-40 sm:opacity-0 sm:group-hover:opacity-100 text-gray-700 hover:text-red-400 w-7 h-7 flex items-center justify-center rounded-xl hover:bg-red-500/10 transition-all text-sm">✕</button>
              </div>
            </div>
          </div>
        </div>

        <div v-show="subAbaHistorico==='metricas'" class="space-y-5">
          <div class="flex bg-[#13161f] border border-white/5 rounded-2xl p-1 gap-1">
            <button v-for="p in periodos" :key="p.val" @click="periodoMetricas=p.val"
              :class="periodoMetricas===p.val?'bg-violet-600 text-white shadow shadow-violet-500/20':'text-gray-500 hover:text-white'"
              class="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all">
              {{ p.label }}
            </button>
          </div>
          <div class="flex items-center gap-2 px-1">
            <div class="w-2 h-2 rounded-full bg-violet-500"></div>
            <p class="text-sm font-bold text-gray-300 capitalize">{{ labelPeriodo }}</p>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-[#13161f] border border-red-500/20 rounded-2xl p-4 text-center">
              <div class="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center text-base mx-auto mb-2">⬇️</div>
              <p class="text-xs text-gray-600 mb-1">Gasto</p>
              <p class="font-black text-red-400 tabular-nums text-sm">{{ formatar(totalGastoPeriodo) }}</p>
            </div>
            <div class="bg-[#13161f] border border-green-500/20 rounded-2xl p-4 text-center">
              <div class="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center text-base mx-auto mb-2">⬆️</div>
              <p class="text-xs text-gray-600 mb-1">Recebido</p>
              <p class="font-black text-green-400 tabular-nums text-sm">{{ formatar(totalRecebPeriodo) }}</p>
            </div>
            <div class="bg-[#13161f] border border-violet-500/20 rounded-2xl p-4 text-center">
              <div class="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center text-base mx-auto mb-2">💹</div>
              <p class="text-xs text-gray-600 mb-1">Economizado</p>
              <p class="font-black tabular-nums text-sm" :class="taxaEconomia>0?'text-violet-400':'text-gray-600'">{{ taxaEconomia }}%</p>
            </div>
          </div>
          <div v-if="gastosPorCat.length > 0" class="bg-[#13161f] border border-white/5 rounded-2xl p-5 space-y-5">
            <p class="text-xs font-black text-gray-500 uppercase tracking-widest">⬇️ Gastos por categoria</p>
            <div class="flex items-center gap-5">
              <div class="relative flex-shrink-0">
                <svg viewBox="0 0 120 120" class="w-32 h-32 -rotate-90">
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#ffffff08" stroke-width="14"/>
                  <circle v-for="(seg,i) in donutDespesas" :key="i" cx="60" cy="60" r="45" fill="none"
                    :stroke="seg.cor" stroke-width="14" stroke-linecap="butt"
                    :stroke-dasharray="`${seg.dash - 2} ${CIRCUMFERENCE - seg.dash + 2}`"
                    :stroke-dashoffset="-(seg.offset)"
                    style="transition:stroke-dasharray .6s ease,stroke-dashoffset .6s ease"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <p class="text-xs text-gray-600">Total</p>
                  <p class="font-black text-white text-xs tabular-nums leading-tight">{{ formatar(totalGastoPeriodo) }}</p>
                </div>
              </div>
              <div class="flex-1 space-y-2 min-w-0">
                <div v-for="item in gastosPorCat.slice(0,4)" :key="item.cat" class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{backgroundColor:item.cor}"></div>
                  <p class="text-xs text-gray-400 truncate flex-1">{{ item.label }}</p>
                  <p class="text-xs font-black tabular-nums flex-shrink-0" :style="{color:item.cor}">{{ item.pct }}%</p>
                </div>
                <p v-if="gastosPorCat.length>4" class="text-xs text-gray-700 pl-4">+{{ gastosPorCat.length-4 }} mais abaixo</p>
              </div>
            </div>
            <div class="space-y-3">
              <div v-for="item in gastosPorCat" :key="item.cat" class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-base">{{ item.emoji }}</span>
                    <span class="text-sm font-semibold">{{ item.label }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-gray-500 tabular-nums">{{ formatar(item.valor) }}</span>
                    <span class="text-sm font-black tabular-nums w-10 text-right" :style="{color:item.cor}">{{ item.pct }}%</span>
                  </div>
                </div>
                <div class="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div class="h-2 rounded-full transition-all duration-700"
                    :style="{width:item.pct+'%',backgroundColor:item.cor,boxShadow:`0 0 8px ${item.cor}60`}"></div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="receitasPorCat.length > 0" class="bg-[#13161f] border border-white/5 rounded-2xl p-5 space-y-5">
            <p class="text-xs font-black text-gray-500 uppercase tracking-widest">⬆️ Receitas por categoria</p>
            <div class="flex items-center gap-5">
              <div class="relative flex-shrink-0">
                <svg viewBox="0 0 120 120" class="w-32 h-32 -rotate-90">
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#ffffff08" stroke-width="14"/>
                  <circle v-for="(seg,i) in donutReceitas" :key="i" cx="60" cy="60" r="45" fill="none"
                    :stroke="seg.cor" stroke-width="14" stroke-linecap="butt"
                    :stroke-dasharray="`${seg.dash - 2} ${CIRCUMFERENCE - seg.dash + 2}`"
                    :stroke-dashoffset="-(seg.offset)"
                    style="transition:stroke-dasharray .6s ease,stroke-dashoffset .6s ease"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <p class="text-xs text-gray-600">Total</p>
                  <p class="font-black text-white text-xs tabular-nums leading-tight">{{ formatar(totalRecebPeriodo) }}</p>
                </div>
              </div>
              <div class="flex-1 space-y-2 min-w-0">
                <div v-for="item in receitasPorCat.slice(0,4)" :key="item.cat" class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{backgroundColor:item.cor}"></div>
                  <p class="text-xs text-gray-400 truncate flex-1">{{ item.label }}</p>
                  <p class="text-xs font-black tabular-nums flex-shrink-0" :style="{color:item.cor}">{{ item.pct }}%</p>
                </div>
              </div>
            </div>
            <div class="space-y-3">
              <div v-for="item in receitasPorCat" :key="item.cat" class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-base">{{ item.emoji }}</span>
                    <span class="text-sm font-semibold">{{ item.label }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-gray-500 tabular-nums">{{ formatar(item.valor) }}</span>
                    <span class="text-sm font-black tabular-nums w-10 text-right" :style="{color:item.cor}">{{ item.pct }}%</span>
                  </div>
                </div>
                <div class="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div class="h-2 rounded-full transition-all duration-700"
                    :style="{width:item.pct+'%',backgroundColor:item.cor,boxShadow:`0 0 8px ${item.cor}60`}"></div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="txPeriodo.length===0" class="bg-[#13161f] border border-dashed border-white/10 rounded-2xl py-14 text-center">
            <p class="text-4xl mb-2">📊</p>
            <p class="text-gray-500 text-sm mb-1">Sem dados para este período</p>
            <button @click="modalLancamento=true" class="mt-2 text-teal-400 text-sm hover:underline">+ Criar lançamento</button>
          </div>
        </div>
      </div>

      <div v-show="aba === 'metricas'"></div>

      <div v-show="aba === 'investimentos'"></div>

    </main>

    <!-- ── BOTTOM NAV (mobile) ── -->
    <nav class="fixed bottom-0 left-0 right-0 lg:hidden bg-[#0e1017]/96 backdrop-blur-xl border-t border-white/5 z-40">
      <div class="flex items-center justify-around px-1 py-2 max-w-sm mx-auto" style="padding-bottom: max(8px, env(safe-area-inset-bottom))">
        <button v-for="item in navItems.slice(0,2)" :key="item.val" @click="aba = item.val"
          :class="aba === item.val ? 'text-teal-400' : 'text-gray-600 hover:text-gray-400'"
          class="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[52px]">
          <span class="text-xl leading-none">{{ item.icon }}</span>
          <span class="text-[10px] font-semibold">{{ item.label }}</span>
        </button>

        <!-- FAB central -->
        <button @click="modalLancamento = true; passoLancamento = 1"
          class="flex flex-col items-center gap-0.5 -mt-5 px-1">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-teal-500/40 active:scale-95 transition-transform">
            <span class="text-2xl leading-none">⚡</span>
          </div>
          <span class="text-[10px] font-semibold text-teal-400 mt-0.5">Lançar</span>
        </button>

        <button v-for="item in navItems.slice(2,4)" :key="item.val" @click="aba = item.val"
          :class="aba === item.val ? 'text-teal-400' : 'text-gray-600 hover:text-gray-400'"
          class="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[52px]">
          <span class="text-xl leading-none">{{ item.icon }}</span>
          <span class="text-[10px] font-semibold">{{ item.label }}</span>
        </button>
      </div>
    </nav>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- MODAL LANÇAMENTO — STEP BY STEP                            -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal-slide">
        <div v-if="modalLancamento"
          style="position:fixed;top:0;left:0;right:0;height:100dvh;z-index:9999;background:rgba(0,0,0,0.82);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;"
          @click.self="fecharLancamentoStep">

          <div class="bg-[#13161f] border border-white/10 rounded-3xl w-full sm:max-w-md shadow-2xl overflow-hidden flex flex-col" style="max-height:90dvh;">


            <!-- Header -->
            <div class="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
              <div class="flex items-center gap-2.5">
                <button v-if="passoLancamento > 1" @click="passoLancamento--"
                  class="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-gray-400 hover:text-white text-base font-bold transition-all flex-shrink-0">
                  ‹
                </button>
                <div>
                  <h3 class="font-black text-sm leading-tight">⚡ Lançamento Rápido</h3>
                  <p class="text-[10px] text-gray-500 leading-tight mt-0.5">
                    {{ passoLancamento === 1 ? 'Tipo' : passoLancamento === 2 ? 'Categoria' : passoLancamento === 3 ? 'Valor' : 'Conta' }}
                    · passo {{ passoLancamento }} de {{ accounts.contas.length > 1 ? 4 : 3 }}
                  </p>
                </div>
              </div>
              <button @click="fecharLancamentoStep"
                class="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-all flex-shrink-0">
                <span class="text-xs font-black">✕</span>
              </button>
            </div>

            <!-- Progress -->
            <div class="h-[2px] bg-white/5 flex-shrink-0">
              <div class="h-full transition-all duration-500 rounded-full"
                :class="formTx.tipo === 'receita' ? 'bg-emerald-500' : 'bg-red-500'"
                :style="{width: (passoLancamento / (accounts.contas.length > 1 ? 4 : 3) * 100)+'%'}"></div>
            </div>

            <div class="overflow-y-auto max-h-[75dvh]">

              <!-- PASSO 1: TIPO -->
              <Transition name="step-fade" mode="out-in">
              <div v-if="passoLancamento === 1" key="p1" class="p-5 space-y-3">
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest pb-1">O que deseja registrar?</p>
                <button @click="selecionarTipoLancamento('receita')"
                  class="w-full flex items-center gap-4 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/6 hover:bg-emerald-500/12 active:scale-[0.98] transition-all">
                  <div class="w-14 h-14 rounded-2xl bg-emerald-500/12 flex items-center justify-center text-3xl flex-shrink-0">⬆️</div>
                  <div class="text-left">
                    <p class="font-black text-emerald-400 text-base">Entrada</p>
                    <p class="text-xs text-gray-500 mt-0.5">Salário, freelance, presente...</p>
                  </div>
                  <span class="ml-auto text-gray-600 text-xl font-bold">›</span>
                </button>
                <button @click="selecionarTipoLancamento('despesa')"
                  class="w-full flex items-center gap-4 p-4 rounded-2xl border border-red-500/20 bg-red-500/6 hover:bg-red-500/12 active:scale-[0.98] transition-all">
                  <div class="w-14 h-14 rounded-2xl bg-red-500/12 flex items-center justify-center text-3xl flex-shrink-0">⬇️</div>
                  <div class="text-left">
                    <p class="font-black text-red-400 text-base">Saída</p>
                    <p class="text-xs text-gray-500 mt-0.5">Mercado, contas, lazer...</p>
                  </div>
                  <span class="ml-auto text-gray-600 text-xl font-bold">›</span>
                </button>
              </div>
              </Transition>

              <!-- PASSO 2: CATEGORIA -->
              <Transition name="step-fade" mode="out-in">
              <div v-if="passoLancamento === 2" key="p2" class="p-5">
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-xl">{{ formTx.tipo === 'receita' ? '⬆️' : '⬇️' }}</span>
                  <p class="text-xs text-gray-500 font-bold uppercase tracking-widest">
                    {{ formTx.tipo === 'receita' ? 'Categoria da entrada' : 'Categoria da saída' }}
                  </p>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="cat in categoriasAtuais" :key="cat.id"
                    @click="selecionarCategoriaStep(cat.id)"
                    :class="formTx.categoria === cat.id
                      ? (formTx.tipo==='receita'
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-white'
                          : 'border-red-500/60 bg-red-500/15 text-white')
                      : 'border-white/8 bg-white/3 text-gray-400 hover:border-white/15 hover:bg-white/6'"
                    class="flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-[0.94]">
                    <span class="text-2xl leading-none">{{ cat.emoji }}</span>
                    <span class="text-[11px] font-semibold text-center leading-tight">{{ cat.label }}</span>
                  </button>
                </div>
              </div>
              </Transition>

              <!-- PASSO 3: VALOR -->
              <Transition name="step-fade" mode="out-in">
              <div v-if="passoLancamento === 3" key="p3" class="p-5 space-y-4">
                <div class="flex items-center gap-3 bg-white/3 rounded-2xl px-4 py-3">
                  <span class="text-2xl leading-none">{{ emojiCat[formTx.categoria] }}</span>
                  <div>
                    <p class="text-xs text-gray-500 font-semibold uppercase tracking-wider">{{ labelCat[formTx.categoria] }}</p>
                    <p class="text-[10px]" :class="formTx.tipo==='receita'?'text-emerald-400':'text-red-400'">
                      {{ formTx.tipo === 'receita' ? '⬆️ Entrada' : '⬇️ Saída' }}
                    </p>
                  </div>
                </div>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">R$</span>
                  <input ref="inputValor" @input="e => e.target.value = mascaraMoeda(e.target.value)"
                    inputmode="decimal" placeholder="0,00"
                    class="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-4 rounded-2xl outline-none text-2xl font-black text-center placeholder:text-gray-700 transition-all"
                    :class="formTx.tipo==='receita' ? 'focus:border-emerald-500' : 'focus:border-red-500'" />
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="v in valoresRapidos.slice(4)" :key="v.val" @click="setValorRapido(v.val)"
                    class="py-2 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-xs font-bold transition-all active:scale-[0.95]">
                    {{ v.label }}
                  </button>
                </div>
                <input v-model="formTx.descricao" type="text" placeholder="Descrição (opcional)"
                  class="w-full bg-white/5 border border-white/8 text-white px-4 py-3 rounded-2xl outline-none focus:border-white/20 transition-all text-sm placeholder:text-gray-700" />
                <button @click="confirmarValorLancamento"
                  :class="formTx.tipo==='receita'
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
                    : 'bg-red-500 hover:bg-red-600 shadow-red-500/25'"
                  class="w-full py-4 rounded-2xl font-black text-sm text-white shadow-lg transition-all active:scale-[0.98]">
                  {{ accounts.contas.length > 1 ? 'Próximo → Escolher conta' : 'Confirmar Lançamento ✓' }}
                </button>
              </div>
              </Transition>

              <!-- PASSO 4: CONTA -->
              <Transition name="step-fade" mode="out-in">
              <div v-if="passoLancamento === 4" key="p4" class="p-5 space-y-3">
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Qual conta foi usada?</p>
                <button v-for="c in accounts.contas" :key="c.id"
                  @click="formTx.accountId = c.id; criarTransacaoStep()"
                  class="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/6 transition-all active:scale-[0.98]">
                  <div class="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                    :style="{background: c.cor+'20', color: c.cor}">
                    {{ c.banco.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 text-left">
                    <p class="text-sm font-semibold">{{ c.banco }}</p>
                    <p class="text-xs text-gray-500 tabular-nums">{{ formatar(c.saldo) }}</p>
                  </div>
                  <span class="text-gray-600 text-xl font-bold">›</span>
                </button>
              </div>
              </Transition>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- MODAL TRANSFERÊNCIA — STEP BY STEP                         -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal-slide">
        <div v-if="modalTransferencia"
          style="position:fixed;top:0;left:0;right:0;height:100dvh;z-index:9999;background:rgba(0,0,0,0.82);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;"
          @click.self="fecharTransferenciaStep">

          <div class="bg-[#13161f] border border-white/10 rounded-3xl w-full sm:max-w-md shadow-2xl overflow-hidden flex flex-col" style="max-height:90dvh;">


            <!-- Header -->
            <div class="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
              <div class="flex items-center gap-2.5">
                <button v-if="passoTransf > 1" @click="passoTransf--; buscaUsuario=''; usuariosEncontrados=[]"
                  class="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-gray-400 hover:text-white text-base font-bold transition-all flex-shrink-0">
                  ‹
                </button>
                <div>
                  <h3 class="font-black text-sm leading-tight">🔄 Transferência</h3>
                  <p class="text-[10px] text-gray-500 leading-tight mt-0.5">
                    {{ passoTransf === 1 ? 'Para onde?' :
                       passoTransf === 2 && formTransf.tipo === 'propria' ? 'Conta destino' :
                       passoTransf === 2 && formTransf.tipo === 'externo' ? 'Destinatário' :
                       passoTransf === 3 && formTransf.tipo === 'propria' ? 'Valor' :
                       passoTransf === 3 && formTransf.tipo === 'externo' ? 'Conta do destinatário' :
                       passoTransf === 4 && formTransf.tipo === 'propria' ? 'Conta de origem' :
                       passoTransf === 4 && formTransf.tipo === 'externo' ? 'Valor' :
                       'Conta de origem' }}
                    · passo {{ passoTransf }} de {{ formTransf.tipo === 'propria' ? 4 : (passoTransf < 2 ? 5 : 5) }}
                  </p>
                </div>
              </div>
              <button @click="fecharTransferenciaStep"
                class="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-all flex-shrink-0">
                <span class="text-xs font-black">✕</span>
              </button>
            </div>

            <!-- Progress -->
            <div class="h-[2px] bg-white/5 flex-shrink-0">
              <div class="h-full bg-blue-500 transition-all duration-500 rounded-full"
                :style="{width: (passoTransf / (formTransf.tipo === 'propria' ? 4 : 5) * 100)+'%'}"></div>
            </div>

            <div class="overflow-y-auto max-h-[78dvh]">

              <!-- PASSO 1: TIPO DE DESTINO -->
              <Transition name="step-fade" mode="out-in">
              <div v-if="passoTransf === 1" key="t1" class="p-5 space-y-3">
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest pb-1">Para onde deseja transferir?</p>
                <button @click="selecionarTipoTransf('propria')"
                  :disabled="accounts.contas.length < 2"
                  class="w-full flex items-center gap-4 p-4 rounded-2xl border border-teal-500/20 bg-teal-500/6 hover:bg-teal-500/12 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  <div class="w-14 h-14 rounded-2xl bg-teal-500/12 flex items-center justify-center text-3xl flex-shrink-0">🔄</div>
                  <div class="text-left">
                    <p class="font-black text-teal-400 text-base">Minha conta</p>
                    <p class="text-xs text-gray-500 mt-0.5">Transferir entre suas próprias contas</p>
                    <p v-if="accounts.contas.length < 2" class="text-[10px] text-yellow-500 mt-0.5">Requer ao menos 2 contas</p>
                  </div>
                  <span class="ml-auto text-gray-600 text-xl font-bold">›</span>
                </button>
                <button @click="selecionarTipoTransf('externo')"
                  class="w-full flex items-center gap-4 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/6 hover:bg-blue-500/12 active:scale-[0.98] transition-all">
                  <div class="w-14 h-14 rounded-2xl bg-blue-500/12 flex items-center justify-center text-3xl flex-shrink-0">👤</div>
                  <div class="text-left">
                    <p class="font-black text-blue-400 text-base">Outro usuário</p>
                    <p class="text-xs text-gray-500 mt-0.5">Enviar para conta de outra pessoa</p>
                  </div>
                  <span class="ml-auto text-gray-600 text-xl font-bold">›</span>
                </button>
              </div>
              </Transition>

              <!-- PASSO 2 (propria): CONTA DESTINO -->
              <Transition name="step-fade" mode="out-in">
              <div v-if="passoTransf === 2 && formTransf.tipo === 'propria'" key="t2p" class="p-5 space-y-2">
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4">Para qual conta?</p>
                <button v-for="c in accounts.contas" :key="c.id"
                  @click="selecionarContaDestinoStep(c.id)"
                  class="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/8 bg-white/3 hover:border-blue-500/30 hover:bg-blue-500/6 transition-all active:scale-[0.98]">
                  <div class="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                    :style="{background: c.cor+'20', color: c.cor}">
                    {{ c.banco.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 text-left">
                    <p class="text-sm font-semibold">{{ c.banco }}</p>
                    <p class="text-xs text-gray-500 tabular-nums">{{ formatar(c.saldo) }}</p>
                  </div>
                  <span class="text-gray-600 text-xl font-bold">›</span>
                </button>
              </div>
              </Transition>

              <!-- PASSO 2 (externo): SELECIONAR USUÁRIO -->
              <Transition name="step-fade" mode="out-in">
              <div v-if="passoTransf === 2 && formTransf.tipo === 'externo'" key="t2e" class="p-5 space-y-3">
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Selecionar destinatário</p>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
                  <input v-model="buscaUsuario" @input="debounceUsuarios" type="text"
                    placeholder="Buscar por nome ou e-mail..."
                    class="w-full bg-white/5 border border-white/10 pl-9 pr-4 py-3 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm placeholder:text-gray-700" />
                  <div v-if="buscandoUsuarios || buscandoRecentes"
                    class="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                </div>
                <div class="space-y-1.5">
                  <p v-if="!buscaUsuario && usuariosDestino.length" class="text-[10px] text-gray-600 font-bold uppercase tracking-widest px-1">Usuários disponíveis</p>
                  <button v-for="u in usuariosDestino" :key="u.id"
                    @click="selecionarUsuarioStep(u)"
                    :class="formTransf.usuarioDestinoId === u.id
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5'"
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all active:scale-[0.98]">
                    <div class="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center text-sm font-black text-blue-300 flex-shrink-0">
                      {{ u.nome.charAt(0).toUpperCase() }}
                    </div>
                    <div class="flex-1 text-left min-w-0">
                      <p class="text-sm font-semibold truncate">{{ u.nome }}</p>
                      <p class="text-xs text-gray-500 truncate">{{ u.email }}</p>
                    </div>
                    <span v-if="formTransf.usuarioDestinoId === u.id" class="text-blue-400 font-black text-sm flex-shrink-0">✓</span>
                    <span v-else class="text-gray-600 text-xl font-bold flex-shrink-0">›</span>
                  </button>
                  <div v-if="buscaUsuario.length >= 2 && !buscandoUsuarios && !usuariosDestino.length"
                    class="py-8 text-center text-gray-600 text-sm">
                    Nenhum usuário encontrado
                  </div>
                  <div v-if="!buscaUsuario && !buscandoRecentes && !usuariosDestino.length"
                    class="py-8 text-center text-gray-600 text-sm">
                    Digite para buscar usuários
                  </div>
                </div>
              </div>
              </Transition>

              <!-- PASSO 3 (propria): VALOR -->
              <Transition name="step-fade" mode="out-in">
              <div v-if="passoTransf === 3 && formTransf.tipo === 'propria'" key="t3p" class="p-5 space-y-4">
                <div class="flex items-center gap-3 bg-white/3 rounded-2xl px-4 py-3">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                    :style="{background: (accounts.contas.find(c=>c.id===formTransf.contaDestinoId)?.cor||'#3b82f6')+'20', color: accounts.contas.find(c=>c.id===formTransf.contaDestinoId)?.cor||'#3b82f6'}">
                    {{ (accounts.contas.find(c=>c.id===formTransf.contaDestinoId)?.banco||'?').charAt(0) }}
                  </div>
                  <div>
                    <p class="text-[10px] text-gray-500">Conta destino</p>
                    <p class="text-sm font-semibold">{{ accounts.contas.find(c=>c.id===formTransf.contaDestinoId)?.banco }}</p>
                  </div>
                </div>
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest">Qual valor?</p>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">R$</span>
                  <input ref="inputValorTransf" @input="e => e.target.value = mascaraMoeda(e.target.value)"
                    inputmode="decimal" placeholder="0,00"
                    class="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-4 rounded-2xl outline-none focus:border-blue-500 transition-all text-2xl font-black text-center placeholder:text-gray-700" />
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="v in valoresRapidosTransf" :key="v.val" @click="setValorRapidoTransf(v.val)"
                    class="py-2 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-xs font-bold transition-all active:scale-[0.95]">
                    {{ v.label }}
                  </button>
                </div>
                <button @click="confirmarValorTransf"
                  class="w-full py-4 rounded-2xl font-black text-sm text-white bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
                  Próximo → Conta de origem
                </button>
              </div>
              </Transition>

              <!-- PASSO 3 (externo): CONTA DO DESTINATÁRIO -->
              <Transition name="step-fade" mode="out-in">
              <div v-if="passoTransf === 3 && formTransf.tipo === 'externo'" key="t3e" class="p-5 space-y-2">
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4">Conta do destinatário</p>
                <div v-if="!contasUsuarioDestino.length" class="py-8 flex flex-col items-center gap-2 text-gray-600 text-sm">
                  <div class="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                  Carregando contas...
                </div>
                <button v-for="c in contasUsuarioDestino" :key="c.id"
                  @click="selecionarContaExternaStep(c.id)"
                  :class="formTransf.contaExternaId === c.id
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-white/8 bg-white/3 hover:border-white/15'"
                  class="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98]">
                  <div class="w-11 h-11 rounded-xl bg-blue-500/12 flex items-center justify-center text-sm font-black text-blue-400 flex-shrink-0">
                    {{ c.banco.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 text-left">
                    <p class="text-sm font-semibold">{{ c.banco }}</p>
                    <p class="text-xs text-gray-500">{{ c.nome }}</p>
                  </div>
                  <span v-if="formTransf.contaExternaId === c.id" class="text-blue-400 font-black text-sm flex-shrink-0">✓</span>
                  <span v-else class="text-gray-600 text-xl font-bold flex-shrink-0">›</span>
                </button>
              </div>
              </Transition>

              <!-- PASSO 4 (externo): VALOR -->
              <Transition name="step-fade" mode="out-in">
              <div v-if="passoTransf === 4 && formTransf.tipo === 'externo'" key="t4e" class="p-5 space-y-4">
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest">Qual valor deseja enviar?</p>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">R$</span>
                  <input ref="inputValorTransf" @input="e => e.target.value = mascaraMoeda(e.target.value)"
                    inputmode="decimal" placeholder="0,00"
                    class="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-4 rounded-2xl outline-none focus:border-blue-500 transition-all text-2xl font-black text-center placeholder:text-gray-700" />
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="v in valoresRapidosTransf" :key="v.val" @click="setValorRapidoTransf(v.val)"
                    class="py-2 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-xs font-bold transition-all active:scale-[0.95]">
                    {{ v.label }}
                  </button>
                </div>
                <input v-model="formTransf.descricao" type="text" placeholder="Descrição (opcional)"
                  class="w-full bg-white/5 border border-white/8 text-white px-4 py-3 rounded-2xl outline-none focus:border-white/20 transition-all text-sm placeholder:text-gray-700" />
                <button @click="confirmarValorTransf"
                  class="w-full py-4 rounded-2xl font-black text-sm text-white bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
                  Próximo → Conta de origem
                </button>
              </div>
              </Transition>

              <!-- PASSO 4 (propria) / PASSO 5 (externo): CONTA ORIGEM -->
              <Transition name="step-fade" mode="out-in">
              <div v-if="(passoTransf === 4 && formTransf.tipo === 'propria') || (passoTransf === 5 && formTransf.tipo === 'externo')" key="torigem" class="p-5 space-y-2">
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4">De qual conta vai sair?</p>
                <button v-for="c in contasOrigemTransf" :key="c.id"
                  @click="formTransf.contaOrigemId = c.id; realizarTransferenciaStep()"
                  :disabled="loadingTransferencia"
                  class="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/8 bg-white/3 hover:border-teal-500/30 hover:bg-teal-500/6 transition-all active:scale-[0.98] disabled:opacity-60">
                  <div class="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                    :style="{background: c.cor+'20', color: c.cor}">
                    {{ c.banco.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 text-left">
                    <p class="text-sm font-semibold">{{ c.banco }}</p>
                    <p class="text-xs text-gray-500 tabular-nums">{{ formatar(c.saldo) }}</p>
                  </div>
                  <div v-if="loadingTransferencia && formTransf.contaOrigemId === c.id"
                    class="w-5 h-5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin flex-shrink-0"></div>
                  <span v-else class="text-gray-600 text-xl font-bold flex-shrink-0">›</span>
                </button>
              </div>
              </Transition>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    
    <!-- MODAL CONTA -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div v-if="modalConta" style="position:fixed;top:0;left:0;right:0;height:100dvh;z-index:9999;background:rgba(0,0,0,0.8);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;">
          <div class="bg-[#13161f] border border-white/10 rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl">
            <div class="flex items-center justify-between mb-5">
              <h3 class="font-black text-base">🏦 Nova Conta</h3>
              <button @click="modalConta=false" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-gray-400 hover:text-white transition-all">✕</button>
            </div>
            <div class="space-y-4">
              <div>
                <label class="text-xs text-gray-500 mb-2 block font-semibold uppercase tracking-wider">Banco</label>
                <div class="grid grid-cols-3 gap-2 mb-2">
                  <button type="button" v-for="b in bancosRapidos" :key="b" @click="formConta.banco=b"
                    :class="formConta.banco===b?'border-teal-500 bg-teal-500/15 text-teal-400':'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'"
                    class="py-2.5 rounded-xl border text-xs font-bold transition-all">{{ b }}</button>
                </div>
                <input v-model="formConta.banco" type="text" placeholder="Ou digite o banco..."
                  class="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-2xl outline-none focus:border-teal-500 transition-all text-sm placeholder:text-gray-700" />
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block font-semibold uppercase tracking-wider">Saldo atual</label>
                <input ref="inputSaldo" @input="mascaraMoeda" type="text" inputmode="numeric" placeholder="R$ 0,00"
                  class="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-2xl outline-none focus:border-teal-500 transition-all font-mono text-2xl font-black placeholder:text-gray-700" />
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-2 block font-semibold uppercase tracking-wider">Cor</label>
                <div class="flex gap-2 flex-wrap">
                  <button type="button" v-for="cor in cores" :key="cor" @click="formConta.cor=cor"
                    class="w-10 h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95"
                    :style="{backgroundColor:cor}"
                    :class="formConta.cor===cor?'border-white scale-110 shadow-lg':'border-transparent'" />
                </div>
              </div>
              <div class="flex gap-3 pt-1">
                <button type="button" @click="modalConta=false" class="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-2xl text-sm font-semibold transition-all">Cancelar</button>
                <button type="button" @click="criarConta" :disabled="loadingConta"
                  class="flex-1 bg-teal-500 hover:bg-teal-600 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                  <svg v-if="loadingConta" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  <span>{{ loadingConta ? 'Salvando...' : 'Salvar' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    
    <!-- MODAL ITEM -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div v-if="modalItem" style="position:fixed;top:0;left:0;right:0;height:100dvh;z-index:9999;background:rgba(0,0,0,0.8);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;">
          <div class="bg-[#13161f] border border-white/10 rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl">
            <div class="flex items-center justify-between mb-5">
              <h3 class="font-black text-base">{{ subAbaInv==='venda'?'📦 Item à Venda':'🛒 Registrar Compra' }}</h3>
              <button @click="modalItem=false" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-gray-400 hover:text-white transition-all">✕</button>
            </div>
            <div class="space-y-3">
              <div>
                <label class="text-xs text-gray-500 mb-1 block font-semibold uppercase tracking-wider">Nome do item</label>
                <input v-model="formItem.nome" type="text"
                  :placeholder="subAbaInv==='venda'?'Ex: Notebook, PS5...':'Ex: Teclado, Monitor...'"
                  class="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-2xl outline-none focus:border-teal-500 transition-all text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block font-semibold uppercase tracking-wider">Descrição <span class="text-gray-700 normal-case">(opcional)</span></label>
                <input v-model="formItem.descricao" type="text" placeholder="Condição, detalhes..."
                  class="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-2xl outline-none focus:border-teal-500 transition-all text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block font-semibold uppercase tracking-wider">{{ subAbaInv==='venda'?'Preço de venda':'Valor pago' }}</label>
                <input ref="inputValorItem" @input="mascaraMoeda" type="text" inputmode="numeric" placeholder="R$ 0,00"
                  class="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-2xl outline-none focus:border-teal-500 transition-all font-mono text-2xl font-black placeholder:text-gray-700" />
              </div>
              <div v-if="subAbaInv==='compra'">
                <label class="text-xs text-gray-500 mb-2 block font-semibold uppercase tracking-wider">Descontar de qual conta</label>
                <div class="flex gap-2 flex-wrap">
                  <button type="button" v-for="c in accounts.contas" :key="c.id" @click="formItem.accountId=c.id"
                    :class="formItem.accountId===c.id?'border-blue-500 bg-blue-500/15 text-blue-400':'border-white/10 bg-white/5 text-gray-400'"
                    class="px-3 py-2 rounded-xl border text-sm font-semibold transition-all">{{ c.banco }}</button>
                </div>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" @click="modalItem=false" class="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-2xl text-sm font-semibold transition-all">Cancelar</button>
                <button type="button" @click="criarItem"
                  :class="subAbaInv==='venda'?'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20':'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'"
                  class="flex-1 py-3 rounded-2xl font-black text-sm transition-all shadow-lg">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    
    <!-- MODAL ALERTAS DE ORÇAMENTO -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div v-if="modalAlertas" style="position:fixed;top:0;left:0;right:0;height:100dvh;z-index:9999;background:rgba(0,0,0,0.8);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;">
          <div class="bg-[#13161f] border border-white/10 rounded-3xl w-full sm:max-w-md shadow-2xl" style="max-height:90dvh;overflow-y:auto;">
            <div class="flex justify-center pt-3 pb-1 sm:hidden sticky top-0 bg-[#13161f] z-10">
              <div class="w-10 h-1 rounded-full bg-white/20"></div>
            </div>
            <div class="flex items-center justify-between px-5 py-3 sticky top-4 sm:static bg-[#13161f] z-10 border-b border-white/5">
              <h3 class="font-black text-base">🔔 Alertas de Orçamento</h3>
              <button @click="modalAlertas=false" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-gray-400 hover:text-white transition-all">✕</button>
            </div>

            <!-- Form: novo alerta -->
            <div class="px-5 pt-4 pb-3 border-b border-white/5">
              <p class="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">Definir limite por categoria</p>

              <!-- Seleção de categoria -->
              <div class="grid grid-cols-4 gap-2 mb-3">
                <button v-for="cat in categoriasSaida" :key="cat.id"
                  @click="formAlerta.categoria=cat.id"
                  :class="formAlerta.categoria===cat.id?'border-amber-500 bg-amber-500/15':'border-white/8 bg-white/3 hover:border-white/15'"
                  class="flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all active:scale-[0.97]">
                  <span class="text-base">{{ cat.emoji }}</span>
                  <span class="text-[10px] text-gray-400 font-semibold leading-tight text-center">{{ cat.label }}</span>
                </button>
              </div>

              <!-- Valor limite -->
              <div class="flex gap-2 items-center">
                <input ref="inputValorAlerta" @input="mascaraMoeda" type="text" inputmode="numeric"
                  placeholder="R$ 0,00"
                  class="flex-1 bg-white/5 border border-white/10 text-amber-400 text-xl font-black text-center px-4 py-3 rounded-2xl outline-none focus:border-amber-500 transition-all font-mono placeholder:text-gray-700" />
                <button @click="salvarAlerta"
                  :disabled="loadingAlerta"
                  class="bg-amber-500 hover:bg-amber-600 text-white font-black px-5 py-3 rounded-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 flex-shrink-0">
                  <svg v-if="loadingAlerta" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  <span v-if="!loadingAlerta">{{ budgets.budgets.find(b=>b.categoria===formAlerta.categoria) ? 'Atualizar' : 'Criar' }}</span>
                  <span v-else>...</span>
                </button>
              </div>
              <p v-if="formAlerta.categoria" class="mt-2 text-xs text-gray-600">
                Alerta para: <span class="text-amber-400 font-semibold">{{ labelCat[formAlerta.categoria] }}</span>
                <span v-if="budgets.budgets.find(b=>b.categoria===formAlerta.categoria)" class="text-gray-600">
                  — limite atual: {{ formatar(budgets.budgets.find(b=>b.categoria===formAlerta.categoria)?.limite || 0) }}
                </span>
              </p>
            </div>

            <!-- Lista de alertas configurados -->
            <div class="px-5 py-4">
              <p class="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">
                Alertas configurados
                <span class="text-gray-700 ml-1">({{ budgets.budgets.length }})</span>
              </p>

              <div v-if="budgets.budgets.length === 0" class="py-8 text-center">
                <p class="text-3xl mb-2">🔕</p>
                <p class="text-gray-600 text-sm">Nenhum alerta configurado ainda.</p>
              </div>

              <div class="space-y-2">
                <div v-for="b in budgets.budgets" :key="b.id"
                  class="flex items-center gap-3 bg-white/3 border border-white/8 rounded-2xl px-4 py-3">

                  <!-- Ícone e nome -->
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                    :class="b.gastoAtual >= b.limite ? 'bg-red-500/15' : b.gastoAtual >= b.limite*0.7 ? 'bg-amber-500/15' : 'bg-teal-500/15'">
                    {{ emojiCat[b.categoria] || '📦' }}
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <p class="text-sm font-semibold">{{ labelCat[b.categoria] || b.categoria }}</p>
                      <span class="text-xs tabular-nums font-black"
                        :class="b.gastoAtual >= b.limite ? 'text-red-400' : b.gastoAtual >= b.limite*0.7 ? 'text-amber-400' : 'text-teal-400'">
                        {{ formatar(b.gastoAtual) }} / {{ formatar(b.limite) }}
                      </span>
                    </div>
                    <!-- Barra de progresso -->
                    <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-700"
                        :class="b.gastoAtual >= b.limite ? 'bg-red-500' : b.gastoAtual >= b.limite*0.7 ? 'bg-amber-500' : 'bg-teal-500'"
                        :style="{width: Math.min((b.gastoAtual/b.limite)*100, 100)+'%'}"></div>
                    </div>
                    <p class="text-xs text-gray-600 mt-0.5 tabular-nums">{{ Math.round((b.gastoAtual/b.limite)*100) }}% do limite</p>
                  </div>

                  <!-- Toggle ativo + Deletar -->
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <button @click="toggleAlerta(b)"
                      :class="b.ativo?'bg-teal-500/20 text-teal-400':'bg-white/5 text-gray-600'"
                      class="w-8 h-8 flex items-center justify-center rounded-xl transition-all text-sm hover:scale-110">
                      {{ b.ativo ? '🔔' : '🔕' }}
                    </button>
                    <button @click="budgets.deletar(b.id).then(()=>mostrarToast('🗑️ Alerta removido'))"
                      class="w-8 h-8 flex items-center justify-center rounded-xl text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm">✕</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="px-5 pb-6">
              <button @click="modalAlertas=false"
                class="w-full bg-white/5 hover:bg-white/10 py-3 rounded-2xl text-sm font-semibold transition-all">
                Fechar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>



    
    <!-- MODAL EDITAR TRANSAÇÃO -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div v-if="modalEditar" style="position:fixed;top:0;left:0;right:0;height:100dvh;z-index:9999;background:rgba(0,0,0,0.8);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;">
          <div class="bg-[#13161f] border border-white/10 rounded-3xl w-full sm:max-w-md shadow-2xl" style="max-height:90dvh;overflow-y:auto;">
            <div class="flex justify-center pt-3 pb-1 sm:hidden sticky top-0 bg-[#13161f] z-10">
              <div class="w-10 h-1 rounded-full bg-white/20"></div>
            </div>
            <div class="flex items-center justify-between px-5 py-3 sticky top-4 sm:static bg-[#13161f] z-10">
              <h3 class="font-black text-base">✏️ Editar Transação</h3>
              <button @click="modalEditar=false" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-gray-400 hover:text-white transition-all">✕</button>
            </div>

            <!-- Tipo -->
            <div class="px-5 mb-4">
              <div class="flex bg-white/5 rounded-2xl p-1 gap-1">
                <button @click="formEditar.tipo='receita'; formEditar.categoria='salario'"
                  :class="formEditar.tipo==='receita'?'bg-green-500 text-white shadow-lg shadow-green-500/20':'text-gray-500 hover:text-gray-300'"
                  class="flex-1 py-3 rounded-xl text-sm font-black transition-all">⬆️ Entrada</button>
                <button @click="formEditar.tipo='despesa'; formEditar.categoria='mercado'"
                  :class="formEditar.tipo==='despesa'?'bg-red-500 text-white shadow-lg shadow-red-500/20':'text-gray-500 hover:text-gray-300'"
                  class="flex-1 py-3 rounded-xl text-sm font-black transition-all">⬇️ Saída</button>
              </div>
            </div>

            <!-- Categorias -->
            <div class="px-5 mb-4">
              <p class="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Categoria</p>
              <div class="grid grid-cols-4 gap-2">
                <button v-for="cat in (formEditar.tipo==='receita' ? categoriasEntrada : categoriasSaida)" :key="cat.id"
                  @click="formEditar.categoria=cat.id"
                  :class="formEditar.categoria===cat.id?'border-teal-500 bg-teal-500/15':'border-white/8 bg-white/3 hover:border-white/15'"
                  class="flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all active:scale-[0.97]">
                  <span class="text-base">{{ cat.emoji }}</span>
                  <span class="text-[10px] text-gray-400 font-semibold">{{ cat.label }}</span>
                </button>
              </div>
            </div>

            <!-- Conta -->
            <div class="px-5 mb-4">
              <p class="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Conta</p>
              <div class="space-y-2">
                <button v-for="c in accounts.contas" :key="c.id"
                  @click="formEditar.accountId=c.id"
                  :class="formEditar.accountId===c.id?'border-teal-500 bg-teal-500/10':'border-white/8 bg-white/3 hover:border-white/15'"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all active:scale-[0.98]">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                    :style="{background: c.cor+'22', color: c.cor}">
                    {{ c.banco.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 text-left">
                    <p class="text-sm font-semibold">{{ c.banco }}</p>
                    <p class="text-xs text-gray-500 tabular-nums">{{ formatar(c.saldo) }}</p>
                  </div>
                  <div v-if="formEditar.accountId===c.id" class="text-teal-400 font-black text-sm">✓</div>
                </button>
              </div>
            </div>

            <!-- Valor -->
            <div class="px-5 mb-3">
              <p class="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Valor</p>
              <input ref="inputValorEditar" @input="mascaraMoeda" type="text" inputmode="numeric"
                placeholder="R$ 0,00"
                class="w-full bg-white/5 border border-white/10 text-teal-400 text-3xl font-black text-center px-4 py-4 rounded-2xl outline-none focus:border-teal-500 transition-all font-mono placeholder:text-gray-700" />
            </div>

            <!-- Descrição -->
            <div class="px-5 mb-3">
              <p class="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Descrição</p>
              <input v-model="formEditar.descricao" type="text" placeholder="Descrição..."
                class="w-full bg-white/5 border border-white/8 text-white px-4 py-3 rounded-2xl outline-none focus:border-teal-500 transition-all text-sm placeholder:text-gray-700" />
            </div>

            <!-- Data -->
            <div class="px-5 mb-5">
              <p class="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Data</p>
              <input v-model="formEditar.data" type="date"
                class="w-full bg-white/5 border border-white/8 text-white px-4 py-3 rounded-2xl outline-none focus:border-teal-500 transition-all text-sm" />
            </div>

            <!-- Salvar -->
            <div class="px-5 pb-6 flex gap-3">
              <button @click="modalEditar=false"
                class="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-sm font-semibold transition-all">
                Cancelar
              </button>
              <button @click="salvarEdicao"
                :disabled="loadingEditar"
                :class="formEditar.tipo==='receita'?'bg-green-500 hover:bg-green-600 shadow-green-500/20':'bg-teal-500 hover:bg-teal-600 shadow-teal-500/20'"
                class="flex-1 py-4 rounded-2xl font-black text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                <svg v-if="loadingEditar" class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                <span v-if="!loadingEditar">✅ Salvar</span>
                <span v-else>Salvando...</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>



  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.slide-up-enter-active, .slide-up-leave-active { transition: transform .35s cubic-bezier(.16,1,.3,1), opacity .35s; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
@media(min-width: 640px) { .slide-up-enter-from, .slide-up-leave-to { transform: scale(.96) translateY(8px); } }

.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.toast-enter-active, .toast-leave-active { transition: opacity .3s, transform .3s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }

.diff-badge-enter-active { transition: opacity .4s, transform .4s cubic-bezier(.16,1,.3,1); }
.diff-badge-leave-active { transition: opacity .6s, transform .6s; }
.diff-badge-enter-from { opacity: 0; transform: translateY(8px) scale(.8); }
.diff-badge-leave-to { opacity: 0; transform: translateY(-12px) scale(.9); }

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

.fade-loading-leave-active { transition: opacity 0.5s ease, transform 0.5s ease; }
.fade-loading-leave-to     { opacity: 0; transform: scale(1.04); }

/* Loading global */
@keyframes vf-spin  { to { transform: rotate(360deg); } }
@keyframes vf-bounce { 0%,80%,100% { transform:translateY(0); } 40% { transform:translateY(-8px); } }
.vf-spin  { animation: vf-spin 0.8s linear infinite; }
.vf-dot   { width:8px; height:8px; border-radius:50%; background:#14b8a6; animation: vf-bounce 1.2s ease-in-out infinite; }
.vf-loading-enter-active { transition: opacity 0.15s ease; }
.vf-loading-leave-active { transition: opacity 0.4s ease; }
.vf-loading-enter-from,
.vf-loading-leave-to     { opacity: 0; }

/* ── Novos transitions ── */
.modal-slide-enter-active,
.modal-slide-leave-active { transition: all 0.32s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-slide-enter-from,
.modal-slide-leave-to    { opacity: 0; transform: translateY(40px); }
.step-fade-enter-active,
.step-fade-leave-active { transition: all 0.18s ease; }
.step-fade-enter-from,
.step-fade-leave-to     { opacity: 0; transform: translateX(10px); }
.toast-slide-enter-active,
.toast-slide-leave-active { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-slide-enter-from   { opacity: 0; transform: translateX(-50%) translateY(-12px); }
.toast-slide-leave-to     { opacity: 0; transform: translateX(-50%) translateY(-8px); }
</style>
