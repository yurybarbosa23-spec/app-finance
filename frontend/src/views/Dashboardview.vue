<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAuthStore }         from '../stores/auth'
import { useAccountsStore }     from '../stores/accounts'
import { useTransactionsStore } from '../stores/transactions'
import { useBudgetsStore }     from '../stores/budgets'
import { useItemsStore }        from '../stores/items'
import { useCurrency }          from '../composables/useCurrency'
import { useParallax }          from '../composables/useParallax'
import api from '../services/api'

const { tilt, glow, globalGlow } = useParallax()
const saudacao = computed(() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' })
const dataHoje = computed(() => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))


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

// ── Finora IA Chat
const showFinoraChat = ref(false)
const finoraInput = ref('')
const finoraMessages = ref([
  { role: 'bot', text: 'Olá! Sou a Finora, sua assistente financeira inteligente. Posso analisar seus gastos, sugerir investimentos ou explicar tendências. Como posso te ajudar hoje?' }
])
async function sendFinoraMessage() {
  const userMsg = finoraInput.value.trim()
  if (!userMsg) return
  finoraMessages.value.push({ role: 'user', text: userMsg })
  finoraInput.value = ''
  
  finoraMessages.value.push({ role: 'bot', text: '', loading: true })
  const botMsgIndex = finoraMessages.value.length - 1
  
  const scrollChat = () => {
    const chatBody = document.querySelector('.finora-chat-body')
    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight
  }
  setTimeout(scrollChat, 50)

  try {
    const token = localStorage.getItem('token') || ''
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    
    const historico = finoraMessages.value
      .slice(1, -2)
      .filter(m => m.text)
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
    
    const res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ mensagem: userMsg, userId: user.id, historico })
    })
    
    if (!res.ok) {
      finoraMessages.value[botMsgIndex].loading = false
      finoraMessages.value[botMsgIndex].text = '❌ Erro ao processar solicitação.'
      return
    }
    
    const data = await res.json()
    finoraMessages.value[botMsgIndex].loading = false
    finoraMessages.value[botMsgIndex].text = data.text
    scrollChat()
  } catch (err) {
    finoraMessages.value[botMsgIndex].loading = false
    finoraMessages.value[botMsgIndex].text = '❌ Erro: Não foi possível conectar ao Ollama local.'
  }
}

function formatFinoraMessage(text) {
  if (!text) return ''
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
}

// ── Refs inputs
const inputValor      = ref(null)
const inputSaldo      = ref(null)
const inputValorItem  = ref(null)
const inputValorVenda = ref(null)
const inputValorTransf  = ref(null)
const inputValorEditar  = ref(null)
const valorLancamentoGuardado = ref(0)

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
  formTx.value.valor = novo
  valorLancamentoGuardado.value = novo
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
  // Polling a cada 8 segundos — atualiza tudo (saldo + extrato + métricas)
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
  const valor = Number(formTx.value.valor || valorLancamentoGuardado.value || parseMoeda(inputValor.value?.value || '0'))
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
    valorLancamentoGuardado.value = 0
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
      const { data } = await api.get('/transfers/destinatarios', {
        params: { q: buscaUsuario.value }
      })
      
      const usersMap = {}
      data.forEach(item => {
        if (!usersMap[item.userId]) {
          usersMap[item.userId] = {
            id: item.userId,
            nome: item.nomeUsuario,
            email: item.emailUsuario,
            _contas: []
          }
        }
        usersMap[item.userId]._contas.push({
          id: item.contaId,
          nome: item.nomeConta,
          banco: item.banco
        })
      })
      
      const filtrados = Object.values(usersMap).filter(u => u.id !== auth.user?.id)
      usuariosEncontrados.value = filtrados
      // Merge em recentes para aparecer na lista inicial também
      filtrados.forEach(u => {
        if (!usuariosRecentes.value.find(r => r.id === u.id)) {
          usuariosRecentes.value.push(u)
        }
      })
    } catch (err) {
      console.error('Erro na busca de usuários:', err)
      usuariosEncontrados.value = []
    } finally {
      buscandoUsuarios.value = false
    }
  }, 300)
}

async function selecionarUsuarioDestino(usuario) {
  formTransf.value.usuarioDestinoId = usuario.id
  formTransf.value.contaExternaId   = ''
  contasUsuarioDestino.value        = usuario._contas || []
  if (contasUsuarioDestino.value.length === 1) {
    formTransf.value.contaExternaId = contasUsuarioDestino.value[0].id
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
  valorLancamentoGuardado.value = 0
  formTx.value = { descricao:'', valor:0, tipo:'despesa', categoria:'mercado', data:hoje(), accountId:'' }
  if (inputValor.value) inputValor.value.value = ''
}

function selecionarTipoLancamento(tipo) {
  formTx.value.tipo = tipo
  formTx.value.valor = 0
  valorLancamentoGuardado.value = 0
  formTx.value.categoria = tipo === 'receita' ? 'salario' : 'mercado'
  passoLancamento.value = 2
}

function selecionarCategoriaStep(catId) {
  formTx.value.categoria = catId
  passoLancamento.value = 3
  // teclado só abre ao tocar no campo
}

function confirmarValorLancamento() {
  const valor = parseMoeda(inputValor.value?.value || '0')
  if (!valor || valor <= 0) { mostrarToast('⚠️ Informe um valor'); return }
  formTx.value.valor = valor
  valorLancamentoGuardado.value = valor
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
  // teclado só abre ao tocar no campo
}

async function selecionarUsuarioStep(usuario) {
  await selecionarUsuarioDestino(usuario)
  passoTransf.value = 3
}

function selecionarContaExternaStep(contaId) {
  formTransf.value.contaExternaId = contaId
  passoTransf.value = 4
  // teclado só abre ao tocar no campo
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
<div v-if="appCarregando" class="ios-splash"><div class="ios-splash-inner"><div class="ios-spinner"></div><p style="color:rgba(235,235,245,.6);font-size:.875rem;margin-top:1rem">Carregando...</p></div></div>
<Transition name="ios-toast"><div v-if="toast.visivel" class="ios-toast">{{ toast.mensagem }}</div></Transition>
<Transition name="fade"><div v-if="loadingGlobal" class="ios-overlay"><div class="ios-loading-card"><div class="ios-spinner"></div><span>{{ loadingMsg }}</span></div></div></Transition>

<div class="ios-app" :style="globalGlow()">
<header class="ios-header">
  <div class="ios-header-left">
    <div class="ios-logo">💰</div>
    <span class="ios-header-title" style="font-weight: 800; font-size: 1.1rem; margin-left: 0.5rem; display: none;">FinanceApp</span>
  </div>

  <nav class="ios-header-nav">
    <div class="ios-nav-slider" :style="{ transform: `translateX(${navItems.findIndex(i => i.val === aba) * 100}%)` }"></div>
    <button v-for="item in navItems" :key="item.val" @click.prevent="aba=item.val" :class="{active:aba===item.val}" class="ios-header-tab">
      {{ item.label }}
    </button>
  </nav>

  <div class="ios-header-right">
    <div class="ios-user-badge">
      <div class="ios-avatar">{{ auth.nome?.charAt(0).toUpperCase() }}</div>
      <span class="ios-greeting" style="display: none;">Olá, <strong>{{ auth.nome?.split(' ')[0] }}</strong></span>
    </div>
    <button @click="modalAlertas=true" class="ios-hdr-btn">🔔</button>
    <button @click="auth.logout()" class="ios-hdr-btn ios-hdr-btn-danger">✕</button>
  </div>
</header>

<main class="ios-main">
<div v-show="aba==='inicio'" class="ios-content">

  <div class="ios-balance-card">
    <div class="ios-balance-inner">
      <div class="ios-balance-top">
        <div><p class="ios-balance-label">Saldo Total</p><p class="ios-balance-sub">{{ accounts.contas.length }} conta(s)</p></div>
        <div class="ios-balance-badge">📅 {{ mesAtual }}</div>
      </div>
      <h2 class="ios-balance-value" :class="{up:saldoAnimando==='up',down:saldoAnimando==='down'}">{{ formatar(saldoExibido) }}</h2>
      <Transition name="ios-diff"><div v-if="diffVisivel" class="ios-balance-diff" :class="diffValor>=0?'pos':'neg'">{{ diffValor>=0?'+':'' }}{{ formatar(diffValor) }}</div></Transition>
      <div class="ios-balance-bar"><div class="ios-balance-bar-fill" :class="pctEntradas>50?'good':'warn'" :style="{width:pctEntradas+'%'}"></div></div>
      <div class="ios-balance-row"><span>⬆ {{ formatar(totalEntradas) }}</span><span>⬇ {{ formatar(totalSaidas) }}</span></div>
    </div>
  </div>

  <div class="ios-quick-grid">
    <button @click="modalLancamento=true;passoLancamento=1" class="ios-quick-btn"><span class="ios-quick-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></span><span>Lançar</span></button>
    <button @click="abrirTransferenciaStep()" class="ios-quick-btn"><span class="ios-quick-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg></span><span>Transferir</span></button>
    <button @click="modalAlertas=true" class="ios-quick-btn"><span class="ios-quick-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></span><span>Alertas</span></button>
    <button @click="modalConta=true" class="ios-quick-btn"><span class="ios-quick-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg></span><span>Conta</span></button>
  </div>

  <div class="ios-summary-grid">
    <div class="ios-widget" @click="aba='historico';filtroAtivo='receita'">
      <div class="ios-widget-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></div><p class="ios-widget-label">Entradas</p><p class="ios-widget-value wg-green-text">{{ formatar(totalEntradas) }}</p>
    </div>
    <div class="ios-widget" @click="aba='historico';filtroAtivo='despesa'">
      <div class="ios-widget-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7 7 10 10"/><path d="M17 7v10H7"/></svg></div><p class="ios-widget-label">Saídas</p><p class="ios-widget-value wg-red-text">{{ formatar(totalSaidas) }}</p>
    </div>
    <div class="ios-widget">
      <div class="ios-widget-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg></div><p class="ios-widget-label">Balanço</p><p class="ios-widget-value" :class="balanco>=0?'wg-teal-text':'wg-red-text'">{{ formatar(balanco) }}</p>
    </div>
  </div>

  <div v-if="accounts.contas.length" class="ios-widget-card">
    <div class="ios-wc-header"><p>🏦 Minhas Contas</p><button @click="aba='contas'" class="ios-link">Ver todas →</button></div>
    <div v-for="conta in accounts.contas" :key="conta.id" class="ios-account-row">
      <div class="ios-acc-icon" :style="{background:conta.cor+'18',color:conta.cor}">{{ conta.banco.charAt(0).toUpperCase() }}</div>
      <div class="ios-acc-info"><p class="ios-acc-name">{{ conta.banco }}</p><div class="ios-acc-bar"><div :style="{width:(accounts.saldoTotal>0?(conta.saldo/accounts.saldoTotal)*100:0)+'%',backgroundColor:conta.cor}"></div></div></div>
      <p class="ios-acc-val" :style="{color:conta.cor}">{{ formatar(conta.saldo) }}</p>
    </div>
  </div>
  <div v-else class="ios-empty-card"><p style="font-size:2rem;margin-bottom:.5rem">🏦</p><p>Nenhuma conta ainda</p><button @click="modalConta=true" class="ios-link">+ Adicionar conta</button></div>

  <div v-for="b in budgets.budgets.filter(b=>b.ativo && b.gastoAtual>=b.limite)" :key="'al-'+b.id" class="ios-alert-card ios-alert-danger">
    <div class="ios-alert-icon">{{ emojiCat[b.categoria]||'⚠️' }}</div>
    <div class="ios-alert-body"><p class="ios-alert-title">🚨 Limite ultrapassado!</p><p class="ios-alert-sub">{{ labelCat[b.categoria] }}: <strong>{{ formatar(b.gastoAtual) }}</strong> de {{ formatar(b.limite) }}</p>
      <div class="ios-alert-bar"><div :style="{width:Math.min((b.gastoAtual/b.limite)*100,100)+'%'}" class="bg-red"></div></div></div>
  </div>
  <div v-for="b in budgets.budgets.filter(b=>b.ativo && b.gastoAtual>=b.limite*0.7 && b.gastoAtual<b.limite)" :key="'av-'+b.id" class="ios-alert-card ios-alert-warn">
    <div class="ios-alert-icon">{{ emojiCat[b.categoria]||'⚠️' }}</div>
    <div class="ios-alert-body"><p class="ios-alert-title">⚠️ Atenção!</p><p class="ios-alert-sub">{{ labelCat[b.categoria] }}: <strong>{{ formatar(b.gastoAtual) }}</strong> de {{ formatar(b.limite) }} ({{ Math.round((b.gastoAtual/b.limite)*100) }}%)</p>
      <div class="ios-alert-bar"><div :style="{width:Math.min((b.gastoAtual/b.limite)*100,100)+'%'}" class="bg-amber"></div></div></div>
  </div>

  <div v-if="items.itens.filter(i=>i.status==='disponivel').length" class="ios-widget-card">
    <div class="ios-wc-header"><p>📦 À venda</p><button @click="aba='investimentos'" class="ios-link">Ver tudo →</button></div>
    <div v-for="item in items.itens.filter(i=>i.status==='disponivel').slice(0,3)" :key="item.id" class="ios-account-row">
      <span style="font-size:1.2rem">📦</span>
      <p style="flex:1;font-size:.875rem;font-weight:500">{{ item.nome }}</p>
      <p class="wg-orange-text" style="font-weight:800;font-size:.875rem">{{ formatar(item.valor) }}</p>
      <button @click="abrirVenda(item)" class="ios-pill-btn">Vender</button>
    </div>
  </div>
</div>

<div v-show="aba==='contas'" class="ios-content">
  <div class="ios-section-header"><p class="ios-section-title">🏦 Contas</p>
    <div style="display:flex;gap:.5rem"><button @click="abrirTransferenciaStep()" class="ios-pill-btn blue">🔄 Transferir</button><button @click="modalConta=true" class="ios-pill-btn green">+ Nova</button></div>
  </div>
  <div v-if="accounts.contas.length" class="ios-total-banner"><p>Total consolidado</p><p class="ios-total-val">{{ formatar(accounts.saldoTotal) }}</p></div>
  <div class="ios-cards-grid">
    <div v-for="conta in accounts.contas" :key="conta.id" class="ios-conta-card">
      <div class="ios-conta-top-bar" :style="{backgroundColor:conta.cor}"></div>
      <div class="ios-conta-header">
        <div class="ios-acc-icon lg" :style="{background:conta.cor+'18',color:conta.cor}">{{ conta.banco.charAt(0).toUpperCase() }}</div>
        <div><p style="font-weight:700;font-size:.9rem">{{ conta.banco }}</p><p class="ios-muted">Conta bancária</p></div>
        <button @click="confirmarDel(conta)" class="ios-del-btn">✕</button>
      </div>
      <p class="ios-conta-saldo" :style="{color:conta.cor}">{{ formatar(conta.saldo) }}</p>
      <div class="ios-conta-footer"><span>Participação</span><span>{{ accounts.saldoTotal>0?Math.round((conta.saldo/accounts.saldoTotal)*100):0 }}%</span></div>
      <div class="ios-acc-bar full"><div :style="{width:(accounts.saldoTotal>0?(conta.saldo/accounts.saldoTotal)*100:0)+'%',backgroundColor:conta.cor}"></div></div>
    </div>
  </div>
  <div v-if="!accounts.contas.length" class="ios-empty-card"><p style="font-size:2rem;margin-bottom:.5rem">🏦</p><p>Nenhuma conta.</p><button @click="modalConta=true" class="ios-link">Adicionar →</button></div>
</div>

<div v-show="aba==='historico'" class="ios-content">
  <div class="ios-segmented"><button @click="subAbaHistorico='lancamentos'" :class="{active:subAbaHistorico==='lancamentos'}">📋 Lançamentos</button><button @click="subAbaHistorico='metricas'" :class="{active:subAbaHistorico==='metricas'}">📊 Métricas</button></div>
  <div v-show="subAbaHistorico==='lancamentos'">
    <div class="ios-segmented sm"><button v-for="f in filtros" :key="f.val" @click="filtroAtivo=f.val" :class="{active:filtroAtivo===f.val}">{{ f.label }}</button></div>
    <div class="ios-list-header"><span>{{ filtroAtivo==='todos'?'Todas':filtroAtivo==='receita'?'Entradas':'Saídas' }} ({{ transacoesFiltradas.length }})</span><span class="ios-list-total" :class="filtroAtivo==='despesa'?'wg-red-text':filtroAtivo==='receita'?'wg-green-text':'wg-teal-text'">{{ filtroAtivo==='todos'?formatar(balanco):filtroAtivo==='receita'?formatar(totalEntradas):formatar(totalSaidas) }}</span></div>
    <div v-if="!transacoesFiltradas.length" class="ios-empty-card"><p style="font-size:2rem;margin-bottom:.5rem">📭</p><p>Nenhum lançamento</p><button @click="modalLancamento=true" class="ios-link">+ Criar</button></div>
    <div class="ios-widget-card">
      <div v-for="(t,i) in transacoesFiltradas" :key="t.id" class="ios-tx-row" :class="{bordered:i>0}">
        <div class="ios-tx-icon" :class="t.tipo==='receita'?'wg-green':'wg-red'">{{ emojiCat[t.categoria]||(t.tipo==='receita'?'💚':'🔴') }}</div>
        <div class="ios-tx-info"><p class="ios-tx-desc">{{ t.descricao }}</p><p class="ios-muted">{{ t.Account?.banco||t.Account?.nome }} • {{ fmtData(t.data) }}</p></div>
        <div class="ios-tx-right">
          <p :class="t.tipo==='receita'?'wg-green-text':'wg-red-text'" style="font-weight:800;font-size:.875rem">{{ t.tipo==='receita'?'+':'-' }}{{ formatar(t.valor) }}</p>
          <div class="ios-tx-actions"><button @click="abrirEditar(t)" class="ios-sm-btn">✏️</button><button @click="tx.deletar(t.id).then(()=>mostrarToast('🗑️ Removido'))" class="ios-sm-btn danger">✕</button></div>
        </div>
      </div>
    </div>
  </div>
  <div v-show="subAbaHistorico==='metricas'" class="ios-metrics-section">
    <div class="ios-segmented sm"><button v-for="p in periodos" :key="p.val" @click="periodoMetricas=p.val" :class="{active:periodoMetricas===p.val}">{{ p.label }}</button></div>
    <p class="ios-period-label">{{ labelPeriodo }}</p>
    <div class="ios-summary-grid">
      <div class="ios-widget"><div class="ios-widget-icon wg-red">⬇️</div><p class="ios-widget-label">Gasto</p><p class="ios-widget-value wg-red-text">{{ formatar(totalGastoPeriodo) }}</p></div>
      <div class="ios-widget"><div class="ios-widget-icon wg-green">⬆️</div><p class="ios-widget-label">Recebido</p><p class="ios-widget-value wg-green-text">{{ formatar(totalRecebPeriodo) }}</p></div>
      <div class="ios-widget"><div class="ios-widget-icon wg-purple">💹</div><p class="ios-widget-label">Economia</p><p class="ios-widget-value wg-purple-text">{{ taxaEconomia }}%</p></div>
    </div>
    <div v-if="gastosPorCat.length" class="ios-widget-card">
      <p class="ios-wc-title">⬇️ Gastos por categoria</p>
      <div class="ios-donut-row"><div class="ios-donut-wrap"><svg viewBox="0 0 120 120" class="ios-donut"><circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="14"/><circle v-for="(seg,i) in donutDespesas" :key="i" cx="60" cy="60" r="45" fill="none" :stroke="seg.cor" stroke-width="14" :stroke-dasharray="(seg.dash-2)+' '+(CIRCUMFERENCE-seg.dash+2)" :stroke-dashoffset="-(seg.offset)" style="transition:all .6s ease"/></svg><div class="ios-donut-center"><p class="ios-muted">Total</p><p style="font-weight:800;font-size:.75rem">{{ formatar(totalGastoPeriodo) }}</p></div></div>
        <div class="ios-donut-legend"><div v-for="item in gastosPorCat.slice(0,5)" :key="item.cat" class="ios-legend-item"><span class="ios-legend-dot" :style="{background:item.cor}"></span><span class="ios-legend-label">{{ item.label }}</span><span class="ios-legend-pct" :style="{color:item.cor}">{{ item.pct }}%</span></div></div>
      </div>
      <div class="ios-cat-bars"><div v-for="item in gastosPorCat" :key="item.cat" class="ios-cat-bar-item"><div class="ios-cat-bar-header"><span>{{ item.emoji }} {{ item.label }}</span><span class="ios-muted">{{ formatar(item.valor) }} · <strong :style="{color:item.cor}">{{ item.pct }}%</strong></span></div><div class="ios-progress"><div :style="{width:item.pct+'%',background:item.cor}"></div></div></div></div>
    </div>
    <div v-if="receitasPorCat.length" class="ios-widget-card">
      <p class="ios-wc-title">⬆️ Receitas por categoria</p>
      <div class="ios-donut-row"><div class="ios-donut-wrap"><svg viewBox="0 0 120 120" class="ios-donut"><circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="14"/><circle v-for="(seg,i) in donutReceitas" :key="i" cx="60" cy="60" r="45" fill="none" :stroke="seg.cor" stroke-width="14" :stroke-dasharray="(seg.dash-2)+' '+(CIRCUMFERENCE-seg.dash+2)" :stroke-dashoffset="-(seg.offset)" style="transition:all .6s ease"/></svg><div class="ios-donut-center"><p class="ios-muted">Total</p><p style="font-weight:800;font-size:.75rem">{{ formatar(totalRecebPeriodo) }}</p></div></div>
        <div class="ios-donut-legend"><div v-for="item in receitasPorCat.slice(0,5)" :key="item.cat" class="ios-legend-item"><span class="ios-legend-dot" :style="{background:item.cor}"></span><span class="ios-legend-label">{{ item.label }}</span><span class="ios-legend-pct" :style="{color:item.cor}">{{ item.pct }}%</span></div></div>
      </div>
    </div>
    <div v-if="!txPeriodo.length" class="ios-empty-card"><p style="font-size:2rem;margin-bottom:.5rem">📊</p><p>Sem dados neste período</p></div>
  </div>
</div>

<div v-show="aba==='metricas'" class="ios-content">
  <div class="ios-segmented sm"><button v-for="p in periodos" :key="p.val" @click="periodoMetricas=p.val" :class="{active:periodoMetricas===p.val}">{{ p.label }}</button></div>
  <div class="ios-summary-grid">
    <div class="ios-widget"><p class="ios-widget-label">Receitas</p><p class="ios-widget-value wg-green-text">{{ formatar(totalRecebPeriodo) }}</p></div>
    <div class="ios-widget"><p class="ios-widget-label">Despesas</p><p class="ios-widget-value wg-red-text">{{ formatar(totalGastoPeriodo) }}</p></div>
    <div class="ios-widget"><p class="ios-widget-label">Economia</p><p class="ios-widget-value wg-purple-text">{{ taxaEconomia }}%</p></div>
  </div>
  <div v-if="gastosPorCat.length" class="ios-widget-card">
    <p class="ios-wc-title">Despesas por categoria</p>
    <div class="ios-donut-row"><div class="ios-donut-wrap"><svg viewBox="0 0 120 120" width="120" height="120" class="ios-donut"><circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="18"/><circle v-for="(seg,i) in donutDespesas" :key="i" cx="60" cy="60" r="45" fill="none" :stroke="seg.cor" stroke-width="18" :stroke-dasharray="seg.dash+' '+(CIRCUMFERENCE-seg.dash)" :stroke-dashoffset="CIRCUMFERENCE-seg.offset" style="transform:rotate(-90deg);transform-origin:60px 60px"/></svg></div>
    <div class="ios-donut-legend"><div v-for="item in gastosPorCat.slice(0,4)" :key="item.cat" class="ios-legend-item"><span class="ios-legend-dot" :style="{background:item.cor}"></span><span class="ios-legend-label">{{ item.label }}</span><span class="ios-legend-pct">{{ item.pct }}%</span></div></div></div>
    <div class="ios-cat-bars"><div v-for="item in gastosPorCat" :key="item.cat" class="ios-cat-bar-item"><div class="ios-cat-bar-header"><span>{{ item.emoji }} {{ item.label }}</span><span class="ios-muted">{{ formatar(item.valor) }} · {{ item.pct }}%</span></div><div class="ios-progress"><div :style="{width:item.pct+'%',background:item.cor}"></div></div></div></div>
  </div>
  <div v-if="receitasPorCat.length" class="ios-widget-card">
    <p class="ios-wc-title">Receitas por categoria</p>
    <div class="ios-donut-row"><div class="ios-donut-wrap"><svg viewBox="0 0 120 120" width="120" height="120" class="ios-donut"><circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="18"/><circle v-for="(seg,i) in donutReceitas" :key="i" cx="60" cy="60" r="45" fill="none" :stroke="seg.cor" stroke-width="18" :stroke-dasharray="seg.dash+' '+(CIRCUMFERENCE-seg.dash)" :stroke-dashoffset="CIRCUMFERENCE-seg.offset" style="transform:rotate(-90deg);transform-origin:60px 60px"/></svg></div>
    <div class="ios-donut-legend"><div v-for="item in receitasPorCat.slice(0,4)" :key="item.cat" class="ios-legend-item"><span class="ios-legend-dot" :style="{background:item.cor}"></span><span class="ios-legend-label">{{ item.label }}</span><span class="ios-legend-pct">{{ item.pct }}%</span></div></div></div>
  </div>
  <div v-if="!txPeriodo.length" class="ios-empty-card"><p style="font-size:2rem;margin-bottom:.5rem">📊</p><p>Nenhuma transação neste período</p></div>
</div>

<div v-show="aba==='investimentos'" class="ios-content">
  <div class="ios-section-header">
    <p class="ios-section-title">📦 Itens</p>
    <div style="display:flex;gap:.5rem">
      <button @click="modalItem=true;subAbaInv='compra'" class="ios-pill-btn blue">🛒 Comprar</button>
      <button @click="modalItem=true;subAbaInv='venda'" class="ios-pill-btn orange">+ Novo Item</button>
    </div>
  </div>

  <div class="ios-segmented">
    <button @click="subAbaInv='venda'" :class="{active:subAbaInv==='venda'}">📦 À Venda</button>
    <button @click="subAbaInv='compra'" :class="{active:subAbaInv==='compra'}">🛒 Comprados</button>
  </div>

  <div v-show="subAbaInv==='venda'">
    <div v-if="!itensVenda.length" class="ios-empty-card">
      <p style="font-size:2rem;margin-bottom:.5rem">📦</p>
      <p>Nenhum item à venda</p>
    </div>
    <div v-else class="ios-widget-card">
      <div v-for="(item, i) in itensVenda" :key="item.id" class="ios-tx-row" :class="{bordered:i>0}">
        <div class="ios-tx-icon wg-orange">📦</div>
        <div class="ios-tx-info">
          <p class="ios-tx-desc">{{ item.nome }}</p>
          <p class="ios-muted">{{ item.descricao || 'Sem descrição' }}</p>
        </div>
        <div class="ios-tx-right">
          <p class="wg-orange-text" style="font-weight:800;font-size:.875rem">{{ formatar(item.valor) }}</p>
          <div class="ios-tx-actions" v-if="item.status==='disponivel'">
            <button @click="abrirVenda(item)" class="ios-pill-btn">Vender</button>
          </div>
          <p v-else class="ios-muted" style="font-size: 0.75rem;">Vendido</p>
        </div>
      </div>
    </div>
  </div>

  <div v-show="subAbaInv==='compra'">
    <div v-if="!itensCompra.length" class="ios-empty-card">
      <p style="font-size:2rem;margin-bottom:.5rem">🛒</p>
      <p>Nenhuma compra registrada</p>
    </div>
    <div v-else class="ios-widget-card">
      <div v-for="(item, i) in itensCompra" :key="item.id" class="ios-tx-row" :class="{bordered:i>0}">
        <div class="ios-tx-icon wg-blue">🛒</div>
        <div class="ios-tx-info">
          <p class="ios-tx-desc">{{ item.nome }}</p>
          <p class="ios-muted">{{ item.descricao || 'Sem descrição' }}</p>
        </div>
        <div class="ios-tx-right">
          <p class="wg-blue-text" style="font-weight:800;font-size:.875rem">{{ formatar(item.valor) }}</p>
        </div>
      </div>
    </div>
  </div>
</div>
</main>

<nav class="ios-bottomnav">
  <div class="ios-bottomnav-inner">
    <button @click="aba='inicio'" :class="{active:aba==='inicio'}" class="ios-tab-btn"><span class="ios-tab-icon">🏠</span><span class="ios-tab-label">Início</span></button>
    <button @click="aba='contas'" :class="{active:aba==='contas'}" class="ios-tab-btn"><span class="ios-tab-icon">🏦</span><span class="ios-tab-label">Contas</span></button>
    <button @click="modalLancamento=true;passoLancamento=1" class="ios-fab"><div class="ios-fab-inner">⚡</div><span class="ios-tab-label active">Lançar</span></button>
    <button @click="aba='historico'" :class="{active:aba==='historico'}" class="ios-tab-btn"><span class="ios-tab-icon">📋</span><span class="ios-tab-label">Histórico</span></button>
    <button @click="aba='metricas'" :class="{active:aba==='metricas'}" class="ios-tab-btn"><span class="ios-tab-icon">📊</span><span class="ios-tab-label">Métricas</span></button>
  </div>
</nav>

<!-- MODAL LANÇAMENTO -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="modalLancamento" class="ios-modal-bg" @click.self="fecharLancamentoStep">
<div class="ios-modal-card">
  <div class="ios-modal-header">
    <button v-if="passoLancamento>1" @click="passoLancamento--" class="ios-back">‹</button>
    <div><h3>⚡ Lançamento Rápido</h3><p class="ios-muted">Passo {{ passoLancamento }} de {{ accounts.contas.length>1?4:3 }}</p></div>
    <button @click="fecharLancamentoStep" class="ios-close">✕</button>
  </div>
  <div class="ios-modal-progress"><div :class="formTx.tipo==='receita'?'bg-green':'bg-red'" :style="{width:(passoLancamento/(accounts.contas.length>1?4:3)*100)+'%'}"></div></div>
  <div class="ios-modal-body">
    <Transition name="ios-step" mode="out-in">
    <div v-if="passoLancamento===1" key="p1" class="ios-step">
      <p class="ios-step-title">O que deseja registrar?</p>
      <button @click="selecionarTipoLancamento('receita')" class="ios-option-btn green"><div class="ios-option-icon">⬆️</div><div><p class="ios-option-title">Entrada</p><p class="ios-muted">Salário, freelance, presente...</p></div><span class="ios-chevron">›</span></button>
      <button @click="selecionarTipoLancamento('despesa')" class="ios-option-btn red"><div class="ios-option-icon">⬇️</div><div><p class="ios-option-title">Saída</p><p class="ios-muted">Mercado, contas, lazer...</p></div><span class="ios-chevron">›</span></button>
    </div></Transition>
    <Transition name="ios-step" mode="out-in">
    <div v-if="passoLancamento===2" key="p2" class="ios-step">
      <p class="ios-step-title">{{ formTx.tipo==='receita'?'Categoria da entrada':'Categoria da saída' }}</p>
      <div class="ios-cat-grid"><button v-for="cat in categoriasAtuais" :key="cat.id" @click="selecionarCategoriaStep(cat.id)" :class="{active:formTx.categoria===cat.id}" class="ios-cat-btn"><span class="ios-cat-emoji">{{ cat.emoji }}</span><span>{{ cat.label }}</span></button></div>
    </div></Transition>
    <Transition name="ios-step" mode="out-in">
    <div v-if="passoLancamento===3" key="p3" class="ios-step">
      <div class="ios-context-bar"><span>{{ emojiCat[formTx.categoria] }}</span><div><p class="ios-muted">{{ labelCat[formTx.categoria] }}</p><p :class="formTx.tipo==='receita'?'wg-green-text':'wg-red-text'" style="font-size:.7rem">{{ formTx.tipo==='receita'?'⬆️ Entrada':'⬇️ Saída' }}</p></div></div>
      <div class="ios-input-group"><span class="ios-input-prefix">R$</span><input ref="inputValor" @input="mascaraMoeda" inputmode="decimal" placeholder="0,00" class="ios-input-big"/></div>
      <div class="ios-chips"><button v-for="v in valoresRapidos.slice(4)" :key="v.val" @click="setValorRapido(v.val)" class="ios-chip">{{ v.label }}</button></div>
      <input v-model="formTx.descricao" type="text" placeholder="Descrição (opcional)" class="ios-input"/>
      <button @click="confirmarValorLancamento" :class="formTx.tipo==='receita'?'bg-green':'bg-red'" class="ios-btn-full">{{ accounts.contas.length>1?'Próximo → Conta':'Confirmar ✓' }}</button>
    </div></Transition>
    <Transition name="ios-step" mode="out-in">
    <div v-if="passoLancamento===4" key="p4" class="ios-step">
      <p class="ios-step-title">Qual conta?</p>
      <button v-for="c in accounts.contas" :key="c.id" @click="formTx.accountId=c.id;criarTransacaoStep()" class="ios-option-btn"><div class="ios-acc-icon" :style="{background:c.cor+'20',color:c.cor}">{{ c.banco.charAt(0).toUpperCase() }}</div><div><p class="ios-option-title">{{ c.banco }}</p><p class="ios-muted">{{ formatar(c.saldo) }}</p></div><span class="ios-chevron">›</span></button>
    </div></Transition>
  </div>
</div></div>
</Transition></Teleport>

<!-- MODAL TRANSFERÊNCIA -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="modalTransferencia" class="ios-modal-bg" @click.self="fecharTransferenciaStep">
<div class="ios-modal-card">
  <div class="ios-modal-header">
    <button v-if="passoTransf>1" @click="passoTransf--;buscaUsuario='';usuariosEncontrados=[]" class="ios-back">‹</button>
    <div><h3>🔄 Transferência</h3><p class="ios-muted">Passo {{ passoTransf }} de {{ formTransf.tipo==='propria'?4:5 }}</p></div>
    <button @click="fecharTransferenciaStep" class="ios-close">✕</button>
  </div>
  <div class="ios-modal-progress"><div class="bg-blue" :style="{width:(passoTransf/(formTransf.tipo==='propria'?4:5)*100)+'%'}"></div></div>
  <div class="ios-modal-body">
    <Transition name="ios-step" mode="out-in"><div v-if="passoTransf===1" key="t1" class="ios-step">
      <p class="ios-step-title">Para onde?</p>
      <button @click="selecionarTipoTransf('propria')" :disabled="accounts.contas.length<2" class="ios-option-btn teal"><div class="ios-option-icon">🔄</div><div><p class="ios-option-title">Minha conta</p><p class="ios-muted">Entre suas contas</p></div><span class="ios-chevron">›</span></button>
      <button @click="selecionarTipoTransf('externo')" class="ios-option-btn blue"><div class="ios-option-icon">👤</div><div><p class="ios-option-title">Outro usuário</p><p class="ios-muted">Enviar para outra pessoa</p></div><span class="ios-chevron">›</span></button>
    </div></Transition>
    <Transition name="ios-step" mode="out-in"><div v-if="passoTransf===2&&formTransf.tipo==='propria'" key="t2p" class="ios-step">
      <p class="ios-step-title">Conta destino</p>
      <button v-for="c in accounts.contas" :key="c.id" @click="selecionarContaDestinoStep(c.id)" class="ios-option-btn"><div class="ios-acc-icon" :style="{background:c.cor+'20',color:c.cor}">{{ c.banco.charAt(0) }}</div><div><p class="ios-option-title">{{ c.banco }}</p><p class="ios-muted">{{ formatar(c.saldo) }}</p></div><span class="ios-chevron">›</span></button>
    </div></Transition>
    <Transition name="ios-step" mode="out-in"><div v-if="passoTransf===2&&formTransf.tipo==='externo'" key="t2e" class="ios-step">
      <p class="ios-step-title">Destinatário</p>
      <div class="ios-search-wrap"><span>🔍</span><input v-model="buscaUsuario" @input="debounceUsuarios" placeholder="Buscar nome ou e-mail..." class="ios-input"/><div v-if="buscandoUsuarios" class="ios-spinner sm"></div></div>
      <div class="ios-user-list">
        <button v-for="u in usuariosDestino" :key="u.id" @click="selecionarUsuarioStep(u)" class="ios-option-btn" :class="{selected:formTransf.usuarioDestinoId===u.id}"><div class="ios-user-avatar">{{ u.nome.charAt(0).toUpperCase() }}</div><div><p class="ios-option-title">{{ u.nome }}</p><p class="ios-muted">{{ u.email }}</p></div><span v-if="formTransf.usuarioDestinoId===u.id" class="wg-blue-text">✓</span><span v-else class="ios-chevron">›</span></button>
        <p v-if="buscaUsuario.length>=2&&!buscandoUsuarios&&!usuariosDestino.length" class="ios-empty-small">Nenhum usuário encontrado</p>
      </div>
    </div></Transition>
    <Transition name="ios-step" mode="out-in"><div v-if="passoTransf===3&&formTransf.tipo==='propria'" key="t3p" class="ios-step">
      <p class="ios-step-title">Valor</p>
      <div class="ios-input-group"><span class="ios-input-prefix">R$</span><input ref="inputValorTransf" @input="mascaraMoeda" inputmode="decimal" placeholder="0,00" class="ios-input-big"/></div>
      <div class="ios-chips"><button v-for="v in valoresRapidosTransf" :key="v.val" @click="setValorRapidoTransf(v.val)" class="ios-chip">{{ v.label }}</button></div>
      <button @click="confirmarValorTransf" class="ios-btn-full bg-blue">Próximo →</button>
    </div></Transition>
    <Transition name="ios-step" mode="out-in"><div v-if="passoTransf===3&&formTransf.tipo==='externo'" key="t3e" class="ios-step">
      <p class="ios-step-title">Conta do destinatário</p>
      <button v-for="c in contasUsuarioDestino" :key="c.id" @click="selecionarContaExternaStep(c.id)" class="ios-option-btn" :class="{selected:formTransf.contaExternaId===c.id}"><div class="ios-acc-icon" style="background:rgba(59,130,246,.12);color:#3b82f6">{{ c.banco.charAt(0) }}</div><div><p class="ios-option-title">{{ c.banco }}</p><p class="ios-muted">{{ c.nome }}</p></div><span class="ios-chevron">›</span></button>
    </div></Transition>
    <Transition name="ios-step" mode="out-in"><div v-if="passoTransf===4&&formTransf.tipo==='externo'" key="t4e" class="ios-step">
      <p class="ios-step-title">Valor</p>
      <div class="ios-input-group"><span class="ios-input-prefix">R$</span><input ref="inputValorTransf" @input="mascaraMoeda" inputmode="decimal" placeholder="0,00" class="ios-input-big"/></div>
      <input v-model="formTransf.descricao" type="text" placeholder="Descrição (opcional)" class="ios-input"/>
      <button @click="confirmarValorTransf" class="ios-btn-full bg-blue">Próximo →</button>
    </div></Transition>
    <Transition name="ios-step" mode="out-in"><div v-if="(passoTransf===4&&formTransf.tipo==='propria')||(passoTransf===5&&formTransf.tipo==='externo')" key="torigem" class="ios-step">
      <p class="ios-step-title">De qual conta?</p>
      <button v-for="c in contasOrigemTransf" :key="c.id" @click="formTransf.contaOrigemId=c.id;realizarTransferenciaStep()" :disabled="loadingTransferencia" class="ios-option-btn"><div class="ios-acc-icon" :style="{background:c.cor+'20',color:c.cor}">{{ c.banco.charAt(0) }}</div><div><p class="ios-option-title">{{ c.banco }}</p><p class="ios-muted">{{ formatar(c.saldo) }}</p></div><div v-if="loadingTransferencia&&formTransf.contaOrigemId===c.id" class="ios-spinner sm"></div><span v-else class="ios-chevron">›</span></button>
    </div></Transition>
  </div>
</div></div>
</Transition></Teleport>

<!-- MODAL CONTA -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="modalConta" class="ios-modal-bg" @click.self="modalConta=false">
<div class="ios-modal-card sm">
  <div class="ios-modal-header"><div><h3>🏦 Nova Conta</h3></div><button @click="modalConta=false" class="ios-close">✕</button></div>
  <div class="ios-modal-body">
    <label class="ios-label">Banco</label>
    <div class="ios-bank-grid"><button v-for="b in bancosRapidos" :key="b" @click="formConta.banco=b" :class="{active:formConta.banco===b}" class="ios-chip">{{ b }}</button></div>
    <input v-model="formConta.banco" placeholder="Ou digite..." class="ios-input"/>
    <label class="ios-label">Saldo atual</label>
    <input ref="inputSaldo" @input="mascaraMoeda" inputmode="numeric" placeholder="R$ 0,00" class="ios-input-big"/>
    <label class="ios-label">Cor</label>
    <div class="ios-color-row"><button v-for="cor in cores" :key="cor" @click="formConta.cor=cor" :style="{backgroundColor:cor}" :class="{active:formConta.cor===cor}" class="ios-color-dot"/></div>
    <div class="ios-btn-row"><button @click="modalConta=false" class="ios-btn-secondary">Cancelar</button><button @click="criarConta" :disabled="loadingConta" class="ios-btn-full bg-teal">{{ loadingConta?'Salvando...':'Salvar' }}</button></div>
  </div>
</div></div>
</Transition></Teleport>

<!-- MODAL ITEM -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="modalItem" class="ios-modal-bg" @click.self="modalItem=false">
<div class="ios-modal-card sm">
  <div class="ios-modal-header"><div><h3>{{ subAbaInv==='venda'?'📦 Item à Venda':'🛒 Compra' }}</h3></div><button @click="modalItem=false" class="ios-close">✕</button></div>
  <div class="ios-modal-body">
    <label class="ios-label">Nome</label><input v-model="formItem.nome" :placeholder="subAbaInv==='venda'?'Ex: Notebook...':'Ex: Teclado...'" class="ios-input"/>
    <label class="ios-label">Descrição</label><input v-model="formItem.descricao" placeholder="Condição, detalhes..." class="ios-input"/>
    <label class="ios-label">{{ subAbaInv==='venda'?'Preço':'Valor pago' }}</label><input ref="inputValorItem" @input="mascaraMoeda" inputmode="numeric" placeholder="R$ 0,00" class="ios-input-big"/>
    <div v-if="subAbaInv==='compra'"><label class="ios-label">Descontar de</label><div class="ios-chips"><button v-for="c in accounts.contas" :key="c.id" @click="formItem.accountId=c.id" :class="{active:formItem.accountId===c.id}" class="ios-chip">{{ c.banco }}</button></div></div>
    <div class="ios-btn-row"><button @click="modalItem=false" class="ios-btn-secondary">Cancelar</button><button @click="criarItem" :class="subAbaInv==='venda'?'bg-orange':'bg-blue'" class="ios-btn-full">Salvar</button></div>
  </div>
</div></div>
</Transition></Teleport>

<!-- MODAL VENDER ITEM -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="itemParaVenda" class="ios-modal-bg" @click.self="itemParaVenda=null">
<div class="ios-modal-card sm">
  <div class="ios-modal-header"><div><h3>💸 Vender Item</h3></div><button @click="itemParaVenda=null" class="ios-close">✕</button></div>
  <div class="ios-modal-body">
    <div style="text-align: center; margin-bottom: 1rem;">
      <p style="font-size: 2rem;">📦</p>
      <p style="font-weight: bold; font-size: 1.1rem; margin-top: .5rem;">{{ itemParaVenda.nome }}</p>
    </div>
    <label class="ios-label">Valor de venda</label>
    <input ref="inputValorVenda" @input="mascaraMoeda" inputmode="numeric" placeholder="R$ 0,00" class="ios-input-big"/>
    <label class="ios-label">Receber na conta</label>
    <div class="ios-chips wrap">
      <button v-for="c in accounts.contas" :key="c.id" @click="formVenda.accountId=c.id" :class="{active:formVenda.accountId===c.id}" class="ios-chip">{{ c.banco }}</button>
    </div>
    <div class="ios-btn-row">
      <button @click="itemParaVenda=null" class="ios-btn-secondary">Cancelar</button>
      <button @click="confirmarVenda" class="ios-btn-full bg-green">Vender</button>
    </div>
  </div>
</div></div>
</Transition></Teleport>

<!-- MODAL ALERTAS -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="modalAlertas" class="ios-modal-bg" @click.self="modalAlertas=false">
<div class="ios-modal-card">
  <div class="ios-modal-header"><div><h3>🔔 Alertas de Orçamento</h3></div><button @click="modalAlertas=false" class="ios-close">✕</button></div>
  <div class="ios-modal-body">
    <label class="ios-label">Categoria</label>
    <div class="ios-cat-grid compact"><button v-for="cat in categoriasSaida" :key="cat.id" @click="formAlerta.categoria=cat.id" :class="{active:formAlerta.categoria===cat.id}" class="ios-cat-btn"><span class="ios-cat-emoji">{{ cat.emoji }}</span><span>{{ cat.label }}</span></button></div>
    <div class="ios-inline-form"><input ref="inputValorAlerta" @input="mascaraMoeda" inputmode="numeric" placeholder="R$ 0,00" class="ios-input-big"/><button @click="salvarAlerta" :disabled="loadingAlerta" class="ios-btn-full bg-orange" style="flex-shrink:0;width:auto;padding:0 1.5rem">{{ budgets.budgets.find(b=>b.categoria===formAlerta.categoria)?'Atualizar':'Criar' }}</button></div>
    <hr class="ios-divider"/>
    <label class="ios-label">Configurados ({{ budgets.budgets.length }})</label>
    <div v-for="b in budgets.budgets" :key="b.id" class="ios-alert-row">
      <div class="ios-alert-row-icon" :class="b.gastoAtual>=b.limite?'wg-red':b.gastoAtual>=b.limite*0.7?'wg-orange':'wg-teal'">{{ emojiCat[b.categoria]||'📦' }}</div>
      <div class="ios-alert-row-body"><div class="ios-alert-row-top"><span>{{ labelCat[b.categoria] }}</span><span :class="b.gastoAtual>=b.limite?'wg-red-text':'wg-teal-text'" style="font-weight:800;font-size:.75rem">{{ formatar(b.gastoAtual) }} / {{ formatar(b.limite) }}</span></div><div class="ios-progress sm"><div :class="b.gastoAtual>=b.limite?'bg-red':b.gastoAtual>=b.limite*0.7?'bg-amber':'bg-teal'" :style="{width:Math.min((b.gastoAtual/b.limite)*100,100)+'%'}"></div></div></div>
      <button @click="toggleAlerta(b)" class="ios-sm-btn">{{ b.ativo?'🔔':'🔕' }}</button>
      <button @click="budgets.deletar(b.id).then(()=>mostrarToast('🗑️ Removido'))" class="ios-sm-btn danger">✕</button>
    </div>
    <button @click="modalAlertas=false" class="ios-btn-secondary" style="width:100%;margin-top:1rem">Fechar</button>
  </div>
</div></div>
</Transition></Teleport>

<!-- MODAL EDITAR -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="modalEditar" class="ios-modal-bg" @click.self="modalEditar=false">
<div class="ios-modal-card">
  <div class="ios-modal-header"><div><h3>✏️ Editar Transação</h3></div><button @click="modalEditar=false" class="ios-close">✕</button></div>
  <div class="ios-modal-body">
    <div class="ios-segmented sm"><button @click="formEditar.tipo='receita';formEditar.categoria='salario'" :class="{active:formEditar.tipo==='receita'}">⬆️ Entrada</button><button @click="formEditar.tipo='despesa';formEditar.categoria='mercado'" :class="{active:formEditar.tipo==='despesa'}">⬇️ Saída</button></div>
    <label class="ios-label">Categoria</label>
    <div class="ios-cat-grid compact"><button v-for="cat in (formEditar.tipo==='receita'?categoriasEntrada:categoriasSaida)" :key="cat.id" @click="formEditar.categoria=cat.id" :class="{active:formEditar.categoria===cat.id}" class="ios-cat-btn"><span class="ios-cat-emoji">{{ cat.emoji }}</span><span>{{ cat.label }}</span></button></div>
    <label class="ios-label">Conta</label>
    <div class="ios-chips wrap"><button v-for="c in accounts.contas" :key="c.id" @click="formEditar.accountId=c.id" :class="{active:formEditar.accountId===c.id}" class="ios-chip">{{ c.banco }}</button></div>
    <label class="ios-label">Valor</label><input ref="inputValorEditar" @input="mascaraMoeda" inputmode="numeric" placeholder="R$ 0,00" class="ios-input-big"/>
    <label class="ios-label">Descrição</label><input v-model="formEditar.descricao" placeholder="Descrição..." class="ios-input"/>
    <label class="ios-label">Data</label><input v-model="formEditar.data" type="date" class="ios-input"/>
    <div class="ios-btn-row"><button @click="modalEditar=false" class="ios-btn-secondary">Cancelar</button><button @click="salvarEdicao" :disabled="loadingEditar" :class="formEditar.tipo==='receita'?'bg-green':'bg-teal'" class="ios-btn-full">{{ loadingEditar?'Salvando...':'✅ Salvar' }}</button></div>
  </div>
</div></div>
</Transition></Teleport>

<!-- MODAL CONFIRMAR DELETE -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="contaParaDel" class="ios-modal-bg" @click.self="contaParaDel=null">
<div class="ios-modal-card sm" style="text-align:center">
  <div class="ios-modal-body">
    <p style="font-size:2.5rem;margin-bottom:.5rem">🗑️</p>
    <h3 style="margin-bottom:.25rem">Excluir {{ contaParaDel.banco }}?</h3>
    <p class="ios-muted">Esta ação não pode ser desfeita.</p>
    <div class="ios-btn-row" style="margin-top:1.5rem"><button @click="contaParaDel=null" class="ios-btn-secondary">Cancelar</button><button @click="deletarConta" class="ios-btn-full bg-red">Excluir</button></div>
  </div>
</div></div>
</Transition></Teleport>

</div>

<!-- FINORA FLOATING BUTTON -->
<button class="android-17-gemini-btn" @click="showFinoraChat = true">
  <span class="gemini-icon">✨</span> Fale com a Finora
</button>

<!-- FINORA CHAT MODAL -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="showFinoraChat" class="ios-modal-bg finora-chat-bg" @click.self="showFinoraChat = false">
  <div class="finora-chat-wrapper">
    <div class="finora-chat-rainbow-border"></div>
    <div class="finora-chat-card">
      <div class="ios-modal-header">
        <div style="display:flex;align-items:center;gap:.5rem"><span class="gemini-icon" style="font-size:1.2rem">✨</span> <h3>Finora IA</h3></div>
        <button @click="showFinoraChat=false" class="ios-close" style="margin-left:auto">✕</button>
      </div>
      <div class="finora-chat-body">
        <div v-for="(msg, i) in finoraMessages" :key="i" :class="['finora-msg', msg.role]">
          <div class="msg-bubble">
            <div v-if="msg.loading" class="finora-typing">
              <span></span><span></span><span></span>
            </div>
            <div v-else v-html="formatFinoraMessage(msg.text)"></div>
          </div>
        </div>
      </div>
      <div class="finora-chat-footer">
        <input v-model="finoraInput" @keyup.enter="sendFinoraMessage" type="text" placeholder="Pergunte sobre finanças..." class="ios-input" />
        <button @click="sendFinoraMessage" class="ios-btn-full" style="width:auto;padding:.6rem 1rem;background:linear-gradient(135deg,#7c3aed,#a855f7)">Enviar</button>
      </div>
    </div>
  </div>
</div>
</Transition></Teleport>

</template>

<style scoped>
.ios-app, .ios-modal-bg { --bg: #07030e; --surface: #0f081c; --surface2: #160c26; --surface3: #1e1135; --blue: #7c3aed; --green: #34d399; --red: #f472b6; --orange: #fb923c; --teal: #a78bfa; --purple: #c084fc; --neon: #b57aff; --neon2: #e879f9; --sep: rgba(139,120,255,.08); --text2: #8b89a8; --text3: rgba(139,137,168,.4); --r: 20px; --r-lg: 28px; color: #fff; font-family: -apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif; }
* { box-sizing: border-box; margin: 0; padding: 0; }
@keyframes neonPulse { 0%,100% { opacity: .6; } 50% { opacity: 1; } }
@keyframes neonFloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-8px) scale(1.03); } }
.ios-app { min-height: 100dvh; background-color: var(--bg); display: flex; flex-direction: column; overflow-x: hidden; transition: background 0.3s; }

/* Splash */
.ios-splash { position: fixed; inset: 0; background: var(--bg); display: flex; align-items: center; justify-content: center; z-index: 999; }
.ios-splash-inner { text-align: center; }
.ios-spinner { width: 28px; height: 28px; border: 2.5px solid rgba(255,255,255,.1); border-top-color: var(--teal); border-radius: 50%; animation: spin .7s linear infinite; margin: 0 auto; }
.ios-spinner.sm { width: 16px; height: 16px; border-width: 2px; }
.ios-spinner.white { border-color: rgba(255,255,255,.3); border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Toast */
.ios-toast { position: fixed; top: 1rem; left: 50%; transform: translateX(-50%); z-index: 9999; background: var(--surface2); border: 1px solid rgba(139,120,255,.15); color: #fff; padding: .75rem 1.5rem; border-radius: 99px; font-size: .85rem; font-weight: 600; backdrop-filter: blur(20px); box-shadow: 0 8px 32px rgba(10,5,30,.6), 0 0 20px rgba(124,58,237,.15); white-space: nowrap; }
.ios-toast-enter-active, .ios-toast-leave-active { transition: all .3s cubic-bezier(.2,1,.3,1); }
.ios-toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(.95); }
.ios-toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-8px); }

/* Overlay */
.ios-overlay { position: fixed; inset: 0; z-index: 9998; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; }
.ios-loading-card { background: var(--surface); border: 1px solid var(--sep); border-radius: var(--r); padding: 1.5rem 2rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 16px 48px rgba(0,0,0,.5); }
.ios-loading-card span { font-size: .875rem; color: var(--text2); }

/* Header */
.ios-header { background: rgba(12,11,20,.92); backdrop-filter: blur(24px) saturate(180%); border-bottom: 1px solid rgba(255,255,255,.04); padding: 0 1.5rem; height: 4rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 40; box-shadow: 0 4px 30px rgba(0,0,0,0.5); }
.ios-header-left { display: flex; align-items: center; gap: .75rem; }
.ios-logo { width: 2.25rem; height: 2.25rem; border-radius: 10px; background: linear-gradient(135deg, #7c3aed, #a855f7); display: flex; align-items: center; justify-content: center; font-size: 1rem; box-shadow: 0 0 16px rgba(124,58,237,.35); }
@media(min-width: 768px) { .ios-header-title { display: block !important; color: #fff; } }

.ios-header-nav { display: none; }
@media(min-width: 1024px) {
  .ios-header-nav {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    background: rgba(20, 18, 32, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 0.35rem;
    border-radius: 99px;
    border: 1px solid rgba(255, 255, 255, 0.04);
    position: relative;
    z-index: 50;
    pointer-events: auto;
    width: 480px;
    box-shadow: inset 0 2px 12px rgba(0,0,0,0.3);
  }
  .ios-nav-slider {
    position: absolute;
    top: 0.35rem;
    bottom: 0.35rem;
    left: 0.35rem;
    width: calc((100% - 0.7rem) / 5);
    background: linear-gradient(135deg, rgba(124,58,237,.35), rgba(192,132,252,.2));
    border: 0.5px solid rgba(192,132,252,.35);
    box-shadow: 0 8px 24px rgba(124,58,237,.25), inset 0 1px 1px rgba(255,255,255,0.15);
    border-radius: 99px;
    transition: transform 0.4s cubic-bezier(0.2, 1, 0.3, 1);
    z-index: 50;
    pointer-events: none;
  }
  .ios-header-tab {
    padding: 0.45rem 0;
    border-radius: 99px;
    border: none;
    background: transparent !important;
    color: var(--text3);
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.3s;
    position: relative;
    z-index: 51;
    text-align: center;
    box-shadow: none !important;
  }
  .ios-header-tab:hover { color: var(--text2); }
  .ios-header-tab.active {
    color: #fff;
    text-shadow: 0 2px 12px rgba(192,132,252,0.6);
  }
}

.ios-header-right { display: flex; align-items: center; gap: 0.75rem; }
.ios-user-badge { display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.03); padding: 0.35rem; padding-right: 1rem; border-radius: 99px; border: 1px solid rgba(255,255,255,0.04); }
@media(max-width: 767px) { .ios-user-badge { padding-right: 0.35rem; background: transparent; border: none; } }
.ios-avatar { width: 2.25rem; height: 2.25rem; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #a855f7); display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 800; flex-shrink: 0; box-shadow: 0 0 10px rgba(124,58,237,.25); }
@media(min-width: 768px) { .ios-greeting { display: block !important; font-size: 0.8rem; color: var(--text2); } .ios-greeting strong { color: #fff; } }

.ios-hdr-btn { width: 2.25rem; height: 2.25rem; border-radius: 50%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: .9rem; cursor: pointer; color: rgba(255,255,255,.6); transition: all .3s; }
.ios-hdr-btn:hover { background: rgba(255,255,255,0.08); color: #fff; transform: scale(1.05); }
.ios-hdr-btn-danger:hover { background: rgba(244,114,182,.1); color: var(--red); border-color: rgba(244,114,182,.2); }

/* Main */
.ios-main { flex: 1; padding: 1.5rem 1rem; padding-bottom: 6rem; display: flex; flex-direction: column; align-items: center; }
@media(min-width:1024px) { .ios-main { padding: 2.5rem 3rem 3rem; } }
.ios-content { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; max-width: 1100px; margin: 0 auto; }

/* Balance Card */
@keyframes borderGlow { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
.ios-balance-card { position: relative; border-radius: var(--r-lg); overflow: hidden; transform-style: preserve-3d; will-change: transform; padding: 1px; background: linear-gradient(135deg, rgba(124,58,237,.5), rgba(168,85,247,.35), rgba(192,132,252,.2)); box-shadow: 0 10px 50px rgba(0,0,0,0.6), 0 0 40px rgba(124,58,237,.08); }
.ios-balance-inner { position: relative; z-index: 1; padding: 2rem; background: linear-gradient(160deg, rgba(20,19,32,.95) 20%, rgba(60,40,120,.4) 80%, rgba(100,60,160,.3)); border-radius: calc(var(--r-lg) - 1px); overflow: hidden; }
.ios-balance-inner::after { content: ''; position: absolute; top: 0; right: 0; width: 50%; height: 100%; background: radial-gradient(ellipse at 100% 0%, rgba(124,58,237,.2), transparent 60%); pointer-events: none; }
.ios-balance-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; position: relative; z-index: 1; }
.ios-balance-label { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: rgba(255,255,255,.5); }
.ios-balance-sub { font-size: .65rem; color: rgba(255,255,255,.3); margin-top: .15rem; }
.ios-balance-badge { font-size: .65rem; background: rgba(255,255,255,.06); border: .5px solid rgba(255,255,255,.1); padding: .3rem .75rem; border-radius: 99px; color: rgba(255,255,255,.6); text-transform: capitalize; backdrop-filter: blur(10px); }
.ios-balance-value { font-size: 2.75rem; font-weight: 800; letter-spacing: -.03em; font-variant-numeric: tabular-nums; transition: all .5s cubic-bezier(.2,1,.3,1); line-height: 1.1; margin-bottom: .75rem; position: relative; z-index: 1; color: #fff; -webkit-text-fill-color: #fff; }
.ios-balance-value.up { filter: drop-shadow(0 0 24px rgba(52,211,153,.6)); transform: scale(1.03); }
.ios-balance-value.down { filter: drop-shadow(0 0 24px rgba(244,114,182,.6)); transform: scale(.97); }
.ios-balance-diff { position: absolute; right: 1.75rem; top: 5rem; font-size: .75rem; font-weight: 800; padding: .25rem .7rem; border-radius: 99px; backdrop-filter: blur(12px); z-index: 2; }
.ios-balance-diff.pos { background: rgba(52,211,153,.12); color: var(--green); border: .5px solid rgba(52,211,153,.3); box-shadow: 0 4px 16px rgba(52,211,153,.15), 0 0 8px rgba(52,211,153,.1); }
.ios-balance-diff.neg { background: rgba(244,114,182,.12); color: var(--red); border: .5px solid rgba(244,114,182,.3); box-shadow: 0 4px 16px rgba(244,114,182,.15), 0 0 8px rgba(244,114,182,.1); }
.ios-diff-enter-active { transition: all .4s cubic-bezier(.2,1,.3,1); }
.ios-diff-leave-active { transition: all .6s; }
.ios-diff-enter-from { opacity: 0; transform: translateY(6px) scale(.85); }
.ios-diff-leave-to { opacity: 0; transform: translateY(-10px); }
.ios-balance-bar { height: 5px; border-radius: 99px; background: rgba(255,255,255,.06); overflow: hidden; margin-bottom: .6rem; position: relative; z-index: 1; }
.ios-balance-bar-fill { height: 100%; border-radius: 99px; transition: width 1s ease; position: relative; }
.ios-balance-bar-fill.good { background: linear-gradient(90deg, var(--green), var(--teal)); box-shadow: 0 0 12px rgba(52,211,153,.4), 0 0 4px rgba(167,139,250,.3); }
.ios-balance-bar-fill.warn { background: linear-gradient(90deg, var(--orange), var(--red)); box-shadow: 0 0 12px rgba(244,114,182,.4); }
.ios-balance-row { display: flex; justify-content: space-between; font-size: .72rem; font-weight: 600; color: var(--text2); position: relative; z-index: 1; }

/* Quick Actions */
.ios-quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
@media(min-width:640px) { .ios-quick-grid { grid-template-columns: repeat(4, 1fr); } }
.ios-quick-btn { display: flex; flex-direction: column; align-items: center; gap: .75rem; padding: 1.25rem .5rem; border-radius: 24px; background: rgba(20,19,32,.8); border: .5px solid rgba(255,255,255,.05); cursor: pointer; transition: all .3s cubic-bezier(.2,1,.3,1); color: #fff; font-family: inherit; box-shadow: 0 4px 20px rgba(0,0,0,.4); position: relative; overflow: hidden; }
.ios-quick-btn::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 0%, rgba(124,58,237,0.1), transparent 70%); opacity: 0; transition: opacity .3s; pointer-events: none; }
.ios-quick-btn:hover { transform: translateY(-5px); box-shadow: 0 8px 30px rgba(0,0,0,.5), 0 0 20px rgba(124,58,237,.1); border-color: rgba(124,58,237,.2); }
.ios-quick-btn:hover::before { opacity: 1; }
.ios-quick-btn:active { transform: scale(.96); }
.ios-quick-btn span:last-child { font-size: .8rem; font-weight: 600; color: rgba(255,255,255,.7); letter-spacing: .02em; }
.ios-quick-icon { width: 3.5rem; height: 3.5rem; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: rgba(255,255,255,.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); transition: transform .3s; color: #fff; }
.ios-quick-btn:hover .ios-quick-icon { transform: scale(1.1) rotate(5deg); }
.qb-green { background: rgba(52,211,153,.08); color: var(--green); }
.qb-blue { background: rgba(124,58,237,.08); color: var(--blue); }
.qb-orange { background: rgba(251,146,60,.08); color: var(--orange); }
.qb-purple { background: rgba(192,132,252,.08); color: var(--purple); }

/* Widgets */
.ios-summary-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
@media(min-width:640px) { .ios-summary-grid { grid-template-columns: repeat(3, 1fr); } }
.ios-widget { background: rgba(20,19,32,.85); border-radius: 28px; padding: 1.5rem; cursor: pointer; transition: all .4s cubic-bezier(.2,1,.3,1); transform-style: preserve-3d; display: flex; flex-direction: column; position: relative; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.4); border: .5px solid rgba(255,255,255,.04); }
.ios-widget::before { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent); transform: skewX(-20deg); transition: all .7s ease; }
.ios-widget::after { content: ''; position: absolute; top: 0; right: 0; width: 150px; height: 150px; background: radial-gradient(circle, rgba(124,58,237,0.04) 0%, transparent 70%); transform: translate(30%, -30%); pointer-events: none; }
.ios-widget:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 12px 40px rgba(0,0,0,.5), 0 0 25px rgba(124,58,237,.08); border-color: rgba(124,58,237,.15); }
.ios-widget:hover::before { left: 150%; }
.ios-widget-icon { width: 2.75rem; height: 2.75rem; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; margin-bottom: 1rem; box-shadow: inset 0 0 0 1px rgba(255,255,255,.04); color: #fff; }
.ios-widget-label { font-size: .8rem; font-weight: 600; color: var(--text2); margin-bottom: .35rem; text-transform: uppercase; letter-spacing: .05em; }
.ios-widget-value { font-weight: 800; font-size: 1.5rem; font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
.wg-green { background: rgba(52,211,153,.1); color: rgba(52,211,153,.9); }
.wg-red { background: rgba(244,114,182,.1); color: rgba(244,114,182,.9); }
.wg-teal { background: rgba(167,139,250,.1); color: rgba(167,139,250,.9); }
.wg-purple { background: rgba(192,132,252,.1); color: rgba(192,132,252,.9); }
.wg-orange { background: rgba(251,146,60,.1); color: rgba(251,146,60,.9); }
.wg-green-text { color: var(--green); text-shadow: 0 0 18px rgba(52,211,153,.35); }
.wg-red-text { color: var(--red); text-shadow: 0 0 18px rgba(244,114,182,.35); }
.wg-teal-text { color: var(--teal); text-shadow: 0 0 18px rgba(167,139,250,.35); }
.wg-purple-text { color: var(--purple); text-shadow: 0 0 18px rgba(192,132,252,.35); }
.wg-orange-text { color: var(--orange); text-shadow: 0 0 18px rgba(251,146,60,.35); }
.wg-blue-text { color: var(--blue); text-shadow: 0 0 18px rgba(124,58,237,.35); }

/* Widget Cards */
.ios-widget-card { background: rgba(20,19,32,.85); border-radius: 28px; overflow: hidden; transition: all .4s ease; transform-style: preserve-3d; box-shadow: 0 4px 20px rgba(0,0,0,.4); border: .5px solid rgba(255,255,255,.04); }
.ios-widget-card:hover { border-color: rgba(124,58,237,.12); box-shadow: 0 8px 30px rgba(0,0,0,.5); }
.ios-wc-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,.04); font-size: 1rem; font-weight: 700; letter-spacing: .02em; background: rgba(0,0,0,0.15); }
.ios-wc-title { font-size: .8rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text2); padding: 0 1.5rem; padding-top: 1.5rem; margin-bottom: 1rem; }
.ios-link { color: var(--neon); font-size: .8rem; font-weight: 600; background: none; border: none; cursor: pointer; font-family: inherit; transition: color .2s; }
.ios-link:hover { color: var(--purple); text-decoration: none; }

/* Account rows */
.ios-account-row { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,.03); transition: background .3s; }
.ios-account-row:first-child { border-top: none; }
.ios-account-row:hover { background: rgba(255,255,255,.02); }
.ios-acc-icon { width: 2.5rem; height: 2.5rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 800; flex-shrink: 0; box-shadow: 0 4px 10px rgba(10,5,30,0.2); transition: transform .3s; }
.ios-account-row:hover .ios-acc-icon { transform: scale(1.08); }
.ios-acc-icon.lg { width: 3rem; height: 3rem; font-size: 1.25rem; border-radius: 14px; }
.ios-acc-info { flex: 1; min-width: 0; }
.ios-acc-name { font-size: .9rem; font-weight: 600; letter-spacing: .01em; color: rgba(255,255,255,.9); }
.ios-acc-bar { height: 3px; border-radius: 99px; background: rgba(139,120,255,.06); margin-top: .35rem; overflow: hidden; }
.ios-acc-bar.full { margin-top: .5rem; }
.ios-acc-bar div { height: 100%; border-radius: 99px; transition: width .7s ease; }
.ios-acc-val { font-weight: 800; font-size: .85rem; font-variant-numeric: tabular-nums; flex-shrink: 0; }

/* Alerts */
.ios-alert-card { background: rgba(20,19,32,.8); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-radius: 20px; overflow: hidden; display: flex; align-items: center; gap: .75rem; padding: .85rem 1rem; border: .5px solid rgba(255,255,255,.04); }
.ios-alert-card.ios-alert-danger { border-color: rgba(244,114,182,.2); }
.ios-alert-card.ios-alert-warn { border-color: rgba(251,146,60,.2); }
.ios-alert-icon { width: 2.5rem; height: 2.5rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; background: rgba(255,255,255,.03); }
.ios-alert-body { flex: 1; min-width: 0; }
.ios-alert-title { font-size: .8rem; font-weight: 700; margin-bottom: .15rem; }
.ios-alert-danger .ios-alert-title { color: var(--red); text-shadow: 0 0 10px rgba(244,114,182,.2); }
.ios-alert-warn .ios-alert-title { color: var(--orange); text-shadow: 0 0 10px rgba(251,146,60,.2); }
.ios-alert-sub { font-size: .7rem; color: var(--text2); }
.ios-alert-sub strong { font-weight: 800; }
.ios-alert-bar { height: 3px; border-radius: 99px; background: rgba(255,255,255,.06); margin-top: .5rem; overflow: hidden; }
.ios-alert-bar div { height: 100%; border-radius: 99px; transition: width .7s; }
.bg-red { background: var(--red); }
.bg-amber { background: var(--orange); }
.bg-green { background: var(--green); }
.bg-blue { background: var(--blue); }
.bg-teal { background: var(--teal); }
.bg-orange { background: var(--orange); }
.bg-purple { background: var(--purple); }

/* Empty states */
.ios-empty-card { background: rgba(20,19,32,.6); border: 1px dashed rgba(255,255,255,.08); border-radius: 20px; padding: 2.5rem 1rem; text-align: center; color: var(--text2); font-size: .85rem; }
.ios-empty-small { text-align: center; color: var(--text3); font-size: .8rem; padding: 1.5rem 0; }
.ios-muted { color: var(--text2); font-size: .75rem; }

/* Contas tab */
.ios-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .5rem; }
.ios-section-title { font-size: 1.1rem; font-weight: 800; }
.ios-total-banner { background: linear-gradient(135deg, rgba(124,58,237,.06), rgba(192,132,252,.04)); border: .5px solid rgba(124,58,237,.12); border-radius: var(--r); padding: 1rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
.ios-total-banner p:first-child { font-size: .8rem; color: var(--text2); }
.ios-total-val { font-size: 1.25rem; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
.ios-cards-grid { display: grid; grid-template-columns: 1fr; gap: .75rem; }
@media(min-width:640px) { .ios-cards-grid { grid-template-columns: repeat(2, 1fr); } }
.ios-conta-card { background: rgba(20,19,32,.8); border: .5px solid rgba(255,255,255,.04); border-radius: 24px; padding: 1.5rem; position: relative; overflow: hidden; transition: all .3s; transform-style: preserve-3d; box-shadow: 0 4px 20px rgba(0,0,0,.35); }
.ios-conta-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,.5); border-color: rgba(124,58,237,.12); }
.ios-conta-top-bar { position: absolute; top: 0; left: 0; right: 0; height: 2px; }
.ios-conta-header { display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; }
.ios-del-btn { margin-left: auto; width: 1.75rem; height: 1.75rem; border-radius: 8px; background: none; border: none; color: var(--text3); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: .7rem; transition: all .2s; opacity: .4; }
.ios-conta-card:hover .ios-del-btn { opacity: 1; }
.ios-del-btn:hover { background: rgba(244,114,182,.1); color: var(--red); }
.ios-conta-saldo { font-size: 1.75rem; font-weight: 800; font-variant-numeric: tabular-nums; margin-bottom: .75rem; }
.ios-conta-footer { display: flex; justify-content: space-between; font-size: .7rem; color: var(--text3); margin-bottom: .35rem; }
.ios-conta-footer span:last-child { font-weight: 600; }

/* Pills & chips */
.ios-pill-btn { font-size: .7rem; font-weight: 600; padding: .35rem .75rem; border-radius: 99px; border: none; cursor: pointer; transition: all .2s; font-family: inherit; background: rgba(124,58,237,.1); color: var(--neon); }
.ios-pill-btn:hover { background: rgba(124,58,237,.2); box-shadow: 0 0 10px rgba(124,58,237,.15); }
.ios-pill-btn.blue { background: rgba(124,58,237,.1); color: var(--blue); }
.ios-pill-btn.green { background: rgba(52,211,153,.1); color: var(--green); }

/* Segmented control */
.ios-segmented { display: flex; background: rgba(20,19,32,.8); border: .5px solid rgba(255,255,255,.04); border-radius: 12px; padding: 3px; gap: 3px; margin-bottom: .75rem; }
.ios-segmented.sm { margin-bottom: .5rem; }
.ios-segmented button { flex: 1; padding: .6rem; border-radius: 9px; border: none; background: none; color: var(--text2); font-size: .75rem; font-weight: 600; cursor: pointer; transition: all .25s; font-family: inherit; }
.ios-segmented button.active { background: linear-gradient(135deg, var(--blue), rgba(192,132,252,.7)); color: #fff; box-shadow: 0 2px 12px rgba(124,58,237,.35), 0 0 8px rgba(192,132,252,.15); }

/* Transaction list */
.ios-list-header { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: .5px solid rgba(139,120,255,.06); border-radius: var(--r); padding: .7rem 1rem; font-size: .75rem; color: var(--text3); margin-bottom: .5rem; }
.ios-list-total { font-weight: 800; font-size: .85rem; }
.ios-tx-row { display: flex; align-items: center; gap: .7rem; padding: .75rem 1rem; transition: background .2s; }
.ios-tx-row:hover { background: rgba(255,255,255,.02); }
.ios-tx-row.bordered { border-top: .5px solid rgba(255,255,255,.04); }
.ios-tx-icon { width: 2.25rem; height: 2.25rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: .9rem; flex-shrink: 0; }
.ios-tx-info { flex: 1; min-width: 0; }
.ios-tx-desc { font-size: .85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ios-tx-right { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }
.ios-tx-actions { display: flex; gap: 2px; opacity: 0; transition: opacity .2s; }
.ios-tx-row:hover .ios-tx-actions { opacity: 1; }
.ios-sm-btn { width: 1.75rem; height: 1.75rem; border-radius: 8px; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: .7rem; color: var(--text3); transition: all .2s; }
.ios-sm-btn:hover { background: rgba(167,139,250,.1); color: var(--teal); }
.ios-sm-btn.danger:hover { background: rgba(244,114,182,.1); color: var(--red); }

/* Metrics */
.ios-metrics-section { display: flex; flex-direction: column; gap: .75rem; }
.ios-period-label { font-size: .85rem; font-weight: 600; text-transform: capitalize; margin-bottom: .25rem; display: flex; align-items: center; gap: .5rem; }
.ios-period-label::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--purple); box-shadow: 0 0 6px rgba(192,132,252,.5); }

/* Donuts */
.ios-donut-row { display: flex; align-items: center; gap: 1.5rem; padding: 0 1rem .75rem; }
.ios-donut-wrap { position: relative; flex-shrink: 0; width: 8rem; height: 8rem; }
.ios-donut { width: 100%; height: 100%; transform: rotate(-90deg); }
.ios-donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ios-donut-legend { flex: 1; display: flex; flex-direction: column; gap: .4rem; }
.ios-legend-item { display: flex; align-items: center; gap: .5rem; }
.ios-legend-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.ios-legend-label { font-size: .75rem; color: var(--text2); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ios-legend-pct { font-size: .75rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.ios-cat-bars { padding: .75rem 1rem 1rem; display: flex; flex-direction: column; gap: .75rem; }
.ios-cat-bar-header { display: flex; justify-content: space-between; font-size: .8rem; margin-bottom: .35rem; }
.ios-cat-bar-header span:first-child { font-weight: 600; }
.ios-progress { height: 5px; border-radius: 99px; background: rgba(255,255,255,.04); overflow: hidden; }
.ios-progress.sm { height: 3px; }
.ios-progress div { height: 100%; border-radius: 99px; transition: width .7s ease; }

/* Bottom Nav */
.ios-bottomnav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 40; background: rgba(12,11,20,.94); backdrop-filter: blur(24px) saturate(180%); border-top: .5px solid rgba(255,255,255,.04); }
@media(min-width:1024px) { .ios-bottomnav { display: none; } }
.ios-bottomnav-inner { display: flex; align-items: center; justify-content: space-around; max-width: 28rem; margin: 0 auto; padding: .35rem .5rem; padding-bottom: max(6px, env(safe-area-inset-bottom)); }
.ios-tab-btn { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: .25rem .5rem; background: none; border: none; cursor: pointer; color: rgba(255,255,255,.3); transition: color .2s; font-family: inherit; min-width: 3rem; }
.ios-tab-btn.active { color: #fff; }
.ios-tab-icon { font-size: 1.25rem; }
.ios-tab-label { font-size: .6rem; font-weight: 600; }
.ios-fab { display: flex; flex-direction: column; align-items: center; gap: 2px; background: none; border: none; cursor: pointer; margin-top: -.75rem; font-family: inherit; }
.ios-fab-inner { width: 3rem; height: 3rem; border-radius: 16px; background: linear-gradient(135deg, #7c3aed, #a855f7); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; box-shadow: 0 4px 20px rgba(124,58,237,.4); transition: transform .2s; }
.ios-fab:active .ios-fab-inner { transform: scale(.92); }

/* Modals */
.ios-modal-bg { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 1rem; }
.ios-modal-card { background: rgba(18,16,30,0.75); backdrop-filter: blur(40px) saturate(180%); -webkit-backdrop-filter: blur(40px) saturate(180%); border: .5px solid rgba(255,255,255,.05); border-radius: var(--r-lg); width: 100%; max-width: 28rem; max-height: 90dvh; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,.7); }
.ios-modal-card.sm { max-width: 24rem; }
.ios-modal-header { display: flex; align-items: center; gap: .75rem; padding: 1rem 1.25rem; border-bottom: .5px solid rgba(255,255,255,.04); position: sticky; top: 0; background: rgba(18,16,30,0.8); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); z-index: 1; border-radius: var(--r-lg) var(--r-lg) 0 0; }
.ios-modal-header h3 { font-size: .9rem; font-weight: 700; color: #fff; }
.ios-modal-header div { flex: 1; }
.ios-modal-progress { height: 2px; background: rgba(139,120,255,.06); }
.ios-modal-progress div { height: 100%; border-radius: 99px; transition: width .4s ease; }
.ios-modal-body { padding: 1.25rem; display: flex; flex-direction: column; gap: .75rem; }
.ios-back, .ios-close { width: 1.75rem; height: 1.75rem; border-radius: 50%; background: rgba(255,255,255,.06); border: none; color: rgba(255,255,255,.5); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 700; transition: all .2s; flex-shrink: 0; }
.ios-back:hover, .ios-close:hover { background: rgba(255,255,255,.1); color: #fff; }

/* Modal elements */
.ios-step { display: flex; flex-direction: column; gap: .65rem; }
.ios-step-title { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--text2); }
.ios-option-btn { display: flex; align-items: center; gap: .75rem; padding: .85rem; border-radius: 14px; border: .5px solid rgba(255,255,255,.05); background: rgba(255,255,255,.02); cursor: pointer; transition: all .2s; text-align: left; width: 100%; color: #fff; font-family: inherit; }
.ios-option-btn:hover { background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.08); }
.ios-option-btn:active { transform: scale(.98); }
.ios-option-btn.selected { border-color: rgba(124,58,237,.4); background: rgba(124,58,237,.08); box-shadow: 0 0 12px rgba(124,58,237,.1); }
.ios-option-btn:disabled { opacity: .4; cursor: not-allowed; }
.ios-option-btn.green { border-color: rgba(52,211,153,.2); }
.ios-option-btn.green:hover { background: rgba(52,211,153,.06); }
.ios-option-btn.red { border-color: rgba(244,114,182,.2); }
.ios-option-btn.red:hover { background: rgba(244,114,182,.06); }
.ios-option-btn.teal { border-color: rgba(167,139,250,.2); }
.ios-option-btn.blue { border-color: rgba(124,58,237,.2); }
.ios-option-icon { width: 2.75rem; height: 2.75rem; border-radius: 14px; background: rgba(255,255,255,.03); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
.ios-option-title { font-size: .9rem; font-weight: 700; }
.ios-chevron { color: var(--text3); font-size: 1.2rem; margin-left: auto; }
.ios-context-bar { display: flex; align-items: center; gap: .75rem; background: rgba(255,255,255,.02); border-radius: 12px; padding: .6rem .85rem; font-size: 1.3rem; }
.ios-input { width: 100%; background: rgba(255,255,255,.03); border: .5px solid rgba(255,255,255,.06); border-radius: 12px; padding: .7rem .85rem; color: #fff; font-size: .85rem; outline: none; transition: border-color .2s, box-shadow .2s; font-family: inherit; }
.ios-input:focus { border-color: var(--blue); box-shadow: 0 0 12px rgba(124,58,237,.12); }
.ios-input::placeholder { color: var(--text3); }
.ios-input-group { position: relative; }
.ios-input-prefix { position: absolute; left: .85rem; top: 50%; transform: translateY(-50%); color: var(--text3); font-size: .85rem; font-weight: 700; }
.ios-input-big { width: 100%; background: rgba(255,255,255,.03); border: .5px solid rgba(255,255,255,.06); border-radius: 14px; padding: 1rem 1rem 1rem 2.75rem; color: #fff; font-size: 1.5rem; font-weight: 800; text-align: center; outline: none; transition: border-color .2s, box-shadow .2s; font-family: inherit; font-variant-numeric: tabular-nums; }
.ios-input-big:focus { border-color: var(--blue); box-shadow: 0 0 16px rgba(124,58,237,.15); }
.ios-input-big::placeholder { color: rgba(255,255,255,.08); }
.ios-chips { display: flex; flex-wrap: wrap; gap: .35rem; }
.ios-chips.wrap { flex-wrap: wrap; }
.ios-chip { padding: .4rem .75rem; border-radius: 99px; border: .5px solid rgba(255,255,255,.06); background: rgba(255,255,255,.03); color: var(--text2); font-size: .75rem; font-weight: 600; cursor: pointer; transition: all .2s; font-family: inherit; }
.ios-chip:hover { background: rgba(255,255,255,.06); }
.ios-chip.active { border-color: var(--neon); background: rgba(124,58,237,.1); color: var(--neon); }
.ios-cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .35rem; }
.ios-cat-grid.compact { grid-template-columns: repeat(4, 1fr); }
.ios-cat-btn { display: flex; flex-direction: column; align-items: center; gap: .25rem; padding: .6rem .25rem; border-radius: 12px; border: .5px solid rgba(255,255,255,.05); background: rgba(255,255,255,.02); cursor: pointer; transition: all .2s; color: var(--text2); font-family: inherit; }
.ios-cat-btn:hover { background: rgba(255,255,255,.05); }
.ios-cat-btn:active { transform: scale(.95); }
.ios-cat-btn.active { border-color: var(--neon); background: rgba(124,58,237,.08); color: #fff; }
.ios-cat-emoji { font-size: 1.3rem; }
.ios-cat-btn span:last-child { font-size: .65rem; font-weight: 600; }
.ios-btn-full { width: 100%; padding: .85rem; border-radius: 14px; border: none; color: #fff; font-size: .85rem; font-weight: 700; cursor: pointer; transition: all .2s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: .5rem; }
.ios-btn-full:hover { filter: brightness(1.1); box-shadow: 0 0 20px rgba(124,58,237,.2); }
.ios-btn-full:active { transform: scale(.98); }
.ios-btn-full:disabled { opacity: .5; cursor: not-allowed; }
.ios-btn-secondary { flex: 1; padding: .75rem; border-radius: 14px; border: none; background: var(--surface2); color: var(--text2); font-size: .85rem; font-weight: 600; cursor: pointer; transition: all .2s; font-family: inherit; }
.ios-btn-secondary:hover { background: var(--surface3); }
.ios-btn-row { display: flex; gap: .5rem; margin-top: .5rem; }
.ios-label { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text3); }
.ios-bank-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .35rem; margin-bottom: .5rem; }
.ios-color-row { display: flex; gap: .5rem; flex-wrap: wrap; }
.ios-color-dot { width: 2.25rem; height: 2.25rem; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: all .2s; }
.ios-color-dot:hover { transform: scale(1.15); }
.ios-color-dot.active { border-color: #fff; transform: scale(1.15); box-shadow: 0 0 16px rgba(124,58,237,.3); }
.ios-divider { border: none; border-top: .5px solid rgba(139,120,255,.06); margin: .5rem 0; }
.ios-inline-form { display: flex; gap: .5rem; align-items: stretch; }
.ios-inline-form .ios-input-big { padding-left: .75rem; text-align: left; }
.ios-search-wrap { position: relative; display: flex; align-items: center; gap: .5rem; }
.ios-search-wrap > span { position: absolute; left: .75rem; font-size: .85rem; }
.ios-search-wrap .ios-input { padding-left: 2rem; }
.ios-search-wrap .ios-spinner { position: absolute; right: .75rem; }
.ios-user-list { display: flex; flex-direction: column; gap: .35rem; max-height: 40vh; overflow-y: auto; }
.ios-user-avatar { width: 2.25rem; height: 2.25rem; border-radius: 50%; background: rgba(124,58,237,.08); display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 700; color: var(--neon); flex-shrink: 0; }
.ios-loading-inline { display: flex; align-items: center; justify-content: center; gap: .75rem; padding: 2rem; color: var(--text3); font-size: .85rem; }
.ios-alert-row { display: flex; align-items: center; gap: .65rem; background: rgba(255,255,255,.02); border: .5px solid rgba(255,255,255,.04); border-radius: 12px; padding: .65rem .75rem; }
.ios-alert-row-icon { width: 2rem; height: 2rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: .85rem; flex-shrink: 0; }
.ios-alert-row-body { flex: 1; min-width: 0; }
.ios-alert-row-top { display: flex; justify-content: space-between; align-items: center; font-size: .8rem; font-weight: 600; margin-bottom: .3rem; }

/* Finora Floating Button (Android 17 Style) */
.android-17-gemini-btn { position: fixed; bottom: calc(max(1rem, env(safe-area-inset-bottom)) + 4rem); left: 50%; transform: translateX(-50%); z-index: 45; background: rgba(20,18,32, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(192,132,252,.4); border-radius: 99px; padding: .65rem 1.5rem; display: flex; align-items: center; gap: .6rem; color: #fff; font-weight: 600; font-size: .9rem; box-shadow: 0 4px 24px rgba(124,58,237,.3), inset 0 0 12px rgba(192,132,252,.1); cursor: pointer; transition: all .3s cubic-bezier(.2,1,.3,1); font-family: inherit; }
@media(min-width:1024px) { .android-17-gemini-btn { bottom: 2rem; } }
.android-17-gemini-btn::before { content: ''; position: absolute; inset: -1px; border-radius: 99px; background: linear-gradient(90deg, #7c3aed, #e879f9, #7c3aed, #a78bfa, #7c3aed); background-size: 200% auto; z-index: -1; animation: borderGlowAnim 3s linear infinite; opacity: 0.6; transition: opacity .3s; }
.android-17-gemini-btn:hover { transform: translateX(-50%) scale(1.05); box-shadow: 0 8px 32px rgba(124,58,237,.5), inset 0 0 16px rgba(192,132,252,.3); }
.android-17-gemini-btn:hover::before { opacity: 1; }
.android-17-gemini-btn:active { transform: translateX(-50%) scale(0.95); }
@keyframes borderGlowAnim { to { background-position: 200% center; } }
.gemini-icon { filter: drop-shadow(0 0 8px rgba(232,121,249,0.8)); }

/* Finora Chat Modal */
.finora-chat-bg { background: rgba(0,0,0,.75); z-index: 10000; }
.finora-chat-wrapper { position: relative; width: 100%; max-width: 26rem; margin: auto; padding: 1.5px; border-radius: calc(var(--r-lg) + 1.5px); overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.8); }
.finora-chat-rainbow-border { position: absolute; inset: -50%; background: conic-gradient(from 0deg, transparent 0%, rgba(124,58,237,0.8) 20%, rgba(232,121,249,0.8) 40%, rgba(52,211,153,0.8) 60%, rgba(124,58,237,0.8) 80%, transparent 100%); animation: spinRainbow 4s linear infinite; z-index: 0; }
@keyframes spinRainbow { to { transform: rotate(360deg); } }
.finora-chat-card { position: relative; z-index: 1; background: #160e26; border: 1px solid rgba(255,255,255,.05); border-radius: calc(var(--r-lg) - 1px); display: flex; flex-direction: column; height: 75vh; max-height: 650px; }
.ios-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.25rem 0; border-bottom: 1px solid rgba(255,255,255,.03); padding-bottom: 1rem; }
.finora-chat-body { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.1) transparent; }
.finora-chat-body::-webkit-scrollbar { width: 4px; }
.finora-chat-body::-webkit-scrollbar-track { background: transparent; }
.finora-chat-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 10px; }
.finora-chat-body::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.2); }
.finora-chat-footer { padding: .75rem 1rem; border-top: 1px solid rgba(255,255,255,.05); display: flex; gap: .5rem; background: rgba(0,0,0,.2); border-radius: 0 0 var(--r-lg) var(--r-lg); }
.finora-msg { display: flex; width: 100%; }
.finora-msg.user { justify-content: flex-end; }
.finora-msg.bot { justify-content: flex-start; }
.msg-bubble { max-width: 85%; padding: .75rem 1rem; font-size: .85rem; line-height: 1.4; border-radius: 18px; white-space: pre-wrap; }
.finora-msg.user .msg-bubble { background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; border-bottom-right-radius: 4px; box-shadow: 0 4px 12px rgba(124,58,237,.3); }
.finora-msg.bot .msg-bubble { background: rgba(255,255,255,.06); color: var(--text2); border-bottom-left-radius: 4px; border: 1px solid rgba(255,255,255,.05); }
.finora-msg.bot .msg-bubble :deep(strong) { font-weight: 800; color: #fff; }
.finora-msg.bot .msg-bubble :deep(em) { font-style: italic; color: rgba(255,255,255,.8); }
.finora-typing { display: flex; gap: 4px; padding: 4px 2px; align-items: center; justify-content: center; height: 1.25rem; }
.finora-typing span { width: 6px; height: 6px; background: rgba(255,255,255,.5); border-radius: 50%; animation: finoraTyping 1.4s infinite ease-in-out both; }
.finora-typing span:nth-child(1) { animation-delay: -0.32s; }
.finora-typing span:nth-child(2) { animation-delay: -0.16s; }
@keyframes finoraTyping { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

/* Transitions */
.ios-modal-enter-active { transition: all .35s cubic-bezier(.2,1,.3,1); }
.ios-modal-leave-active { transition: all .25s ease; }
.ios-modal-enter-from, .ios-modal-leave-to { opacity: 0; }
.ios-modal-enter-from .ios-modal-card { transform: translateY(30px) scale(.97); }
.ios-modal-leave-to .ios-modal-card { transform: translateY(10px) scale(.99); }
.ios-step-enter-active, .ios-step-leave-active { transition: all .2s ease; }
.ios-step-enter-from { opacity: 0; transform: translateX(12px); }
.ios-step-leave-to { opacity: 0; transform: translateX(-12px); }
.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
