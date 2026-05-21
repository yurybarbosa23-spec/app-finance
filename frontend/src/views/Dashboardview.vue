<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAuthStore }         from '../stores/auth'
import { useAccountsStore }     from '../stores/accounts'
import { useTransactionsStore } from '../stores/transactions'
import { useBudgetsStore }     from '../stores/budgets'
import { useItemsStore }        from '../stores/items'
import { useBillsStore }        from '../stores/bills'
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
const billsStore = useBillsStore()
const { mascaraMoeda, parseMoeda, formatar, formatarParaInput } = useCurrency()


// ── Navegação items
const navItems = [
  { val:'inicio',        icon:'🏠', label:'Início'    },
  { val:'contas',        icon:'🏦', label:'Contas'    },
  { val:'historico',     icon:'📋', label:'Histórico' },
  { val:'metricas',      icon:'📊', label:'Métricas'  },
  { val:'investimentos', icon:'📦', label:'Itens'     },
  { val:'dividas',       icon:'💸', label:'Dívidas'   },
]

// ── Navegação
const aba             = ref('inicio')
const subAbaInv       = ref('venda')
const subAbaHistorico = ref('lancamentos')
const subAbaDivida    = ref('todas')

// ── Modais
const modalLancamento    = ref(false)
const modalConta         = ref(false)
const modalItem          = ref(false)
const modalTransferencia = ref(false)
const modalEditar        = ref(false)
const modalAlertas       = ref(false)
const modalBill          = ref(false)
const appCarregando      = ref(true)
const loadingGlobal      = ref(false)
const loadingMsg         = ref('Carregando...')
const itemParaVenda      = ref(null)
const contaParaDel       = ref(null)
const billParaPagar      = ref(null)

// ── Finora IA Chat
const showFinoraChat = ref(false)
const finoraInput = ref('')
const finoraIsThinking = ref(false)
const finoraHasTyped = ref(false)
const finoraMessages = ref([
  { role: 'bot', text: 'Olá! Sou a Finora, sua assistente financeira inteligente. Posso analisar seus gastos, sugerir investimentos ou explicar tendências. Como posso te ajudar hoje?' }
])

// ── Drag state
const finoraPos = ref({ x: -1, y: -1 }) // -1 means uninitialized → CSS default
const finoraDragging = ref(false)
const finoraDragOffset = ref({ x: 0, y: 0 })

function getFinoraBounds() {
  const isMobile = window.innerWidth <= 500
  const margin = isMobile ? 12 : 24
  const width = isMobile ? Math.max(280, window.innerWidth - margin * 2) : 380
  const height = isMobile
    ? Math.min(window.innerHeight - margin * 2, Math.max(320, window.innerHeight - 108))
    : 580
  return { isMobile, margin, width, height }
}

function clampFinoraPosition(pos = finoraPos.value) {
  const { margin, width, height } = getFinoraBounds()
  const maxX = Math.max(margin, window.innerWidth - width - margin)
  const maxY = Math.max(margin, window.innerHeight - height - margin)
  return {
    x: Math.max(margin, Math.min(maxX, pos.x)),
    y: Math.max(margin, Math.min(maxY, pos.y))
  }
}

function initFinoraPosition() {
  const { isMobile, margin, width, height } = getFinoraBounds()
  if (isMobile) {
    finoraPos.value = { x: margin, y: margin }
  } else if (finoraPos.value.x === -1) {
    finoraPos.value = clampFinoraPosition({
      x: window.innerWidth - width - margin,
      y: window.innerHeight - height - margin
    })
  } else {
    finoraPos.value = clampFinoraPosition()
  }
}

function openFinoraChat() {
  initFinoraPosition()
  showFinoraChat.value = true
}

const finoraWindowStyle = computed(() => {
  if (finoraPos.value.x < 0) return {}
  const { width, height } = getFinoraBounds()
  return {
    left: `${finoraPos.value.x}px`,
    top: `${finoraPos.value.y}px`,
    width: `${width}px`,
    height: `${height}px`,
    right: 'auto',
    bottom: 'auto'
  }
})

function onFinoraDragStart(e) {
  const ev = e.touches ? e.touches[0] : e
  finoraDragging.value = true
  finoraDragOffset.value = {
    x: ev.clientX - finoraPos.value.x,
    y: ev.clientY - finoraPos.value.y
  }
  document.addEventListener('mousemove', onFinoraDragMove)
  document.addEventListener('mouseup', onFinoraDragEnd)
  document.addEventListener('touchmove', onFinoraDragMove, { passive: false })
  document.addEventListener('touchend', onFinoraDragEnd)
}

function onFinoraDragMove(e) {
  if (!finoraDragging.value) return
  e.preventDefault()
  const ev = e.touches ? e.touches[0] : e
  finoraPos.value = clampFinoraPosition({
    x: ev.clientX - finoraDragOffset.value.x,
    y: ev.clientY - finoraDragOffset.value.y
  })
}

function onFinoraDragEnd() {
  finoraDragging.value = false
  document.removeEventListener('mousemove', onFinoraDragMove)
  document.removeEventListener('mouseup', onFinoraDragEnd)
  document.removeEventListener('touchmove', onFinoraDragMove)
  document.removeEventListener('touchend', onFinoraDragEnd)
}

function onFinoraInputChange() {
  finoraHasTyped.value = finoraInput.value.trim().length > 0
}

async function sendFinoraMessage() {
  const userMsg = finoraInput.value.trim()
  if (!userMsg) return
  finoraMessages.value.push({ role: 'user', text: userMsg })
  finoraInput.value = ''
  finoraHasTyped.value = false
  finoraIsThinking.value = true
  
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
      finoraIsThinking.value = false
      return
    }
    
    const data = await res.json()
    finoraMessages.value[botMsgIndex].loading = false
    finoraMessages.value[botMsgIndex].text = data.text
    finoraIsThinking.value = false
    scrollChat()
  } catch (err) {
    finoraMessages.value[botMsgIndex].loading = false
    finoraMessages.value[botMsgIndex].text = '❌ Erro: Não foi possível conectar ao Ollama local.'
    finoraIsThinking.value = false
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
const formBill = ref({ id: null, descricao: '', valor: 0, diaVencimento: 5, tipo: 'unica', recorrencia: 'indefinida', totalParcelas: 0 })
const formPagamentoBill = ref({ accountId: '' })
const inputValorBill = ref(null)
const loadingBill = ref(false)
const toast     = ref({ visivel:false, mensagem:'' })

const dividasExibidas = computed(() => {
  if (subAbaDivida.value === 'pendentes') {
    return billsStore.bills.filter(b => !b.pagaEsteMes)
  }
  if (subAbaDivida.value === 'pagas') {
    return billsStore.bills.filter(b => b.pagaEsteMes)
  }
  return billsStore.bills
})

const dividasOverview = computed(() => {
  const hojeDia = new Date().getDate()
  
  // Dívidas deste mês
  const pendentesDesteMes = billsStore.bills.filter(b => !b.pagaEsteMes)
  const totalValorPendentes = pendentesDesteMes.reduce((a, b) => a + Number(b.valor), 0)
  
  // Vencidas e Vencendo Logo
  const vencidas = pendentesDesteMes.filter(b => Number(b.diaVencimento) < hojeDia)
  const vencendoLogo = pendentesDesteMes.filter(b => Number(b.diaVencimento) >= hojeDia && Number(b.diaVencimento) <= hojeDia + 3)
  
  // Próximo mês
  const recorrentesProximoMes = billsStore.bills.filter(b => {
    if (b.tipo !== 'recorrente') return false
    if (b.recorrencia === 'indefinida') return true
    if (b.recorrencia === 'parcelas') {
      if (b.pagaEsteMes) {
        return b.parcelasRestantes > 0
      } else {
        return b.parcelasRestantes > 1
      }
    }
    return false
  })
  const totalValorProximoMes = recorrentesProximoMes.reduce((a, b) => a + Number(b.valor), 0)
  
  // Assinaturas recorrentes (tipo recorrente)
  const assinaturasRecorrentes = billsStore.bills.filter(b => b.tipo === 'recorrente')
  const totalAssinaturas = assinaturasRecorrentes.reduce((a, b) => a + Number(b.valor), 0)
  
  return {
    pendentesCount: pendentesDesteMes.length,
    pendentesValor: totalValorPendentes,
    vencidasCount: vencidas.length,
    vencidasList: vencidas,
    vencendoLogoCount: vencendoLogo.length,
    vencendoLogoList: vencendoLogo,
    proximoMesCount: recorrentesProximoMes.length,
    proximoMesValor: totalValorProximoMes,
    recorrentesCount: assinaturasRecorrentes.length,
    recorrentesValor: totalAssinaturas
  }
})

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
    await billsStore.carregar()
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
  await billsStore.carregar()
  saldoExibido.value = Number(accounts.saldoTotal || 0)
  appCarregando.value = false
  // Polling a cada 8 segundos — atualiza tudo (saldo + extrato + métricas)
  pollingInterval = setInterval(sincronizarSaldo, 5000)
})

onUnmounted(() => {
  if (pollingInterval) clearInterval(pollingInterval)
})

// ── Ações de Dívidas
function abrirNovaDivida() {
  formBill.value = {
    id: null,
    descricao: '',
    valor: 0,
    diaVencimento: 5,
    tipo: 'unica',
    recorrencia: 'indefinida',
    totalParcelas: 0
  }
  modalBill.value = true
  nextTick(() => {
    if (inputValorBill.value) inputValorBill.value.value = ''
  })
}

function abrirEditarDivida(bill) {
  formBill.value = {
    id: bill.id,
    descricao: bill.descricao || '',
    valor: Number(bill.valor),
    diaVencimento: Number(bill.diaVencimento),
    tipo: bill.tipo || 'unica',
    recorrencia: bill.recorrencia || 'indefinida',
    totalParcelas: Number(bill.totalParcelas || 0)
  }
  modalBill.value = true
  nextTick(() => {
    if (inputValorBill.value) {
      inputValorBill.value.value = formatarParaInput(Number(bill.valor))
    }
  })
}

async function salvarDivida() {
  const valor = parseMoeda(inputValorBill.value?.value || '0')
  if (!formBill.value.descricao) { mostrarToast('⚠️ Informe a descrição'); return }
  if (!valor || valor <= 0) { mostrarToast('⚠️ Informe o valor'); return }
  if (!formBill.value.diaVencimento || formBill.value.diaVencimento < 1 || formBill.value.diaVencimento > 31) {
    mostrarToast('⚠️ Dia de vencimento inválido (1-31)'); return
  }

  loadingBill.value = true
  mostrarLoading('Salvando dívida...')
  try {
    const payload = {
      descricao: formBill.value.descricao,
      valor: valor,
      diaVencimento: formBill.value.diaVencimento,
      tipo: formBill.value.tipo,
      recorrencia: formBill.value.recorrencia,
      totalParcelas: formBill.value.totalParcelas
    }

    if (formBill.value.id) {
      await billsStore.atualizar(formBill.value.id, payload)
      mostrarToast('✅ Dívida atualizada!')
    } else {
      await billsStore.criar(payload)
      mostrarToast('✅ Dívida cadastrada!')
    }
    modalBill.value = false
  } catch (err) {
    console.error(err)
    mostrarToast('❌ Erro ao salvar dívida')
  } finally {
    loadingBill.value = false
    ocultarLoading()
  }
}

function abrirPagarDivida(bill) {
  billParaPagar.value = bill
  formPagamentoBill.value.accountId = accounts.contas[0]?.id || ''
}

async function confirmarPagamentoDivida() {
  if (!formPagamentoBill.value.accountId) { mostrarToast('⚠️ Selecione uma conta'); return }
  if (!billParaPagar.value) return

  mostrarLoading('Registrando pagamento...')
  try {
    await billsStore.pagar(billParaPagar.value.id, formPagamentoBill.value.accountId, true)
    await tx.carregar()
    await accounts.carregar()
    animarSaldo(accounts.saldoTotal)
    billParaPagar.value = null
    mostrarToast('✅ Pagamento registrado!')
  } catch (err) {
    console.error(err)
    mostrarToast('❌ Erro ao pagar dívida')
  } finally {
    ocultarLoading()
  }
}

async function estornarDivida(bill) {
  mostrarLoading('Estornando pagamento...')
  try {
    const txParaDeletar = tx.transacoes.find(t => t.descricao === `Pagamento: ${bill.descricao}` && Number(t.valor) === Number(bill.valor))
    await billsStore.estornar(bill.id)
    if (txParaDeletar) {
      await tx.deletar(txParaDeletar.id)
    } else {
      await tx.carregar()
    }
    await accounts.carregar()
    animarSaldo(accounts.saldoTotal)
    mostrarToast('🔄 Pagamento estornado!')
  } catch (err) {
    console.error(err)
    mostrarToast('❌ Erro ao estornar pagamento')
  } finally {
    ocultarLoading()
  }
}

async function deletarDivida(id) {
  mostrarLoading('Removendo dívida...')
  try {
    await billsStore.deletar(id)
    mostrarToast('🗑️ Dívida removida!')
  } catch (err) {
    console.error(err)
    mostrarToast('❌ Erro ao remover dívida')
  } finally {
    ocultarLoading()
  }
}


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

function abrirNovoLancamento(tipo) {
  selecionarTipoLancamento(tipo)
  modalLancamento.value = true
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

const activeWalletTab = ref('main')
const searchQuery = ref('')
const selectedIndicatorPeriod = ref('Anual')

const sidebarItems = [
  { val:'inicio',        label:'Início',        svg:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-grid"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>' },
  { val:'contas',        label:'Contas',        svg:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>' },
  { val:'historico',     label:'Histórico',     svg:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>' },
  { val:'metricas',      label:'Métricas',      svg:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bar-chart-2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>' },
  { val:'investimentos', label:'Itens',         svg:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-database"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>' },
  { val:'dividas',       label:'Dívidas',       svg:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-receipt"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>' },
]

const abaLabel = computed(() => {
  const item = sidebarItems.find(i => i.val === aba.value)
  return item ? item.label : 'Visão Geral'
})

const salesBarChartData = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  // Determine start month: use account createdAt, fallback to earliest transaction, fallback to current month
  let startDate = new Date(currentYear, currentMonth, 1)
  
  if (auth.user?.createdAt) {
    startDate = new Date(auth.user.createdAt)
  } else if (tx.transacoes.length > 0) {
    const earliest = tx.transacoes.reduce((min, t) => {
      const d = new Date(t.data + 'T12:00:00')
      return d < min ? d : min
    }, new Date())
    startDate = earliest
  }
  
  const startMonth = startDate.getMonth()
  const startYear = startDate.getFullYear()
  
  // Calculate number of months from start to now
  const totalMonths = (currentYear - startYear) * 12 + (currentMonth - startMonth) + 1
  // We want to show at least 7 months to fill the card beautifully.
  // If the account history is shorter, we pad it with future months up to 7. We cap at 12 months max.
  const monthCount = Math.min(Math.max(7, totalMonths), 12)
  
  const results = Array.from({ length: monthCount }, (_, idx) => {
    const d = new Date(startYear, startMonth + idx, 1)
    let labelPt = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    labelPt = labelPt.charAt(0).toUpperCase() + labelPt.slice(1)
    return {
      monthIdx: d.getMonth(),
      year: d.getFullYear(),
      label: labelPt,
      categorias: {},
      totalSaidas: 0
    }
  })
  
  tx.transacoes.forEach(t => {
    const tDate = new Date(t.data + 'T12:00:00')
    const match = results.find(r => r.monthIdx === tDate.getMonth() && r.year === tDate.getFullYear())
    if (match) {
      if (t.tipo === 'despesa') {
        const val = Number(t.valor)
        match.categorias[t.categoria] = (match.categorias[t.categoria] || 0) + val
        match.totalSaidas += val
      }
    }
  })
  
  const hasTxData = tx.transacoes.some(t => t.tipo === 'despesa')
  
  let maxVal = 100
  if (!hasTxData) {
    // Show fallback data only when there are zero expense transactions
    results.forEach((r, idx) => {
      const base = 800 + idx * 200
      r.totalSaidas = base
      r.categorias = {
        'moradia': base * 0.4,
        'mercado': base * 0.3,
        'lazer': base * 0.15,
        'contas': base * 0.15
      }
    })
  }
  
  results.forEach(r => {
    if (r.totalSaidas > maxVal) {
      maxVal = r.totalSaidas
    }
  })
  
  return results.map(r => {
    const segments = Object.entries(r.categorias).map(([catId, valor]) => {
      return {
        catId,
        valor,
        label: labelCat[catId] || catId,
        emoji: emojiCat[catId] || '📦',
        cor: corCat[catId] || '#6b7280'
      }
    }).filter(s => s.valor > 0).sort((a, b) => b.valor - a.valor)
    
    return {
      label: r.label,
      totalSaidas: r.totalSaidas,
      totalPct: Math.min((r.totalSaidas / maxVal) * 100, 100),
      segments
    }
  })
})

const topCategoriesInChart = computed(() => {
  const counts = {}
  salesBarChartData.value.forEach(b => {
    b.segments.forEach(seg => {
      counts[seg.catId] = (counts[seg.catId] || 0) + seg.valor
    })
  })
  return Object.entries(counts)
    .map(([catId, total]) => ({
      catId,
      total,
      label: labelCat[catId] || catId,
      cor: corCat[catId] || '#6b7280'
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
})

const salesBarChartYAxis = computed(() => {
  const allVals = salesBarChartData.value.map(r => r.totalSaidas)
  const maxVal = Math.max(...allVals, 100)
  return Array.from({ length: 6 }, (_, i) => {
    const val = (maxVal * (5 - i)) / 5
    if (val >= 1000) {
      return `R$ ${(val / 1000).toFixed(0)}k`
    }
    return `R$ ${Math.round(val)}`
  })
})

const indicatorsChartPoints = computed(() => {
  const period = selectedIndicatorPeriod.value
  let length = 15
  let daysInterval = 1
  let isMonthlyView = false
  
  if (period === 'Diário') {
    length = 7
    daysInterval = 1
  } else if (period === 'Mensal') {
    length = 30
    daysInterval = 1
  } else { // 'Anual'
    length = 12
    isMonthlyView = true
  }
  
  let results = []
  const now = new Date()
  
  if (isMonthlyView) {
    results = Array.from({ length }, (_, idx) => {
      const d = new Date()
      d.setMonth(now.getMonth() - idx)
      let mLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      mLabel = mLabel.charAt(0).toUpperCase() + mLabel.slice(1)
      return {
        label: mLabel,
        dateKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        balance: 0
      }
    }).reverse()
  } else {
    results = Array.from({ length }, (_, idx) => {
      const d = new Date()
      d.setDate(now.getDate() - idx * daysInterval)
      const dayLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
      return {
        label: dayLabel,
        dateKey: d.toISOString().slice(0, 10),
        balance: 0
      }
    }).reverse()
  }
  
  let currentBalance = Number(accounts.saldoTotal || 0)
  const sortedTxs = [...tx.transacoes].sort((a,b) => b.data.localeCompare(a.data))
  
  for (let i = results.length - 1; i >= 0; i--) {
    const item = results[i]
    item.balance = currentBalance
    
    let matchedTxs = []
    if (isMonthlyView) {
      matchedTxs = sortedTxs.filter(t => t.data.startsWith(item.dateKey))
    } else {
      matchedTxs = sortedTxs.filter(t => t.data === item.dateKey)
    }
    
    matchedTxs.forEach(t => {
      if (t.tipo === 'receita') {
        currentBalance -= Number(t.valor)
      } else {
        currentBalance += Number(t.valor)
      }
    })
  }
  
  const hasTxData = tx.transacoes.length > 0
  const mockBase = [1200, 1300, 1250, 1500, 1800, 1700, 1900, 2100, 2050, 2300, 2400, 2350]
  
  const width = 500
  const height = 180
  
  const points = results.map((r, idx) => {
    const x = (idx / (results.length - 1)) * width
    let balVal = hasTxData ? r.balance : (mockBase[idx % mockBase.length] + idx * 50)
    return { x, y: 0, balance: balVal, label: r.label }
  })
  
  const maxBal = Math.max(...points.map(p => p.balance), 1000)
  const minBal = Math.min(...points.map(p => p.balance), 0)
  const range = maxBal - minBal || 1
  
  points.forEach(p => {
    p.y = height - ((p.balance - minBal) / range) * (height - 50) - 30
  })
  
  let dPath = ''
  if (points.length > 0) {
    dPath = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]
      const p1 = points[i+1]
      const cpX1 = p0.x + (p1.x - p0.x) / 2
      const cpY1 = p0.y
      const cpX2 = p0.x + (p1.x - p0.x) / 2
      const cpY2 = p1.y
      dPath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`
    }
  }
  
  let areaPath = ''
  if (points.length > 0) {
    areaPath = `${dPath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
  }
  
  let peakIndex = points.length - 1
  let maxValFound = -Infinity
  points.forEach((p, idx) => {
    if (p.balance > maxValFound) {
      maxValFound = p.balance
      peakIndex = idx
    }
  })
  const peakPoint = points[peakIndex] || { x: width * 0.8, y: height * 0.3, balance: 0, label: '' }
  
  return {
    linePath: dPath,
    areaPath: areaPath,
    points,
    peakPoint
  }
})

const connectionsMetrics = computed(() => {
  const activeBudgets = budgets.budgets.filter(b => b.ativo)
  const totalLimit = activeBudgets.reduce((a, b) => a + Number(b.limite), 0)
  const totalSpent = activeBudgets.reduce((a, b) => a + Number(b.gastoAtual), 0)
  const budgetPct = totalLimit > 0 ? Math.min(Math.round((totalSpent / totalLimit) * 100), 100) : 84
  
  const totalBillsCount = billsStore.bills.length
  const paidBillsCount = billsStore.bills.filter(b => b.pagaEsteMes).length
  const billsPct = totalBillsCount > 0 ? Math.round((paidBillsCount / totalBillsCount) * 100) : 100
  
  return {
    budgetPct,
    billsPct
  }
})

const lastTransactionsSearch = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return tx.transacoes.slice(0, 5)
  return tx.transacoes.filter(t => 
    t.descricao?.toLowerCase().includes(q) || 
    t.categoria?.toLowerCase().includes(q)
  ).slice(0, 5)
})
</script>

<template>
<div v-if="appCarregando" class="ios-splash"><div class="ios-splash-inner"><div class="ios-spinner"></div><p style="color:rgba(235,235,245,.6);font-size:.875rem;margin-top:1rem">Carregando...</p></div></div>
<Transition name="ios-toast"><div v-if="toast.visivel" class="ios-toast">{{ toast.mensagem }}</div></Transition>
<Transition name="fade"><div v-if="loadingGlobal" class="ios-overlay"><div class="ios-loading-card"><div class="ios-spinner"></div><span>{{ loadingMsg }}</span></div></div></Transition>

<div class="ios-app" :style="globalGlow()">
  <!-- Desktop Left Sidebar -->
  <aside class="sidebar-desktop">
    <div class="sidebar-logo">
      <svg class="hex-logo" viewBox="0 0 100 100" width="36" height="36">
        <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="rgba(124, 58, 237, 0.12)" stroke="#a855f7" stroke-width="6"/>
        <line x1="38" y1="35" x2="38" y2="65" stroke="#c084fc" stroke-width="5" stroke-linecap="round"/>
        <line x1="50" y1="25" x2="50" y2="75" stroke="#a855f7" stroke-width="5" stroke-linecap="round"/>
        <line x1="62" y1="35" x2="62" y2="65" stroke="#c084fc" stroke-width="5" stroke-linecap="round"/>
      </svg>
    </div>
    
    <nav class="sidebar-nav">
      <button v-for="item in sidebarItems" :key="item.val" @click.prevent="aba=item.val" :class="{active:aba===item.val}" class="sidebar-tab" :title="item.label">
        <span class="sidebar-tab-icon" v-html="item.svg"></span>
      </button>
    </nav>
    
    <div class="sidebar-footer">
      <button class="sidebar-action-btn theme-toggle" @click="openFinoraChat" title="Falar com a Finora">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
      <button @click="modalPerfil=true" class="sidebar-action-btn" title="Perfil">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </button>
      <button @click="auth.logout()" class="sidebar-action-btn danger" title="Sair">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  </aside>

  <!-- Right App Wrapper -->
  <div class="app-main-wrapper">
    <header class="app-header">
      <div class="header-left">
        <span class="breadcrumb-arrow">&gt;</span>
        <h1 class="header-view-title">{{ abaLabel }}</h1>
      </div>
      
      <div class="header-center-tabs">
        <span class="header-wallet-tab active" @click="activeWalletTab='main'">
          <span class="bullet purple"></span> Carteira Principal
        </span>
        <span class="header-wallet-tab" @click="aba='contas'">
          <span class="bullet gray"></span> Todas as Carteiras ({{ accounts.contas.length.toString().padStart(2, '0') }})
        </span>
      </div>
      
      <div class="header-right">
        <div class="user-profile-badge" @click="modalPerfil=true">
          <div class="user-avatar-circle">{{ auth.nome?.charAt(0).toUpperCase() || 'S' }}</div>
          <div class="user-meta">
            <span class="user-name">{{ auth.nome || 'Simson Will' }}</span>
            <span class="user-subtext">{{ auth.email || 'simsonwill.com' }}</span>
          </div>
        </div>
      </div>
    </header>

    <main class="app-content-area">
      <!-- Início Tab -->
      <div v-show="aba==='inicio'" class="inicio-dashboard-layout">
        
        <!-- balance area (Your Wallet) -->
        <div class="dashboard-wallet-card">
          <div class="wallet-left">
            <div class="wallet-icon-wrapper">
              <svg class="wallet-icon-svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <line x1="12" y1="4" x2="12" y2="20"/>
              </svg>
            </div>
            <div class="wallet-balance-info">
              <p class="wallet-label">Sua carteira &bull; Saldo</p>
              <h2 class="wallet-amount" :class="{up:saldoAnimando==='up',down:saldoAnimando==='down'}">{{ formatar(saldoExibido) }} <span class="wallet-currency">BRL</span></h2>
              <p class="wallet-comparison">
                Você economizou 2.8% a mais que no mês anterior
              </p>
            </div>
          </div>
          
          <div class="wallet-stats">
            <div class="wallet-stat-item">
              <p class="stat-label">Entradas</p>
              <p class="stat-value">{{ formatar(totalEntradas) }}</p>
            </div>
            <div class="wallet-stat-item">
              <p class="stat-label">Saídas</p>
              <p class="stat-value">{{ formatar(totalSaidas) }}</p>
            </div>
            <div class="wallet-search-box">
              <span class="search-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.25" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </span>
              <input type="text" v-model="searchQuery" placeholder="Buscar..." />
            </div>
            <div class="wallet-actions">
              <button class="wallet-btn-action green" @click="abrirNovoLancamento('receita')" title="Adicionar Saldo">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                <span>Adicionar Saldo</span>
              </button>
              <button class="wallet-btn-action red" @click="abrirNovoLancamento('despesa')" title="Retirada">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>
                <span>Retirada</span>
              </button>
              <button class="wallet-circle-btn accent" @click="abrirTransferenciaStep()" title="Transferir">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="m17 2 5 5-5 5"/><path d="M2 17h20"/><path d="m7 22-5-5 5-5"/><path d="M22 7H2"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Row 1: Charts -->
        <div class="dashboard-row">
          
          <!-- Sales Analytics Card -->
          <div class="dashboard-card sales-analytics-card">
            <div class="card-header">
              <h3 class="card-title">Gastos por Categoria</h3>
              <div class="header-legend" style="display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: flex-end;">
                <span v-for="cat in topCategoriesInChart" :key="cat.catId" class="legend-item-inline" style="display: inline-flex; align-items: center; gap: 6px; font-size: .7rem; color: var(--text3);">
                  <span class="legend-dot" :style="{ backgroundColor: cat.cor, boxShadow: '0 0 6px ' + cat.cor }"></span>
                  {{ cat.label }}
                </span>
              </div>
              <button class="card-menu-btn" @click="aba='historico'" aria-label="Ver historico">
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.25" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
            
            <div class="sales-pills-row">
              <div class="sales-pill-item">
                <div class="pill-icon-down">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                </div>
                <div class="pill-meta">
                  <span class="pill-title">ENTRADAS DO MÊS</span>
                  <span class="pill-val">{{ formatar(totalEntradas) }}</span>
                </div>
              </div>
              <div class="sales-pill-item">
                <div class="pill-icon-up">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>
                </div>
                <div class="pill-meta">
                  <span class="pill-title">SAÍDAS DO MÊS</span>
                  <span class="pill-val">{{ formatar(totalSaidas) }}</span>
                </div>
              </div>
            </div>

            <!-- Bar Chart Display -->
            <div class="bar-chart-container">
              <div class="bar-chart-y-axis">
                <span v-for="step in salesBarChartYAxis" :key="step">{{ step }}</span>
              </div>
              <div class="bar-chart-bars">
                <div v-for="b in salesBarChartData" :key="b.label" class="bar-column tooltip-trigger">
                  <div class="bar-tracks-wrapper">
                    <div class="bar-track-bg">
                      <div class="bar-track-stacked" :style="{ height: b.totalPct + '%' }">
                        <div v-for="seg in b.segments" :key="seg.catId" class="bar-segment" :style="{ height: (seg.valor / b.totalSaidas) * 100 + '%', backgroundColor: seg.cor, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 4px ' + seg.cor }" :title="`${seg.label}: ${formatar(seg.valor)}`"></div>
                      </div>
                    </div>
                  </div>
                  <span class="bar-label">{{ b.label }}</span>
                  
                  <!-- Tooltip -->
                  <div class="chart-tooltip">
                    <div class="tooltip-title">{{ b.label }}</div>
                    <div class="tooltip-row total-row" style="margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px;">
                      <strong>Total: {{ formatar(b.totalSaidas) }}</strong>
                    </div>
                    <div v-for="seg in b.segments" :key="seg.catId" class="tooltip-row" style="display: flex; align-items: center; gap: 6px; margin-top: 3px;">
                      <span class="legend-dot" :style="{ backgroundColor: seg.cor, boxShadow: '0 0 6px ' + seg.cor }"></span>
                      <span>{{ seg.emoji }} {{ seg.label }}: {{ formatar(seg.valor) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Indicators Card -->
          <div class="dashboard-card indicators-card">
            <div class="card-header">
              <div class="header-left-meta">
                <h3 class="card-title">Evolução do Saldo</h3>
                <p class="card-subtitle">Histórico de saldo da carteira principal</p>
              </div>
              <div class="indicators-periods">
                <button v-for="p in ['Diário', 'Mensal', 'Anual']" :key="p" @click="selectedIndicatorPeriod=p" :class="{active: selectedIndicatorPeriod===p}">
                  {{ p }}
                </button>
              </div>
            </div>

            <!-- SVG Bezier Path Area Chart -->
            <div class="indicators-chart-container">
              <svg class="indicators-svg" viewBox="0 0 500 180" width="100%" height="100%">
                <defs>
                  <linearGradient id="purple-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#a855f7" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="#a855f7" stop-opacity="0.0" />
                  </linearGradient>
                  <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                <!-- Grid lines -->
                <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.03)" stroke-width="1" />

                <!-- Filled Area -->
                <path :d="indicatorsChartPoints.areaPath" fill="url(#purple-area-grad)" />

                <!-- Glow underneath line -->
                <path :d="indicatorsChartPoints.linePath" fill="none" stroke="#a855f7" stroke-width="8" opacity="0.15" filter="url(#glow-filter)" />
                
                <!-- Smooth Bezier Line -->
                <path :d="indicatorsChartPoints.linePath" fill="none" stroke="#c084fc" stroke-width="3" stroke-linecap="round" />

                <!-- Interactive marker circles -->
                <circle v-for="p in indicatorsChartPoints.points" :key="p.label" :cx="p.x" :cy="p.y" r="4.5" class="chart-dot-marker">
                  <title>{{ p.label }}: {{ formatar(p.balance) }}</title>
                </circle>

                <!-- Peak point glowing dot -->
                <circle :cx="indicatorsChartPoints.peakPoint.x" :cy="indicatorsChartPoints.peakPoint.y" r="8" fill="#a855f7" filter="url(#glow-filter)" />
                <circle :cx="indicatorsChartPoints.peakPoint.x" :cy="indicatorsChartPoints.peakPoint.y" r="4" fill="#ffffff" />
              </svg>
            </div>

            <!-- Bottom summary inside indicators card -->
            <div class="indicators-bottom-row">
              <div class="indicators-btc-val">
                <span class="btc-label">Saldo Acumulado ({{ formatar(accounts.saldoTotal) }})</span>
                <h4 class="btc-amount">{{ (accounts.saldoTotal / 350000).toFixed(5) }} BTC</h4>
              </div>
              <div class="indicators-pct-badge">
                <span class="pct-val">+2.8%</span>
                <span class="pct-arrow-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 2: Connections & Insights -->
        <div class="dashboard-row">
          
          <!-- My Connections Card -->
          <div class="dashboard-card my-connections-card">
            <div class="card-header">
              <h3 class="card-title">Metas e Limites</h3>
              <button class="card-menu-btn" @click="modalAlertas=true" aria-label="Configurar metas e limites">
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.25" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
            
            <div class="connections-body">
              <div class="connection-item">
                <div class="conn-meta">
                  <span class="conn-label">Consumo de Orçamentos</span>
                  <span class="conn-pct">{{ connectionsMetrics.budgetPct }}%</span>
                </div>
                <div class="segmented-progress-bar">
                  <div v-for="step in 5" :key="step" class="progress-segment" :class="{filled: (connectionsMetrics.budgetPct >= step * 20)}"></div>
                </div>
              </div>
              
              <div class="connection-item">
                <div class="conn-meta">
                  <span class="conn-label">Dívidas Quitadas</span>
                  <span class="conn-pct">{{ connectionsMetrics.billsPct }}%</span>
                </div>
                <div class="segmented-progress-bar">
                  <div v-for="step in 5" :key="step" class="progress-segment" :class="{filled: (connectionsMetrics.billsPct >= step * 20)}"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Insights Mini Cards -->
          <div class="insights-grid-col">
            
            <!-- Insight Item 1: Stock (Itens) -->
            <div class="insight-mini-card">
              <div class="insight-top">
                <div class="insight-icon-container">
                  <svg class="insight-spark-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#a855f7" stroke-width="2.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <button @click="aba='investimentos'" class="insight-action-btn">Visualizar <span class="arrow">&gt;</span></button>
              </div>
              <div class="insight-bottom">
                <span class="insight-label">Itens no Estoque</span>
                <h4 class="insight-value">{{ formatar(items.itens.filter(i=>i.status==='disponivel').reduce((a,c)=>a+Number(c.valor), 0)) }}</h4>
                <p class="insight-trend positive">&uparrow; 37.8% esta semana</p>
              </div>
              
              <svg class="insight-sparkline-bg" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path d="M -2 25 Q 20 10 40 20 T 80 5 T 102 15" fill="none" stroke="rgba(168,85,247,0.35)" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            </div>

            <!-- Insight Item 2: Bills (Dívidas) -->
            <div class="insight-mini-card">
              <div class="insight-top">
                <div class="insight-icon-container">
                  <svg class="insight-spark-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#a855f7" stroke-width="2.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <button @click="aba='dividas'" class="insight-action-btn">Visualizar <span class="arrow">&gt;</span></button>
              </div>
              <div class="insight-bottom">
                <span class="insight-label">Dívidas Pendentes</span>
                <h4 class="insight-value">{{ formatar(billsStore.bills.filter(b => !b.pagaEsteMes).reduce((a,c)=>a+Number(c.valor), 0)) }}</h4>
                <p class="insight-trend neutral">{{ billsStore.bills.filter(b => !b.pagaEsteMes).length }} pendentes este mês</p>
              </div>
              
              <svg class="insight-sparkline-bg" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path d="M -2 20 Q 20 5 40 15 T 80 25 T 102 5" fill="none" stroke="rgba(168,85,247,0.35)" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Row 3: Radar de Dívidas -->
        <div class="dashboard-row dashboard-row-spaced">
          <div class="dashboard-card dividas-overview-card dashboard-card-full">
            <div class="card-header">
              <h3 class="card-title">📡 Radar de Dívidas & Compromissos</h3>
              <button class="ios-pill-btn blue" @click="aba='dividas'">Gerenciar Dívidas &rarr;</button>
            </div>
            
            <div class="dividas-overview-body">
              <!-- Seção Principal: Este Mês -->
              <div class="overview-section">
                <span class="section-subtitle">Este Mês</span>
                <div class="overview-main-stat">
                  <div class="stat-group">
                    <span class="stat-label">Pendentes</span>
                    <h4 class="stat-value text-red">{{ formatar(dividasOverview.pendentesValor) }}</h4>
                    <p class="stat-subtext">{{ dividasOverview.pendentesCount }} contas a pagar</p>
                  </div>
                  
                  <div class="stat-group">
                    <span class="stat-label">Assinaturas</span>
                    <h4 class="stat-value text-purple">{{ formatar(dividasOverview.recorrentesValor) }}</h4>
                    <p class="stat-subtext">{{ dividasOverview.recorrentesCount }} recorrentes ativas</p>
                  </div>
                </div>

                <!-- Saldo Projetado -->
                <div class="projected-balance-banner" :class="{ warning: accounts.saldoTotal < dividasOverview.pendentesValor }">
                  <div class="banner-icon">💡</div>
                  <div class="banner-text">
                    <p class="banner-title">Projeção Pós-Pagamentos</p>
                    <p class="banner-desc">
                      Seu saldo estimado após quitar as pendências será de 
                      <strong :style="{ color: accounts.saldoTotal - dividasOverview.pendentesValor < 0 ? 'var(--red)' : 'var(--green)' }">
                        {{ formatar(accounts.saldoTotal - dividasOverview.pendentesValor) }}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              <!-- Seção Central: Alertas & Avisos -->
              <div class="overview-section alerts-section">
                <span class="section-subtitle">Alertas & Prazos</span>
                
                <!-- Alerta: Contas Vencidas -->
                <div v-if="dividasOverview.vencidasCount > 0" class="alert-box danger">
                  <span class="alert-icon">⚠️</span>
                  <div class="alert-content">
                    <p class="alert-title">{{ dividasOverview.vencidasCount }} {{ dividasOverview.vencidasCount === 1 ? 'conta vencida!' : 'contas vencidas!' }}</p>
                    <p class="alert-desc">
                      Pague logo para evitar juros/multas:
                      <strong>{{ dividasOverview.vencidasList.map(b => `${b.descricao} (dia ${b.diaVencimento})`).join(', ') }}</strong>
                    </p>
                  </div>
                </div>

                <!-- Alerta: Vencimento Próximo -->
                <div v-if="dividasOverview.vencendoLogoCount > 0" class="alert-box warning">
                  <span class="alert-icon">⏰</span>
                  <div class="alert-content">
                    <p class="alert-title">Vencendo nos próximos 3 dias</p>
                    <p class="alert-desc">
                      Prepare o saldo para: 
                      <strong>{{ dividasOverview.vencendoLogoList.map(b => `${b.descricao} (dia ${b.diaVencimento})`).join(', ') }}</strong>
                    </p>
                  </div>
                </div>

                <!-- Estado: Tudo Limpo -->
                <div v-if="dividasOverview.vencidasCount === 0 && dividasOverview.vencendoLogoCount === 0" class="alert-box success">
                  <span class="alert-icon">✨</span>
                  <div class="alert-content">
                    <p class="alert-title">Controle em dia!</p>
                    <p class="alert-desc">
                      Nenhuma conta atrasada ou com vencimento próximo (3 dias).
                    </p>
                  </div>
                </div>
              </div>

              <!-- Seção Direita: Projeção Próximo Mês -->
              <div class="overview-section next-month-section">
                <span class="section-subtitle">Próximo Mês</span>
                <div class="next-month-card">
                  <div class="next-month-header">
                    <span class="next-month-icon">📅</span>
                    <div>
                      <p class="next-month-title">Projeção Futura</p>
                      <p class="next-month-sub">Compromissos automáticos/recorrentes</p>
                    </div>
                  </div>
                  <div class="next-month-body">
                    <div class="projection-row">
                      <span>Contas recorrentes:</span>
                      <strong>{{ dividasOverview.proximoMesCount }}</strong>
                    </div>
                    <div class="projection-row">
                      <span>Total estimado:</span>
                      <strong class="text-blue">{{ formatar(dividasOverview.proximoMesValor) }}</strong>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Search Results -->
        <div v-if="searchQuery.trim()" class="dashboard-search-results">
          <div class="card-header">
            <h3 class="card-title">Resultados de busca para "{{ searchQuery }}"</h3>
          </div>
          <div class="ios-widget-card" style="margin-top: 1rem;">
            <div v-for="(t,i) in lastTransactionsSearch" :key="t.id" class="ios-tx-row" :class="{bordered:i>0}">
              <div class="ios-tx-icon wg-purple" style="background: rgba(168,85,247,0.1); color: #c084fc;">
                {{ emojiCat[t.categoria]||(t.tipo==='receita'?'💜':'🔴') }}
              </div>
              <div class="ios-tx-info">
                <p class="ios-tx-desc">{{ t.descricao }}</p>
                <p class="ios-muted">{{ t.Account?.banco||t.Account?.nome }} • {{ fmtData(t.data) }}</p>
              </div>
              <div class="ios-tx-right">
                <p :class="t.tipo==='receita'?'wg-purple-text':'wg-red-text'" style="font-weight:800;font-size:.875rem;">
                  {{ t.tipo==='receita'?'+':'-' }}{{ formatar(t.valor) }}
                </p>
              </div>
            </div>
            <div v-if="!lastTransactionsSearch.length" class="ios-empty-card">
              <p>Nenhuma transação encontrada</p>
            </div>
          </div>
        </div>

      </div>

      <!-- Contas Tab -->
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

      <!-- Histórico Tab -->
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
            <div class="ios-widget"><div class="ios-widget-icon wg-teal">📈</div><p class="ios-widget-label">Economia</p><p class="ios-widget-value wg-teal-text">{{ taxaEconomia }}%</p></div>
          </div>
          <div class="ios-charts-row">
            <div v-if="gastosPorCat.length" class="ios-chart-card">
              <h4>Despesas por Categoria</h4>
              <div class="ios-chart-wrapper">
                <svg class="ios-donut" viewBox="0 0 100 100">
                  <circle v-for="item in donutDespesas" :key="item.cat" cx="50" cy="50" r="45" fill="transparent" stroke-width="8" :stroke="item.cor" :stroke-dasharray="`${item.dash} ${CIRCUMFERENCE}`" :stroke-dashoffset="-item.offset" />
                </svg>
                <div class="ios-donut-label"><span>Despesas</span></div>
              </div>
              <div class="ios-chart-legend">
                <div v-for="item in gastosPorCat" :key="item.cat" class="ios-legend-item"><span :style="{backgroundColor:item.cor}" class="ios-leg-dot"></span><span style="flex:1">{{ item.label }}</span><strong>{{ item.pct }}%</strong></div>
              </div>
            </div>
            <div v-if="receitasPorCat.length" class="ios-chart-card">
              <h4>Receitas por Categoria</h4>
              <div class="ios-chart-wrapper">
                <svg class="ios-donut" viewBox="0 0 100 100">
                  <circle v-for="item in donutReceitas" :key="item.cat" cx="50" cy="50" r="45" fill="transparent" stroke-width="8" :stroke="item.cor" :stroke-dasharray="`${item.dash} ${CIRCUMFERENCE}`" :stroke-dashoffset="-item.offset" />
                </svg>
                <div class="ios-donut-label"><span>Receitas</span></div>
              </div>
              <div class="ios-chart-legend">
                <div v-for="item in receitasPorCat" :key="item.cat" class="ios-legend-item"><span :style="{backgroundColor:item.cor}" class="ios-leg-dot"></span><span style="flex:1">{{ item.label }}</span><strong>{{ item.pct }}%</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Métricas Tab -->
      <div v-show="aba==='metricas'" class="ios-content">
        <div class="ios-section-header"><p class="ios-section-title">📊 Métricas & Alertas</p>
          <button @click="modalAlertas=true" class="ios-pill-btn orange">🔔 Configurar Alertas</button>
        </div>
        <div class="ios-summary-grid">
          <div class="ios-widget"><div class="ios-widget-icon wg-red">⬇️</div><p class="ios-widget-label">Gasto do Mês</p><p class="ios-widget-value wg-red-text">{{ formatar(totalSaidas) }}</p></div>
          <div class="ios-widget"><div class="ios-widget-icon wg-green">⬆️</div><p class="ios-widget-label">Receita do Mês</p><p class="ios-widget-value wg-green-text">{{ formatar(totalEntradas) }}</p></div>
          <div class="ios-widget"><div class="ios-widget-icon wg-teal">⚖️</div><p class="ios-widget-label">Balanço</p><p class="ios-widget-value" :class="balanco>=0?'wg-teal-text':'wg-red-text'">{{ formatar(balanco) }}</p></div>
        </div>
        <div v-if="budgets.budgets.length" class="ios-widget-card" style="margin-top:1.5rem">
          <div class="ios-wc-header"><p>🚨 Status dos Alertas</p></div>
          <div v-for="b in budgets.budgets" :key="b.id" class="ios-alert-row" style="margin-bottom:1rem">
            <div class="ios-alert-row-icon" :class="b.gastoAtual>=b.limite?'wg-red':b.gastoAtual>=b.limite*0.7?'wg-orange':'wg-teal'">{{ emojiCat[b.categoria]||'📦' }}</div>
            <div class="ios-alert-row-body" style="flex:1"><div class="ios-alert-row-top"><span>{{ labelCat[b.categoria] }} ({{ b.ativo?'Ativo':'Pausado' }})</span><span style="font-weight:800">{{ formatar(b.gastoAtual) }} / {{ formatar(b.limite) }}</span></div><div class="ios-progress sm"><div :class="b.gastoAtual>=b.limite?'bg-red':b.gastoAtual>=b.limite*0.7?'bg-amber':'bg-teal'" :style="{width:Math.min((b.gastoAtual/b.limite)*100,100)+'%'}"></div></div></div>
          </div>
        </div>
        <div v-else class="ios-empty-card"><p style="font-size:2rem;margin-bottom:.5rem">🔔</p><p>Nenhum alerta configurado.</p><button @click="modalAlertas=true" class="ios-link">Configurar agora →</button></div>
      </div>

      <!-- Itens Tab -->
      <div v-show="aba==='investimentos'" class="ios-content">
        <div class="ios-segmented"><button @click="subAbaInv='venda'" :class="{active:subAbaInv==='venda'}">📦 Itens à Venda ({{ itensVenda.length }})</button><button @click="subAbaInv='compra'" :class="{active:subAbaInv==='compra'}">🛒 Desejos ({{ itensCompra.length }})</button></div>
        <div class="ios-section-header" style="margin-top:1.5rem">
          <p class="ios-section-title">{{ subAbaInv==='venda'?'Estoque de Itens':'Lista de Desejos' }}</p>
          <button @click="modalItem=true" :class="subAbaInv==='venda'?'orange':'blue'" class="ios-pill-btn">+ Novo</button>
        </div>
        <div class="ios-cards-grid">
          <div v-for="item in (subAbaInv==='venda'?itensVenda:itensCompra)" :key="item.id" class="ios-conta-card item-card">
            <div class="ios-conta-top-bar" :style="{backgroundColor:subAbaInv==='venda'?'#fb923c':'#3b82f6'}"></div>
            <div class="ios-conta-header">
              <span style="font-size:2rem">{{ subAbaInv==='venda'?'📦':'🛒' }}</span>
              <div style="flex:1;margin-left:.75rem"><p style="font-weight:700;font-size:.95rem">{{ item.nome }}</p><p class="ios-muted">{{ item.descricao||'Sem descrição' }}</p></div>
              <button @click="items.deletar(item.id).then(()=>mostrarToast('🗑️ Item removido'))" class="ios-del-btn">✕</button>
            </div>
            <p class="ios-conta-saldo" :style="{color:subAbaInv==='venda'?'#fb923c':'#3b82f6'}">{{ formatar(item.valor) }}</p>
            <div v-if="subAbaInv==='venda' && item.status==='disponivel'" class="ios-item-actions" style="margin-top:1rem"><button @click="abrirVenda(item)" class="ios-btn-full bg-orange">Registrar venda</button></div>
            <div v-else-if="item.status==='vendido'" class="ios-sold-badge">Vendida!</div>
          </div>
        </div>
        <div v-if="!(subAbaInv==='venda'?itensVenda:itensCompra).length" class="ios-empty-card"><p style="font-size:2rem;margin-bottom:.5rem">📦</p><p>Nenhum item adicionado.</p><button @click="modalItem=true" class="ios-link">Adicionar item →</button></div>
      </div>

      <!-- Dívidas Tab -->
      <div v-show="aba==='dividas'" class="ios-content">
        <div class="ios-segmented">
          <button @click="subAbaDivida='todas'" :class="{active:subAbaDivida==='todas'}">🗂️ Todas ({{ billsStore.bills.length }})</button>
          <button @click="subAbaDivida='pendentes'" :class="{active:subAbaDivida==='pendentes'}">⏳ Pendentes ({{ billsStore.bills.filter(b => !b.pagaEsteMes).length }})</button>
          <button @click="subAbaDivida='pagas'" :class="{active:subAbaDivida==='pagas'}">✅ Quitadas ({{ billsStore.bills.filter(b => b.pagaEsteMes).length }})</button>
        </div>
        
        <div class="ios-section-header" style="margin-top:1.5rem">
          <p class="ios-section-title">Controle de Dívidas</p>
          <button @click="abrirNovaDivida" class="ios-pill-btn red">+ Nova Dívida</button>
        </div>

        <div class="ios-cards-grid">
          <div v-for="bill in dividasExibidas" :key="bill.id" class="ios-conta-card item-card bill-card" :class="{ 'bill-paid': bill.pagaEsteMes }">
            <div class="ios-conta-top-bar" :style="{ backgroundColor: bill.pagaEsteMes ? '#10b981' : '#ef4444' }"></div>
            <div class="ios-conta-header">
              <span style="font-size:1.75rem">{{ bill.pagaEsteMes ? '✅' : '💸' }}</span>
              <div style="flex:1;margin-left:.75rem">
                <p style="font-weight:700;font-size:.95rem">{{ bill.descricao }}</p>
                <p class="ios-muted">
                  Vence dia {{ bill.diaVencimento }} • 
                  {{ bill.tipo === 'unica' ? 'Única' : `Recorrente (${bill.recorrencia === 'mensal' ? 'Mensal' : 'Semanal'})` }}
                </p>
              </div>
              <button @click="abrirEditarDivida(bill)" class="ios-edit-btn" style="margin-right: 0.5rem; background: transparent; border: none; color: #a855f7; cursor: pointer; padding: 2px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
              <button @click="deletarDivida(bill.id)" class="ios-del-btn">✕</button>
            </div>
            <p class="ios-conta-saldo" :style="{ color: bill.pagaEsteMes ? '#10b981' : '#ef4444' }">{{ formatar(bill.valor) }}</p>
            
            <div class="ios-item-actions" style="margin-top:1rem">
              <div v-if="bill.pagaEsteMes" class="bill-paid-badge-container">
                <span class="ios-sold-badge" style="background: rgba(16, 185, 129, 0.1); color: #34d399; margin: 0; text-align: center; width: 100%;">Paga este mês!</span>
                <button @click="estornarDivida(bill)" class="ios-btn-full" style="margin-top: 0.5rem; background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2);">Estornar Pagamento</button>
              </div>
              <button v-else @click="abrirPagarDivida(bill)" class="ios-btn-full bg-red" style="background-color: #ef4444; color: white;">Pagar Dívida</button>
            </div>
          </div>
        </div>

        <div v-if="!dividasExibidas.length" class="ios-empty-card">
          <p style="font-size:2rem;margin-bottom:.5rem">💸</p>
          <p>Nenhuma dívida nesta categoria.</p>
          <button @click="abrirNovaDivida" class="ios-link">Adicionar dívida →</button>
        </div>
      </div>
    </main>
  </div>
  
  <!-- Responsive Mobile Navigation (Matching sidebar icons) -->
  <nav class="ios-mobile-nav">
    <button v-for="item in sidebarItems" :key="item.val" @click.prevent="aba=item.val" :class="{active:aba===item.val}" class="ios-mobile-tab">
      <span class="ios-mobile-icon" v-html="item.svg"></span>
      <span class="ios-mobile-label">{{ item.label }}</span>
    </button>
  </nav>
</div>

<!-- MODAL LANÇAMENTO -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="modalLancamento" class="ios-modal-bg" @click.self="fecharLancamentoStep">
<div class="ios-modal-card">
  <div class="ios-modal-header">
    <div style="display:flex;align-items:center;gap:.5rem"><span style="font-size:1.2rem">✏️</span> <h3>Novo Lançamento</h3></div>
    <button @click="fecharLancamentoStep" class="ios-close">✕</button>
  </div>
  
  <div class="ios-modal-body">
    <!-- Passo 1: Receita vs Despesa -->
    <div v-if="passoLancamento===1" class="ios-step-content">
      <p class="ios-label" style="text-align:center;margin-bottom:1rem">Selecione o tipo de lançamento</p>
      <div class="ios-segmented-grid">
        <button @click="selecionarTipoLancamento('receita')" class="ios-select-btn green">
          <span style="font-size:2rem;margin-bottom:.5rem">⬆️</span>
          <span>Receita / Entrada</span>
        </button>
        <button @click="selecionarTipoLancamento('despesa')" class="ios-select-btn red">
          <span style="font-size:2rem;margin-bottom:.5rem">⬇️</span>
          <span>Despesa / Saída</span>
        </button>
      </div>
    </div>

    <!-- Passo 2: Categoria -->
    <div v-if="passoLancamento===2" class="ios-step-content">
      <div style="display:flex;align-items:center;margin-bottom:1rem"><button @click="passoLancamento=1" class="ios-back-btn">‹ Voltar</button><p class="ios-label" style="margin:0 auto">Selecione a Categoria</p></div>
      <div class="ios-cat-grid compact">
        <button v-for="cat in categoriasAtuais" :key="cat.id" @click="selecionarCategoriaStep(cat.id)" :class="{active:formTx.categoria===cat.id}" class="ios-cat-btn">
          <span class="ios-cat-emoji">{{ cat.emoji }}</span>
          <span>{{ cat.label }}</span>
        </button>
      </div>
    </div>

    <!-- Passo 3: Valor -->
    <div v-if="passoLancamento===3" class="ios-step-content">
      <div style="display:flex;align-items:center;margin-bottom:1rem"><button @click="passoLancamento=2" class="ios-back-btn">‹ Voltar</button><p class="ios-label" style="margin:0 auto">Informe o Valor</p></div>
      <div class="ios-val-preview">{{ formTx.tipo==='receita'?'+':'-' }} {{ formatar(valorLancamentoGuardado) }}</div>
      <input ref="inputValor" @input="mascaraMoeda" inputmode="numeric" placeholder="R$ 0,00" class="ios-input-big" style="text-align:center;margin-bottom:1.5rem"/>
      <div class="ios-keyboard-grid"><button v-for="val in valoresRapidos" :key="val.label" @click="setValorRapido(val.val)" class="ios-key-btn">{{ val.label }}</button></div>
      <label class="ios-label" style="margin-top:1rem">Descrição (Opcional)</label>
      <input v-model="formTx.descricao" placeholder="Descrição do lançamento..." class="ios-input" />
      <button @click="confirmarValorLancamento" class="ios-btn-full bg-teal" style="margin-top:1.5rem">Continuar</button>
    </div>

    <!-- Passo 4: Conta -->
    <div v-if="passoLancamento===4" class="ios-step-content">
      <div style="display:flex;align-items:center;margin-bottom:1rem"><button @click="passoLancamento=3" class="ios-back-btn">‹ Voltar</button><p class="ios-label" style="margin:0 auto">Selecione a Conta</p></div>
      <div class="ios-wc-header"><p>Escolha onde registrar o valor de {{ formatar(formTx.valor) }}</p></div>
      <div class="ios-list-container">
        <button v-for="c in accounts.contas" :key="c.id" @click="formTx.accountId=c.id;criarTransacaoStep()" class="ios-option-btn">
          <div class="ios-acc-icon" :style="{background:c.cor+'20',color:c.cor}">{{ c.banco.charAt(0).toUpperCase() }}</div>
          <div><p class="ios-option-title">{{ c.banco }}</p><p class="ios-muted">{{ formatar(c.saldo) }}</p></div>
          <span class="ios-chevron">›</span>
        </button>
      </div>
    </div>
  </div>
</div></div>
</Transition></Teleport>

<!-- MODAL TRANSFERÊNCIA -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="modalTransferencia" class="ios-modal-bg" @click.self="fecharTransferenciaStep">
<div class="ios-modal-card">
  <div class="ios-modal-header">
    <div style="display:flex;align-items:center;gap:.5rem"><span style="font-size:1.2rem">🔄</span> <h3>Transferência</h3></div>
    <button @click="fecharTransferenciaStep" class="ios-close">✕</button>
  </div>
  
  <div class="ios-modal-body">
    <!-- Passo 1: Tipo de Transferência -->
    <div v-if="passoTransf===1" class="ios-step-content">
      <p class="ios-label" style="text-align:center;margin-bottom:1rem">Selecione o destino</p>
      <div class="ios-segmented-grid">
        <button @click="selecionarTipoTransf('propria')" class="ios-select-btn blue">
          <span style="font-size:2rem;margin-bottom:.5rem">🔄</span>
          <span>Contas Próprias</span>
        </button>
        <button @click="selecionarTipoTransf('externa')" class="ios-select-btn green">
          <span style="font-size:2rem;margin-bottom:.5rem">👤</span>
          <span>Outro Usuário</span>
        </button>
      </div>
    </div>

    <!-- Passo 2: Origem -->
    <div v-if="passoTransf===2" class="ios-step-content">
      <div style="display:flex;align-items:center;margin-bottom:1rem"><button @click="passoTransf=1" class="ios-back-btn">‹ Voltar</button><p class="ios-label" style="margin:0 auto">Selecione a Origem</p></div>
      <div class="ios-list-container">
        <button v-for="c in accounts.contas" :key="c.id" @click="formTransf.contaOrigemId=c.id;passoTransf=3" class="ios-option-btn">
          <div class="ios-acc-icon" :style="{background:c.cor+'20',color:c.cor}">{{ c.banco.charAt(0).toUpperCase() }}</div>
          <div><p class="ios-option-title">{{ c.banco }}</p><p class="ios-muted">Saldo: {{ formatar(c.saldo) }}</p></div>
          <span class="ios-chevron">›</span>
        </button>
      </div>
    </div>

    <!-- Passo 3: Destino (Própria ou Externa) -->
    <div v-if="passoTransf===3" class="ios-step-content">
      <div style="display:flex;align-items:center;margin-bottom:1rem"><button @click="passoTransf=2" class="ios-back-btn">‹ Voltar</button><p class="ios-label" style="margin:0 auto">Selecione o Destinatário</p></div>
      
      <!-- Contas Próprias -->
      <div v-if="formTransf.tipo==='propria'" class="ios-list-container">
        <button v-for="c in contasDestino" :key="c.id" @click="selecionarContaDestinoStep(c.id)" class="ios-option-btn">
          <div class="ios-acc-icon" :style="{background:c.cor+'20',color:c.cor}">{{ c.banco.charAt(0).toUpperCase() }}</div>
          <div><p class="ios-option-title">{{ c.banco }}</p><p class="ios-muted">Saldo: {{ formatar(c.saldo) }}</p></div>
          <span class="ios-chevron">›</span>
        </button>
      </div>
      
      <!-- Usuário Externo -->
      <div v-else>
        <input v-model="buscaUsuario" @input="debounceUsuarios" placeholder="Nome ou e-mail do usuário..." class="ios-input" style="margin-bottom:1rem"/>
        <div v-if="buscandoUsuarios" style="text-align:center;padding:1rem"><div class="ios-spinner sm"></div></div>
        <div v-else class="ios-list-container">
          <button v-for="u in usuariosDestino" :key="u.id" @click="selecionarUsuarioStep(u)" class="ios-option-btn">
            <div class="ios-acc-icon" style="background:rgba(255,255,255,0.06)">{{ u.nome.charAt(0).toUpperCase() }}</div>
            <div><p class="ios-option-title">{{ u.nome }}</p><p class="ios-muted">{{ u.email }}</p></div>
            <span class="ios-chevron">›</span>
          </button>
          <div v-if="!usuariosDestino.length && buscaUsuario.length>=2" style="text-align:center;padding:1rem" class="ios-muted">Nenhum usuário encontrado</div>
        </div>
      </div>
    </div>

    <!-- Passo 4 (Somente Externa): Selecionar Conta do Destinatário -->
    <div v-if="passoTransf===4 && formTransf.tipo==='externa'" class="ios-step-content">
      <div style="display:flex;align-items:center;margin-bottom:1rem"><button @click="passoTransf=3" class="ios-back-btn">‹ Voltar</button><p class="ios-label" style="margin:0 auto">Selecione a Conta Destino</p></div>
      <div class="ios-list-container">
        <button v-for="c in contasUsuarioDestino" :key="c.id" @click="selecionarContaExternaStep(c.id)" class="ios-option-btn">
          <div class="ios-acc-icon" style="background:rgba(255,255,255,0.06)">{{ c.banco?.charAt(0).toUpperCase() || c.nome?.charAt(0).toUpperCase() }}</div>
          <div><p class="ios-option-title">{{ c.banco || c.nome }}</p></div>
          <span class="ios-chevron">›</span>
        </button>
      </div>
    </div>

    <!-- Passo 4/5: Valor -->
    <div v-if="(passoTransf===4 && formTransf.tipo==='propria') || (passoTransf===5 && formTransf.tipo==='externa')" class="ios-step-content">
      <div style="display:flex;align-items:center;margin-bottom:1rem"><button @click="passoTransf--" class="ios-back-btn">‹ Voltar</button><p class="ios-label" style="margin:0 auto">Informe o Valor</p></div>
      <input ref="inputValorTransf" @input="mascaraMoeda" inputmode="numeric" placeholder="R$ 0,00" class="ios-input-big" style="text-align:center;margin-bottom:1.5rem"/>
      <div class="ios-keyboard-grid"><button v-for="val in valoresRapidosTransf" :key="val.label" @click="setValorRapidoTransf(val.val)" class="ios-key-btn">{{ val.label }}</button></div>
      <label class="ios-label" style="margin-top:1rem">Mensagem / Descrição</label>
      <input v-model="formTransf.descricao" placeholder="Descrição da transferência..." class="ios-input" />
      <button @click="confirmarValorTransf" class="ios-btn-full bg-blue" style="margin-top:1.5rem">Avançar</button>
    </div>

    <!-- Passo Final: Revisão e Confirmação -->
    <div v-if="(passoTransf===5 && formTransf.tipo==='propria') || (passoTransf===6 && formTransf.tipo==='externa')" class="ios-step-content">
      <div style="display:flex;align-items:center;margin-bottom:1rem"><button @click="passoTransf--" class="ios-back-btn">‹ Voltar</button><p class="ios-label" style="margin:0 auto">Confirmar Dados</p></div>
      <div v-if="previewTransferencia" class="ios-tx-preview-card">
        <div class="preview-item"><span>Valor</span><strong style="font-size:1.25rem;color:#c084fc">{{ formatar(previewTransferencia.valor) }}</strong></div>
        <div class="preview-flow">
          <div class="flow-acc"><div class="ios-acc-icon sm" :style="{background:previewTransferencia.corOrigem+'20',color:previewTransferencia.corOrigem}">{{ previewTransferencia.nomeOrigem.charAt(0).toUpperCase() }}</div><span>{{ previewTransferencia.nomeOrigem }}</span></div>
          <span class="flow-arrow">➔</span>
          <div class="flow-acc"><div class="ios-acc-icon sm" :style="{background:previewTransferencia.corDestino+'20',color:previewTransferencia.corDestino}">{{ previewTransferencia.nomeDestino.charAt(0).toUpperCase() }}</div><span>{{ previewTransferencia.nomeDestino }}</span></div>
        </div>
        <p v-if="previewTransferencia.emailDestino" class="ios-muted" style="text-align:center;font-size:.75rem;margin-top:.5rem">Favorecido: {{ previewTransferencia.emailDestino }}</p>
      </div>
      <button @click="realizarTransferenciaStep" :disabled="loadingTransferencia" class="ios-btn-full bg-teal" style="margin-top:1.5rem">{{ loadingTransferencia?'Enviando...':'Confirmar e Enviar' }}</button>
    </div>
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

<!-- MODAL NOVA/EDITAR DIVIDA -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="modalBill" class="ios-modal-bg" @click.self="modalBill=false">
<div class="ios-modal-card">
  <div class="ios-modal-header">
    <div><h3>{{ formBill.id ? '✏️ Editar Dívida' : '💸 Nova Dívida' }}</h3></div>
    <button @click="modalBill=false" class="ios-close">✕</button>
  </div>
  <div class="ios-modal-body">
    <label class="ios-label">Descrição</label>
    <input v-model="formBill.descricao" placeholder="Ex: Aluguel, Internet, etc." class="ios-input" />

    <label class="ios-label">Valor</label>
    <input ref="inputValorBill" @input="mascaraMoeda" inputmode="numeric" placeholder="R$ 0,00" class="ios-input-big" />

    <label class="ios-label">Dia de Vencimento</label>
    <input v-model.number="formBill.diaVencimento" type="number" min="1" max="31" class="ios-input" />

    <label class="ios-label">Tipo</label>
    <div class="ios-segmented sm">
      <button @click="formBill.tipo='unica'" :class="{active:formBill.tipo==='unica'}">Única</button>
      <button @click="formBill.tipo='recorrente'" :class="{active:formBill.tipo==='recorrente'}">Recorrente</button>
    </div>

    <div v-if="formBill.tipo === 'recorrente'">
      <label class="ios-label">Recorrência</label>
      <div class="ios-chips wrap">
        <button @click="formBill.recorrencia='indefinida'" :class="{active:formBill.recorrencia==='indefinida'}" class="ios-chip">Indefinida / Contínua</button>
        <button @click="formBill.recorrencia='mensal'" :class="{active:formBill.recorrencia==='mensal'}" class="ios-chip">Mensal</button>
        <button @click="formBill.recorrencia='semanal'" :class="{active:formBill.recorrencia==='semanal'}" class="ios-chip">Semanal</button>
      </div>

      <label class="ios-label" style="margin-top: 1rem">Total de Parcelas (0 para contínuo)</label>
      <input v-model.number="formBill.totalParcelas" type="number" min="0" class="ios-input" />
    </div>

    <div class="ios-btn-row">
      <button @click="modalBill=false" class="ios-btn-secondary">Cancelar</button>
      <button @click="salvarDivida" :disabled="loadingBill" class="ios-btn-full bg-red">
        {{ loadingBill ? 'Salvando...' : 'Confirmar' }}
      </button>
    </div>
  </div>
</div></div>
</Transition></Teleport>

<!-- MODAL SELECIONAR CONTA PARA PAGAR DIVIDA -->
<Teleport to="body"><Transition name="ios-modal">
<div v-if="billParaPagar" class="ios-modal-bg" @click.self="billParaPagar=null">
<div class="ios-modal-card sm">
  <div class="ios-modal-header">
    <div><h3>🏦 Pagar Dívida</h3></div>
    <button @click="billParaPagar=null" class="ios-close">✕</button>
  </div>
  <div class="ios-modal-body">
    <p class="ios-muted" style="margin-bottom: 1rem">
      Selecione a conta bancária para realizar o pagamento de <strong>{{ billParaPagar.descricao }}</strong> no valor de <strong>{{ formatar(billParaPagar.valor) }}</strong>.
    </p>

    <label class="ios-label">Conta de Origem</label>
    <div class="ios-chips wrap" style="margin-bottom: 1.5rem">
      <button v-for="c in accounts.contas" :key="c.id" @click="formPagamentoBill.accountId=c.id" :class="{active:formPagamentoBill.accountId===c.id}" class="ios-chip">
        {{ c.banco }} ({{ formatar(c.saldo) }})
      </button>
    </div>

    <div class="ios-btn-row">
      <button @click="billParaPagar=null" class="ios-btn-secondary">Cancelar</button>
      <button @click="confirmarPagamentoDivida" class="ios-btn-full bg-red">
        Confirmar Pagamento
      </button>
    </div>
  </div>
</div></div>
</Transition></Teleport>

<!-- FINORA FLOATING BUTTON -->
<button type="button" class="android-17-gemini-btn" @click="openFinoraChat" @touchend.prevent="openFinoraChat">
  <span class="gemini-icon">✨</span>
  <span class="gemini-label">Fale com a Finora</span>
</button>

<!-- FINORA CHAT — Draggable floating window -->
<Teleport to="body">
<Transition name="finora-modal">
<div
  v-if="showFinoraChat"
  class="finora-glass-card"
  :class="{ thinking: finoraIsThinking, dragging: finoraDragging }"
  :style="finoraWindowStyle"
>

  <!-- Top aurora glow bar -->
  <div class="finora-aurora-bar" :class="{ active: finoraIsThinking }">
    <div class="aurora-streak s1"></div>
    <div class="aurora-streak s2"></div>
    <div class="aurora-streak s3"></div>
  </div>

  <!-- Draggable header -->
  <div
    class="finora-header"
    @mousedown.prevent="initFinoraPosition(); onFinoraDragStart($event)"
    @touchstart.prevent="initFinoraPosition(); onFinoraDragStart($event)"
  >
    <div class="finora-header-left">
      <div class="finora-avatar">
        <span>✨</span>
      </div>
      <div class="finora-header-info">
        <h3 class="finora-title">Finora</h3>
        <span class="finora-status" :class="{ active: finoraIsThinking }">
          {{ finoraIsThinking ? 'Pensando...' : 'Online' }}
        </span>
      </div>
    </div>
    <button @click.stop="showFinoraChat=false" class="finora-close-btn">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
    </button>
  </div>

  <!-- Chat body -->
  <div class="finora-chat-body">
    <div v-for="(msg, i) in finoraMessages" :key="i" :class="['finora-msg', msg.role]">
      <div class="finora-bubble" :class="msg.role">
        <div v-if="msg.loading" class="finora-typing">
          <span></span><span></span><span></span>
        </div>
        <div v-else v-html="formatFinoraMessage(msg.text)"></div>
      </div>
    </div>
  </div>

  <!-- Footer with animated glow -->
  <div class="finora-footer">
    <div class="finora-bottom-glow" :class="{ hidden: finoraIsThinking }"></div>
    <div class="finora-input-row">
      <input
        v-model="finoraInput"
        @input="onFinoraInputChange"
        @keyup.enter="sendFinoraMessage"
        type="text"
        placeholder="Pergunte sobre finanças..."
        class="finora-input"
        :disabled="finoraIsThinking"
      />
      <button @click="sendFinoraMessage" class="finora-send-btn" :disabled="finoraIsThinking || !finoraInput.trim()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>

</div>
</Transition>
</Teleport>

</template>

<style scoped>
.ios-app, .ios-modal-bg { --bg: #07030e; --surface: #0f081c; --surface2: #160c26; --surface3: #1e1135; --blue: #7c3aed; --green: #34d399; --red: #f472b6; --orange: #fb923c; --teal: #a78bfa; --purple: #c084fc; --neon: #b57aff; --neon2: #e879f9; --sep: rgba(139,120,255,.08); --text2: #8b89a8; --text3: rgba(139,137,168,.4); --r: 20px; --r-lg: 28px; color: #fff; font-family: -apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif; }
* { box-sizing: border-box; margin: 0; padding: 0; }
@keyframes neonPulse { 0%,100% { opacity: .6; } 50% { opacity: 1; } }
@keyframes neonFloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-8px) scale(1.03); } }
.ios-app { min-height: 100dvh; background-color: var(--bg); display: flex; flex-direction: column; overflow-x: hidden; transition: background 0.3s; }

/* Desktop Left Sidebar */
.sidebar-desktop { display: none; }
@media (min-width: 1024px) {
  .ios-app { flex-direction: row; }
  .sidebar-desktop { display: flex; flex-direction: column; width: 80px; height: 100vh; position: fixed; top: 0; left: 0; background: var(--surface); border-right: 1px solid var(--sep); padding: 1.5rem 0; justify-content: space-between; align-items: center; z-index: 50; }
  .app-main-wrapper { margin-left: 80px; width: calc(100% - 80px); }
}

.sidebar-logo { display: flex; align-items: center; justify-content: center; width: 100%; height: 3.5rem; }
.hex-logo { font-size: 1.8rem; filter: drop-shadow(0 0 10px rgba(124,58,237,.5)); animation: neonFloat 4s ease-in-out infinite; }
.sidebar-nav { display: flex; flex-direction: column; gap: 1.25rem; margin-top: 2rem; flex: 1; align-items: center; width: 100%; }
.sidebar-tab { display: flex; align-items: center; justify-content: center; width: 3.25rem; height: 3.25rem; border-radius: 16px; background: none; border: none; cursor: pointer; color: var(--text2); transition: all .3s cubic-bezier(.2,1,.3,1); position: relative; }
.sidebar-tab:hover { color: #fff; background: rgba(255,255,255,.05); }
.sidebar-tab.active { background: rgba(124,58,237,.12); color: var(--neon); border: 1px solid rgba(192,132,252,.3); box-shadow: 0 0 16px rgba(124,58,237,.2); }
.sidebar-tab-icon { display: flex; align-items: center; justify-content: center; }
.sidebar-footer { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; width: 100%; }
.sidebar-action-btn { display: flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; border-radius: 50%; background: none; border: none; cursor: pointer; color: var(--text2); transition: all .2s; }
.sidebar-action-btn:hover { color: #fff; background: rgba(255,255,255,.05); }
.sidebar-action-btn.danger:hover { color: var(--red); background: rgba(244,114,182,.1); }

/* Right App Main Wrapper */
.app-main-wrapper { display: flex; flex-direction: column; flex: 1; min-height: 100vh; min-width: 0; }

/* App Header */
.app-header { height: 4.5rem; display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; background: rgba(7,3,14,.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--sep); position: sticky; top: 0; z-index: 40; }
@media (min-width: 768px) { .app-header { padding: 0 2rem; } }
.header-left { display: flex; align-items: center; gap: .5rem; }
.breadcrumb-arrow { color: var(--text3); font-size: .8rem; }
.header-view-title { font-size: 1.15rem; font-weight: 800; color: #fff; letter-spacing: -.02em; }
.header-center-tabs { display: flex; align-items: center; gap: 1.5rem; }
.header-wallet-tab { display: flex; align-items: center; gap: .5rem; font-size: .85rem; font-weight: 600; color: var(--text2); cursor: pointer; transition: color .2s; }
.header-wallet-tab.active { color: #fff; }
.bullet { width: 6px; height: 6px; border-radius: 50%; background: var(--text3); transition: all .3s; }
.bullet.purple { background: var(--neon); box-shadow: 0 0 8px var(--neon); }
.user-profile-badge { display: flex; align-items: center; gap: .75rem; background: rgba(255,255,255,.02); padding: .3rem 1rem .3rem .3rem; border-radius: 99px; border: 1px solid rgba(255,255,255,.04); cursor: pointer; transition: all .2s; }
.user-profile-badge:hover { background: rgba(255,255,255,.05); border-color: rgba(192,132,252,.2); }
.user-avatar-circle { width: 2.25rem; height: 2.25rem; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #a855f7); display: flex; align-items: center; justify-content: center; font-size: .85rem; font-weight: 800; color: #fff; box-shadow: 0 0 12px rgba(124,58,237,.3); }
.user-meta { display: flex; flex-direction: column; text-align: left; }
.user-name { font-size: .8rem; font-weight: 700; color: #fff; line-height: 1.2; }
.user-subtext { font-size: .65rem; color: var(--text3); }

/* Main Content Area */
.app-content-area { flex: 1; padding: 1.5rem; padding-bottom: 6rem; width: 100%; max-width: 1400px; margin: 0 auto; }
@media (min-width: 1024px) { .app-content-area { padding: 2rem; } }

/* Início Dashboard View */
.inicio-dashboard-layout { display: flex; flex-direction: column; gap: 1.5rem; }

/* Wallet Card */
.dashboard-wallet-card { display: flex; flex-direction: column; gap: 1.5rem; background: linear-gradient(135deg, rgba(22,12,38,.8), rgba(15,8,28,.85)); border: 1px solid rgba(192,132,252,.15); border-radius: 24px; padding: 1.75rem; box-shadow: 0 20px 40px rgba(0,0,0,.5), inset 0 1px 1px rgba(255,255,255,.05); position: relative; overflow: hidden; }
@media (min-width: 768px) {
  .dashboard-wallet-card { flex-direction: row; justify-content: space-between; align-items: center; padding: 2rem; }
}
.wallet-left { display: flex; align-items: center; gap: 1.25rem; }
.wallet-icon-wrapper { width: 3.5rem; height: 3.5rem; border-radius: 16px; background: rgba(168,85,247,.08); border: 1px solid rgba(192,132,252,.25); display: flex; align-items: center; justify-content: center; color: var(--neon); box-shadow: 0 0 20px rgba(124,58,237,.15); flex-shrink: 0; }
.wallet-icon-svg { width: 1.75rem; height: 1.75rem; }
.wallet-balance-info { display: flex; flex-direction: column; }
.wallet-label { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text2); }
.wallet-amount { font-size: 2.25rem; font-weight: 800; letter-spacing: -.03em; color: #fff; margin: .15rem 0; display: flex; align-items: baseline; gap: .25rem; }
.wallet-currency { font-size: 1.15rem; font-weight: 500; color: var(--text3); }
.wallet-comparison { font-size: .75rem; color: var(--green); display: flex; align-items: center; gap: .25rem; }
.wallet-stats { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; margin-top: .5rem; }
@media (min-width: 768px) { .wallet-stats { margin-top: 0; } }
.wallet-stat-item { display: flex; flex-direction: column; }
.stat-label { font-size: .65rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text3); }
.stat-value { font-size: .95rem; font-weight: 700; color: #fff; margin-top: 2px; }
.wallet-search-box { display: flex; align-items: center; gap: .5rem; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06); border-radius: 99px; padding: .45rem 1rem; width: 100%; max-width: 200px; transition: all .3s; }
.wallet-search-box:focus-within { border-color: var(--neon); box-shadow: 0 0 12px rgba(124,58,237,.15); }
.wallet-search-box input { background: none; border: none; color: #fff; font-size: .75rem; outline: none; width: 100%; }
.wallet-search-box input::placeholder { color: var(--text3); }
.wallet-actions { display: flex; gap: .75rem; align-items: center; }
.wallet-btn-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.95rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
  color: #fff;
  white-space: nowrap;
}
.wallet-btn-action.green {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.2);
  color: #34d399;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.05);
}
.wallet-btn-action.green:hover {
  background: rgba(16, 185, 129, 0.16);
  border-color: rgba(16, 185, 129, 0.45);
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.25);
  transform: translateY(-2px);
}
.wallet-btn-action.red {
  background: rgba(244, 63, 94, 0.08);
  border-color: rgba(244, 63, 94, 0.2);
  color: #fb7185;
  box-shadow: 0 4px 15px rgba(244, 63, 94, 0.05);
}
.wallet-btn-action.red:hover {
  background: rgba(244, 63, 94, 0.16);
  border-color: rgba(244, 63, 94, 0.45);
  box-shadow: 0 4px 20px rgba(244, 63, 94, 0.25);
  transform: translateY(-2px);
}
.wallet-circle-btn { width: 2.5rem; height: 2.5rem; border-radius: 50%; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .3s; }
.wallet-circle-btn:hover { background: rgba(255,255,255,.08); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.3); }
.wallet-circle-btn.accent { background: var(--blue); border-color: var(--neon); box-shadow: 0 4px 15px rgba(124,58,237,.3); }
.wallet-circle-btn.accent:hover { filter: brightness(1.1); }

/* Dashboard Cards Grid */
.dashboard-row { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
@media (min-width: 1024px) { .dashboard-row { grid-template-columns: repeat(2, 1fr); } }
.dashboard-card { background: var(--surface); border: 1px solid var(--sep); border-radius: 24px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,.4); display: flex; flex-direction: column; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.card-title { font-size: .95rem; font-weight: 700; letter-spacing: .02em; color: #fff; }
.header-legend { display: flex; align-items: center; gap: .75rem; font-size: .7rem; color: var(--text3); }
.legend-dot { width: 6px; height: 6px; border-radius: 50%; }
.legend-dot.purple { background: var(--neon); box-shadow: 0 0 6px var(--neon); }
.legend-dot.gray { background: var(--text3); }
.card-menu-btn { background: none; border: none; color: var(--text3); cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; }
.card-menu-btn:hover { color: var(--text2); }

/* Sales Analytics Widget */
.sales-pills-row { display: flex; gap: .75rem; margin-bottom: 1.25rem; }
.sales-pill-item { display: flex; align-items: center; gap: .75rem; background: rgba(255,255,255,.01); border: 1px solid rgba(255,255,255,.04); border-radius: 14px; padding: .6rem .85rem; flex: 1; min-width: 0; }
.pill-icon-down, .pill-icon-up { width: 1.75rem; height: 1.75rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: .8rem; }
.pill-icon-down { background: rgba(244,114,182,.08); color: var(--red); }
.pill-icon-up { background: rgba(52,211,153,.08); color: var(--green); }
.pill-meta { display: flex; flex-direction: column; min-width: 0; }
.pill-title { font-size: .6rem; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: .05em; }
.pill-val { font-size: .95rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: .25rem; margin-top: 2px; }
.neg-badge { font-size: .6rem; font-weight: 700; color: var(--red); background: rgba(244,114,182,.12); padding: .1rem .3rem; border-radius: 4px; }
.bar-chart-container { display: flex; gap: .5rem; height: 160px; margin-top: .75rem; }
.bar-chart-y-axis { display: flex; flex-direction: column; justify-content: space-between; font-size: .6rem; color: var(--text3); text-align: right; width: 44px; padding-bottom: 20px; }
.bar-chart-bars { display: flex; justify-content: space-around; align-items: flex-end; flex: 1; height: 100%; }
.bar-column { display: flex; flex-direction: column; align-items: center; gap: .4rem; flex: 1; height: 100%; }
.bar-tracks-wrapper { display: flex; gap: 4px; align-items: flex-end; height: calc(100% - 18px); width: 100%; justify-content: center; }
.bar-track-bg {
  position: relative;
  width: 14px;
  height: 100%;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}
.bar-track-bg:hover {
  transform: scaleY(1.05) scaleX(1.1);
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.2);
  background: rgba(255, 255, 255, 0.07);
}
.bar-track-stacked {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  transition: height 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
  border-radius: 6px;
}
.bar-segment { width: 100%; transition: all .3s ease; }
.bar-segment:hover { filter: brightness(1.25); }
.bar-label { font-size: .65rem; color: var(--text3); }

.tooltip-trigger { position: relative; }
.chart-tooltip { position: absolute; bottom: 100%; left: 50%; transform: translate(-50%, -8px); background: rgba(18, 14, 37, 0.95); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 8px; padding: 6px 10px; font-size: 0.7rem; color: #fff; white-space: nowrap; pointer-events: none; opacity: 0; visibility: hidden; transition: opacity 0.2s ease, visibility 0.2s ease; z-index: 10; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4); }
.tooltip-trigger:hover .chart-tooltip { opacity: 1; visibility: visible; }
.tooltip-title { font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 2px; }
.tooltip-row { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.chart-dot-marker { fill: #a855f7; stroke: rgba(18, 14, 37, 0.95); stroke-width: 1.5; cursor: pointer; transition: r 0.2s ease; }
.chart-dot-marker:hover { r: 6.5; fill: #ffffff; }

/* Indicators Widget */
.header-left-meta { display: flex; flex-direction: column; }
.card-subtitle { font-size: .7rem; color: var(--text3); margin-top: 1px; }
.indicators-periods { display: flex; background: rgba(255,255,255,.03); border-radius: 99px; padding: 2px; }
.indicators-periods button { background: none; border: none; color: var(--text3); font-size: .65rem; font-weight: 600; padding: .25rem .65rem; border-radius: 99px; cursor: pointer; transition: all .2s; }
.indicators-periods button.active { background: #a855f7; color: #fff; box-shadow: 0 2px 8px rgba(168,85,247,.3); }
.indicators-chart-container { height: 160px; margin: .75rem 0; position: relative; }
.indicators-svg { width: 100%; height: 100%; overflow: visible; }
.indicators-bottom-row { display: flex; justify-content: space-between; align-items: center; margin-top: .5rem; }
.indicators-btc-val { display: flex; flex-direction: column; }
.btc-label { font-size: .65rem; color: var(--text3); }
.btc-amount { font-size: 1.05rem; font-weight: 800; color: #fff; margin-top: 2px; }
.indicators-pct-badge { display: flex; align-items: center; gap: .15rem; color: var(--green); font-size: .7rem; font-weight: 700; background: rgba(52,211,153,.12); padding: .2rem .4rem; border-radius: 6px; }

/* Connections Widget */
.connections-body { display: flex; flex-direction: column; gap: 1.15rem; margin-top: .25rem; }
.connection-item { display: flex; flex-direction: column; gap: .4rem; }
.conn-meta { display: flex; justify-content: space-between; align-items: center; }
.conn-label { font-size: .75rem; font-weight: 600; color: var(--text2); }
.conn-pct { font-size: .8rem; font-weight: 700; color: var(--neon); }
.segmented-progress-bar { display: flex; gap: 4px; height: 5px; margin-top: 2px; }
.progress-segment { flex: 1; height: 100%; background: rgba(255,255,255,.02); border-radius: 99px; transition: all .3s ease; }
.progress-segment.filled { background: linear-gradient(90deg, #7c3aed, #c084fc); box-shadow: 0 0 8px rgba(124,58,237,.35); }

/* Insights Mini Widgets */
.insights-grid-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
.insight-mini-card { position: relative; background: var(--surface); border: 1px solid var(--sep); border-radius: 20px; padding: 1.15rem; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 24px rgba(0,0,0,.35); transition: all .3s ease; }
.insight-mini-card:hover { border-color: rgba(124,58,237,.15); box-shadow: 0 12px 32px rgba(0,0,0,.5); transform: translateY(-3px); }
.insight-top { display: flex; justify-content: space-between; align-items: center; width: 100%; position: relative; z-index: 2; }
.insight-icon-container { width: 1.75rem; height: 1.75rem; border-radius: 8px; background: rgba(168,85,247,.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.insight-action-btn { background: none; border: none; color: var(--text3); font-size: .65rem; font-weight: 700; cursor: pointer; transition: color .2s; }
.insight-action-btn:hover { color: var(--neon); }
.insight-bottom { display: flex; flex-direction: column; margin-top: 1rem; position: relative; z-index: 2; }
.insight-label { font-size: .65rem; font-weight: 600; color: var(--text2); }
.insight-value { font-size: 1.15rem; font-weight: 800; color: #fff; margin: .1rem 0; }
.insight-trend { font-size: .65rem; color: var(--green); display: flex; align-items: center; gap: 2px; }
.insight-trend.red { color: var(--red); }
.insight-sparkline-bg { position: absolute; bottom: 0; right: 0; width: 100%; height: 50%; opacity: .3; z-index: 1; pointer-events: none; overflow: visible; }

/* Responsive Mobile Navigation */
.ios-mobile-nav { display: none; }
@media (max-width: 1023px) {
  .ios-mobile-nav { display: flex; position: fixed; bottom: 0; left: 0; right: 0; height: 4rem; z-index: 999; background: rgba(15,8,28,.9); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-top: 1px solid var(--sep); justify-content: space-around; align-items: center; padding-bottom: max(4px, env(safe-area-inset-bottom)); }
  .ios-mobile-tab { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: none; border: none; color: var(--text3); cursor: pointer; transition: all .2s; font-family: inherit; }
  .ios-mobile-tab.active { color: var(--neon); text-shadow: 0 0 10px rgba(192,132,252,.4); }
  .ios-mobile-icon { display: flex; align-items: center; justify-content: center; font-size: 1.15rem; }
  .ios-mobile-label { font-size: .55rem; font-weight: 600; }
}

.dashboard-search-results { display: flex; flex-direction: column; gap: .5rem; margin-top: 1.25rem; }

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
.bill-card.bill-paid { opacity: 0.75; transition: opacity .2s, border-color .3s; }
.bill-card.bill-paid:hover { opacity: 1; }

/* Pills & chips */
.ios-pill-btn { font-size: .7rem; font-weight: 600; padding: .35rem .75rem; border-radius: 99px; border: none; cursor: pointer; transition: all .2s; font-family: inherit; background: rgba(124,58,237,.1); color: var(--neon); }
.ios-pill-btn:hover { background: rgba(124,58,237,.2); box-shadow: 0 0 10px rgba(124,58,237,.15); }
.ios-pill-btn.blue { background: rgba(124,58,237,.1); color: var(--blue); }
.ios-pill-btn.green { background: rgba(52,211,153,.1); color: var(--green); }
.ios-pill-btn.red { background: rgba(239, 68, 68, .1); color: var(--red); }
.ios-pill-btn.orange { background: rgba(249, 115, 22, .1); color: var(--orange); }

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

/* Step navigation & layout */
.ios-step-content { display: flex; flex-direction: column; gap: .75rem; }
.ios-back-btn { background: none; border: none; color: var(--text3); font-size: .8rem; font-weight: 600; cursor: pointer; padding: .25rem 0; transition: color .2s; display: flex; align-items: center; gap: .25rem; font-family: inherit; flex-shrink: 0; }
.ios-back-btn:hover { color: #fff; }

/* Type selector grid (Receita / Despesa) */
.ios-segmented-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
.ios-select-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .35rem; padding: 1.5rem .75rem; border-radius: 16px; border: 1px solid rgba(255,255,255,.06); background: rgba(255,255,255,.02); cursor: pointer; color: #fff; font-size: .85rem; font-weight: 700; transition: all .2s; font-family: inherit; }
.ios-select-btn:hover { background: rgba(255,255,255,.06); transform: translateY(-2px); }
.ios-select-btn:active { transform: scale(.97); }
.ios-select-btn.green { border-color: rgba(52,211,153,.25); }
.ios-select-btn.green:hover { background: rgba(52,211,153,.08); box-shadow: 0 0 20px rgba(52,211,153,.12); }
.ios-select-btn.red { border-color: rgba(244,114,182,.25); }
.ios-select-btn.red:hover { background: rgba(244,114,182,.08); box-shadow: 0 0 20px rgba(244,114,182,.12); }
.ios-select-btn.blue { border-color: rgba(124,58,237,.25); }
.ios-select-btn.blue:hover { background: rgba(124,58,237,.08); box-shadow: 0 0 20px rgba(124,58,237,.12); }

/* Value preview above the input */
.ios-val-preview { font-size: 1.4rem; font-weight: 800; color: #fff; text-align: center; letter-spacing: -.02em; padding: .25rem 0; }

/* Quick-amount chip buttons grid */
.ios-keyboard-grid { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .5rem; }
.ios-key-btn { padding: .4rem .75rem; border-radius: 99px; border: .5px solid rgba(168,85,247,.2); background: rgba(168,85,247,.06); color: rgba(255,255,255,.8); font-size: .75rem; font-weight: 700; cursor: pointer; transition: all .2s; font-family: inherit; }
.ios-key-btn:hover { background: rgba(168,85,247,.15); border-color: rgba(168,85,247,.4); color: #fff; }
.ios-key-btn:active { transform: scale(.95); }

/* Account list inside modals */
.ios-list-container { display: flex; flex-direction: column; gap: .45rem; }
.ios-acc-icon { width: 2.5rem; height: 2.5rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 800; flex-shrink: 0; }
.ios-wc-header { background: rgba(168,85,247,.05); border: .5px solid rgba(168,85,247,.12); border-radius: 12px; padding: .65rem .85rem; font-size: .8rem; color: var(--text2); }

/* Finora Floating Button (Android 17 Style) */
.android-17-gemini-btn { position: fixed; bottom: calc(max(1rem, env(safe-area-inset-bottom)) + 4rem); left: 50%; transform: translateX(-50%); z-index: 45; background: rgba(20,18,32, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(192,132,252,.4); border-radius: 99px; padding: .65rem 1.5rem; display: flex; align-items: center; gap: .6rem; color: #fff; font-weight: 600; font-size: .9rem; box-shadow: 0 4px 24px rgba(124,58,237,.3), inset 0 0 12px rgba(192,132,252,.1); cursor: pointer; transition: all .3s cubic-bezier(.2,1,.3,1); font-family: inherit; }
@media(min-width:1024px) { .android-17-gemini-btn { bottom: 2rem; } }
.android-17-gemini-btn::before { content: ''; position: absolute; inset: -1px; border-radius: 99px; background: linear-gradient(90deg, #7c3aed, #e879f9, #7c3aed, #a78bfa, #7c3aed); background-size: 200% auto; z-index: -1; animation: borderGlowAnim 3s linear infinite; opacity: 0.6; transition: opacity .3s; }
.android-17-gemini-btn:hover { transform: translateX(-50%) scale(1.05); box-shadow: 0 8px 32px rgba(124,58,237,.5), inset 0 0 16px rgba(192,132,252,.3); }
.android-17-gemini-btn:hover::before { opacity: 1; }
.android-17-gemini-btn:active { transform: translateX(-50%) scale(0.95); }
@keyframes borderGlowAnim { to { background-position: 200% center; } }
.gemini-icon { filter: drop-shadow(0 0 8px rgba(232,121,249,0.8)); }

/* ═══════════════════════════════════════════════════════════════
   FINORA CHAT — Floating Draggable Glass Window
   ═══════════════════════════════════════════════════════════════ */

/* Glass Card — floating, no overlay */
.finora-glass-card {
  position: fixed;
  z-index: 9999;
  right: 1.5rem; bottom: 6rem;
  width: 380px; height: 580px;
  display: flex; flex-direction: column;
  background: rgba(14, 8, 28, 0.55);
  backdrop-filter: blur(60px) saturate(200%);
  -webkit-backdrop-filter: blur(60px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 22px;
  box-shadow:
    0 0 0 0.5px rgba(255,255,255,0.03),
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(168,85,247,0.04),
    inset 0 1px 0 rgba(255,255,255,0.05);
  overflow: hidden;
  transition: box-shadow .6s ease;
  resize: none;
}
.finora-glass-card.thinking {
  box-shadow:
    0 0 0 0.5px rgba(168,85,247,0.15),
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 50px rgba(168,85,247,0.1),
    0 0 100px rgba(168,85,247,0.04),
    inset 0 1px 0 rgba(255,255,255,0.08);
}
.finora-glass-card.dragging {
  cursor: grabbing;
  opacity: 0.92;
  transition: none !important;
}
@media (max-width: 500px) {
  .finora-glass-card { width: calc(100vw - 1.5rem); right: .75rem; bottom: 5rem; height: 70vh; }
}

/* ── Aurora Glow Bar (top) — 4px wide, visible shimmer ── */
.finora-aurora-bar {
  position: absolute; top: 0; left: 0; right: 0;
  height: 4px; z-index: 10;
  overflow: hidden;
  border-radius: 22px 22px 0 0;
  background: rgba(255, 255, 255, 0.02);
}
.aurora-streak {
  position: absolute; top: 0; height: 100%;
  border-radius: 99px;
  will-change: transform;
}
/* Idle — faint slow drift */
.aurora-streak.s1 {
  left: 5%; width: 30%;
  background: linear-gradient(90deg, transparent, rgba(168,85,247,0.35), transparent);
  animation: auroraFloat1 7s linear infinite;
  opacity: 0.35;
}
.aurora-streak.s2 {
  left: 35%; width: 25%;
  background: linear-gradient(90deg, transparent, rgba(232,121,249,0.3), transparent);
  animation: auroraFloat2 9s linear infinite;
  opacity: 0.3;
}
.aurora-streak.s3 {
  left: 60%; width: 28%;
  background: linear-gradient(90deg, transparent, rgba(139,92,246,0.35), transparent);
  animation: auroraFloat3 8s linear infinite;
  opacity: 0.3;
}
/* Thinking — intense fast sweep */
.finora-aurora-bar.active .aurora-streak.s1 {
  opacity: 1; width: 45%;
  background: linear-gradient(90deg, transparent, rgba(168,85,247,0.1) 15%, rgba(168,85,247,1) 50%, rgba(192,132,252,0.8) 75%, transparent);
  animation: auroraThink1 1.6s linear infinite;
}
.finora-aurora-bar.active .aurora-streak.s2 {
  opacity: 0.95; width: 40%;
  background: linear-gradient(90deg, transparent, rgba(232,121,249,0.1) 15%, rgba(232,121,249,0.9) 50%, rgba(168,85,247,0.7) 75%, transparent);
  animation: auroraThink2 2.2s linear infinite;
}
.finora-aurora-bar.active .aurora-streak.s3 {
  opacity: 0.9; width: 38%;
  background: linear-gradient(90deg, transparent, rgba(139,92,246,0.1) 15%, rgba(139,92,246,0.95) 50%, rgba(232,121,249,0.6) 75%, transparent);
  animation: auroraThink3 1.4s linear infinite;
}

@keyframes auroraFloat1 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(90px); } }
@keyframes auroraFloat2 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-70px); } }
@keyframes auroraFloat3 { 0%,100% { transform: translateX(0); } 50% { transform: translateX(60px); } }
@keyframes auroraThink1 { 0% { transform: translateX(-110%); } 100% { transform: translateX(250%); } }
@keyframes auroraThink2 { 0% { transform: translateX(220%); } 100% { transform: translateX(-130%); } }
@keyframes auroraThink3 { 0% { transform: translateX(-100%); } 100% { transform: translateX(230%); } }


/* ── Header (drag handle) ── */
.finora-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: .85rem 1.15rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.015);
  cursor: grab; user-select: none;
  -webkit-user-select: none;
}
.finora-header:active { cursor: grabbing; }
.finora-header-left { display: flex; align-items: center; gap: .6rem; pointer-events: none; }
.finora-avatar {
  width: 2rem; height: 2rem;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(232,121,249,0.1));
  border: 1px solid rgba(168,85,247,0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: .9rem;
}
.finora-header-info { display: flex; flex-direction: column; }
.finora-title { font-size: .82rem; font-weight: 700; color: #fff; letter-spacing: -.01em; }
.finora-status {
  font-size: .55rem; font-weight: 600;
  color: rgba(52,211,153,0.7);
  transition: color .4s ease;
}
.finora-status.active { color: #c084fc; animation: statusPulse 1.5s ease-in-out infinite; }
@keyframes statusPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

.finora-close-btn {
  width: 1.6rem; height: 1.6rem;
  border-radius: 50%; border: none;
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.3);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all .2s; pointer-events: auto;
}
.finora-close-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }

/* ── Chat Body ── */
.finora-chat-body {
  flex: 1; overflow-y: auto;
  padding: 1rem 1.15rem;
  display: flex; flex-direction: column; gap: .75rem;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.06) transparent;
}
.finora-chat-body::-webkit-scrollbar { width: 3px; }
.finora-chat-body::-webkit-scrollbar-track { background: transparent; }
.finora-chat-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.06); border-radius: 10px; }

/* Messages */
.finora-msg { display: flex; width: 100%; }
.finora-msg.user { justify-content: flex-end; }
.finora-msg.bot { justify-content: flex-start; }

.finora-bubble {
  max-width: 82%; padding: .6rem .9rem;
  font-size: .8rem; line-height: 1.5;
  border-radius: 14px; white-space: pre-wrap;
}
.finora-bubble.user {
  background: linear-gradient(135deg, rgba(124,58,237,0.6), rgba(168,85,247,0.45));
  border: 1px solid rgba(168,85,247,0.18);
  color: #fff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 3px 12px rgba(124,58,237,0.12);
}
.finora-bubble.bot {
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.05);
  color: rgba(200,198,220,0.9);
  border-bottom-left-radius: 4px;
}
.finora-bubble.bot :deep(strong) { font-weight: 700; color: #fff; }
.finora-bubble.bot :deep(em) { font-style: italic; color: rgba(255,255,255,.7); }

/* Typing dots */
.finora-typing {
  display: flex; gap: 5px; padding: 4px 2px;
  align-items: center; justify-content: center; height: 1.25rem;
}
.finora-typing span {
  width: 5px; height: 5px;
  background: rgba(192,132,252,0.7);
  border-radius: 50%;
  animation: finoraTyping 1.4s infinite ease-in-out both;
}
.finora-typing span:nth-child(1) { animation-delay: -0.32s; }
.finora-typing span:nth-child(2) { animation-delay: -0.16s; }
@keyframes finoraTyping { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

/* ── Footer ── */
.finora-footer {
  position: relative;
  padding: .7rem 1rem;
  border-top: 1px solid rgba(255,255,255,0.03);
  background: rgba(0,0,0,0.1);
  border-radius: 0 0 22px 22px;
  overflow: hidden;
}

/* Bottom animated moving glow — always-on when idle, hidden when thinking */
.finora-bottom-glow {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 50px; pointer-events: none;
  background:
    radial-gradient(ellipse 60% 100% at 50% 100%, rgba(168,85,247,0.12) 0%, transparent 60%);
  opacity: 1;
  transition: opacity .5s ease;
}
.finora-bottom-glow::before {
  content: '';
  position: absolute; bottom: 0;
  width: 40%; height: 100%;
  background: radial-gradient(ellipse at center bottom, rgba(192,132,252,0.2) 0%, transparent 70%);
  filter: blur(8px);
  animation: bottomGlowSweep 4s ease-in-out infinite;
}
.finora-bottom-glow::after {
  content: '';
  position: absolute; bottom: 0;
  width: 30%; height: 100%;
  background: radial-gradient(ellipse at center bottom, rgba(232,121,249,0.12) 0%, transparent 70%);
  filter: blur(10px);
  animation: bottomGlowSweep2 5.5s ease-in-out infinite;
}
.finora-bottom-glow.hidden { opacity: 0; }

@keyframes bottomGlowSweep {
  0%, 100% { left: 5%; } 50% { left: 55%; }
}
@keyframes bottomGlowSweep2 {
  0%, 100% { left: 60%; } 50% { left: 10%; }
}

.finora-input-row { display: flex; gap: .45rem; position: relative; z-index: 2; }

.finora-input {
  flex: 1;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: .6rem .8rem;
  color: #fff; font-size: .8rem; font-family: inherit;
  outline: none;
  transition: border-color .3s, box-shadow .3s, background .3s;
}
.finora-input::placeholder { color: rgba(255,255,255,0.18); }
.finora-input:focus {
  border-color: rgba(168,85,247,0.2);
  box-shadow: 0 0 12px rgba(168,85,247,0.05);
  background: rgba(255,255,255,0.04);
}
.finora-input:disabled { opacity: .5; cursor: not-allowed; }

.finora-send-btn {
  width: 2.3rem; height: 2.3rem;
  border-radius: 11px; border: none;
  background: linear-gradient(135deg, rgba(124,58,237,0.45), rgba(168,85,247,0.35));
  border: 1px solid rgba(168,85,247,0.18);
  color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all .2s; flex-shrink: 0;
}
.finora-send-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(124,58,237,0.65), rgba(168,85,247,0.55));
  box-shadow: 0 0 14px rgba(168,85,247,0.18);
}
.finora-send-btn:active:not(:disabled) { transform: scale(.93); }
.finora-send-btn:disabled { opacity: .3; cursor: not-allowed; }

/* ── Finora Modal Transition ── */
.finora-modal-enter-active { transition: all .35s cubic-bezier(.16,1,.3,1); }
.finora-modal-leave-active { transition: all .2s ease; }
.finora-modal-enter-from { opacity: 0; transform: translateY(20px) scale(.95); }
.finora-modal-leave-to { opacity: 0; transform: translateY(10px) scale(.98); }

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

/* ── Radar de Dívidas ── */
.dividas-overview-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 0.5rem;
}
@media (min-width: 1024px) {
  .dividas-overview-body {
    grid-template-columns: 1.2fr 1fr 1fr;
  }
}
.overview-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.section-subtitle {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--sep);
  padding-bottom: 0.5rem;
}
.overview-main-stat {
  display: flex;
  gap: 1.5rem;
}
.stat-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--surface2);
  border: 1px solid var(--sep);
  border-radius: 16px;
  padding: 1rem;
}
.stat-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}
.stat-value {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 0.25rem;
}
.stat-subtext {
  font-size: 0.65rem;
  color: var(--text3);
}
.projected-balance-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: rgba(52, 211, 153, 0.04);
  border: 1px solid rgba(52, 211, 153, 0.15);
  border-radius: 16px;
  padding: 0.85rem 1rem;
  transition: all 0.3s;
}
.projected-balance-banner.warning {
  background: rgba(244, 114, 182, 0.04);
  border-color: rgba(244, 114, 182, 0.15);
}
.banner-icon {
  font-size: 1.2rem;
  line-height: 1.2;
}
.banner-text {
  display: flex;
  flex-direction: column;
}
.banner-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.15rem;
}
.banner-desc {
  font-size: 0.7rem;
  color: var(--text2);
  line-height: 1.4;
}
.alerts-section {
  display: flex;
  flex-direction: column;
}
.alert-box {
  display: flex;
  gap: 0.75rem;
  border-radius: 16px;
  padding: 1rem;
  flex: 1;
}
.alert-box.danger {
  background: rgba(244, 114, 182, 0.05);
  border: 1px solid rgba(244, 114, 182, 0.15);
  box-shadow: 0 4px 15px rgba(244, 114, 182, 0.05);
}
.alert-box.warning {
  background: rgba(251, 146, 60, 0.05);
  border: 1px solid rgba(251, 146, 60, 0.15);
  box-shadow: 0 4px 15px rgba(251, 146, 60, 0.05);
}
.alert-box.success {
  background: rgba(52, 211, 153, 0.05);
  border: 1px solid rgba(52, 211, 153, 0.15);
  box-shadow: 0 4px 15px rgba(52, 211, 153, 0.05);
  justify-content: center;
  align-items: center;
  text-align: center;
  flex-direction: column;
}
.alert-icon {
  font-size: 1.3rem;
  line-height: 1.2;
}
.alert-box.success .alert-icon {
  font-size: 1.8rem;
  margin-bottom: 0.25rem;
}
.alert-content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.alert-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
}
.alert-desc {
  font-size: 0.7rem;
  color: var(--text2);
  line-height: 1.4;
}
.alert-desc strong {
  color: #fff;
}
.next-month-section {
  display: flex;
  flex-direction: column;
}
.next-month-card {
  background: var(--surface2);
  border: 1px solid var(--sep);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex: 1;
}
.next-month-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.next-month-icon {
  font-size: 1.5rem;
  line-height: 1;
}
.next-month-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
}
.next-month-sub {
  font-size: 0.65rem;
  color: var(--text3);
}
.next-month-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.01);
  border-radius: 12px;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.02);
}
.projection-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}
.projection-row span {
  color: var(--text2);
}
.projection-row strong {
  color: #fff;
  font-size: 0.85rem;
}
.projection-row strong.text-blue {
  color: var(--teal);
  font-size: 1rem;
}

/* Color Helpers */
.text-red { color: var(--red); }
.text-purple { color: var(--purple); }
.text-blue { color: var(--blue); }
.text-green { color: var(--green); }
.text-orange { color: var(--orange); }

/* UI optimization layer */
.ios-app,
.ios-modal-bg {
  --bg: #05030a;
  --surface: rgba(16, 10, 28, 0.88);
  --surface2: rgba(25, 15, 41, 0.9);
  --surface3: rgba(34, 22, 55, 0.92);
  --sep: rgba(176, 152, 255, 0.14);
  --text2: #aaa4c3;
  --text3: #69637f;
  --green: #3ddc97;
  --red: #fb7185;
  --blue: #7c3aed;
  --teal: #22d3ee;
  --purple: #c084fc;
  --neon: #b982ff;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ios-app {
  background-color: var(--bg);
}

@media (min-width: 1024px) {
  .sidebar-desktop {
    width: 76px;
    background: linear-gradient(180deg, rgba(13, 7, 25, 0.96), rgba(10, 6, 18, 0.98));
    border-right-color: rgba(176, 152, 255, 0.12);
    box-shadow: 12px 0 36px rgba(0, 0, 0, 0.24);
  }

  .app-main-wrapper {
    margin-left: 76px;
    width: calc(100% - 76px);
  }
}

.hex-logo {
  animation: none;
  filter: drop-shadow(0 0 12px rgba(168, 85, 247, 0.55));
}

.sidebar-nav {
  gap: 0.9rem;
}

.sidebar-tab {
  width: 3rem;
  height: 3rem;
  border-radius: 14px;
}

.sidebar-tab:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}

.sidebar-tab.active {
  background: linear-gradient(180deg, rgba(124, 58, 237, 0.2), rgba(124, 58, 237, 0.08));
  border-color: rgba(192, 132, 252, 0.42);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 10px 26px rgba(124, 58, 237, 0.22);
}

.app-header {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto minmax(220px, 1fr);
  gap: 1rem;
  height: 4.25rem;
  padding: 0 1.25rem;
  background: rgba(5, 3, 10, 0.82);
  border-bottom-color: rgba(176, 152, 255, 0.1);
}

.header-left,
.header-right {
  min-width: 0;
}

.header-right {
  display: flex;
  justify-content: flex-end;
}

.header-center-tabs {
  justify-self: center;
  gap: 1.25rem;
  min-width: 0;
}

.header-wallet-tab {
  color: #8f89aa;
  white-space: nowrap;
}

.header-wallet-tab.active {
  color: #f4f0ff;
}

.user-profile-badge {
  max-width: 230px;
  background: rgba(255, 255, 255, 0.035);
  border-color: rgba(255, 255, 255, 0.075);
}

.user-meta {
  min-width: 0;
}

.user-name,
.user-subtext {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-content-area {
  max-width: 1560px;
  padding: 1.6rem;
}

@media (min-width: 1440px) {
  .app-content-area {
    padding: 2rem 2.4rem 4rem;
  }
}

.inicio-dashboard-layout {
  gap: 1.25rem;
}

.dashboard-wallet-card {
  display: grid;
  grid-template-columns: minmax(290px, 1fr);
  gap: 1.35rem;
  background:
    linear-gradient(135deg, rgba(22, 13, 38, 0.94), rgba(9, 7, 18, 0.96)),
    linear-gradient(90deg, rgba(34, 211, 238, 0.08), rgba(192, 132, 252, 0.08));
  border-color: rgba(192, 132, 252, 0.22);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 22px 55px rgba(0, 0, 0, 0.46), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.dashboard-wallet-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.38), rgba(192, 132, 252, 0.35), transparent);
  pointer-events: none;
}

@media (min-width: 1180px) {
  .dashboard-wallet-card {
    grid-template-columns: minmax(340px, 0.9fr) minmax(620px, 1.1fr);
    align-items: center;
  }
}

.wallet-left {
  min-width: 0;
}

.wallet-icon-wrapper {
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 14px;
  background: rgba(168, 85, 247, 0.1);
  border-color: rgba(192, 132, 252, 0.34);
}

.wallet-balance-info {
  min-width: 0;
}

.wallet-label {
  color: #a7a0bd;
}

.wallet-amount {
  flex-wrap: wrap;
  row-gap: 0;
  line-height: 1.05;
}

.wallet-currency {
  color: #77718f;
}

.wallet-comparison {
  color: var(--green);
  font-weight: 600;
}

.wallet-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(104px, auto)) minmax(190px, 1fr) auto;
  gap: 0.85rem;
  justify-content: end;
  align-items: center;
  margin-top: 0;
}

.wallet-stat-item {
  min-width: 104px;
}

.wallet-stat-item .stat-label {
  color: #8f89aa;
  font-size: 0.68rem;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.wallet-stat-item .stat-value {
  font-size: 1.05rem;
  line-height: 1.15;
}

.wallet-search-box {
  width: 100%;
  max-width: none;
  min-width: 180px;
  height: 2.65rem;
  background: rgba(255, 255, 255, 0.045);
  border-color: rgba(255, 255, 255, 0.08);
}

.search-icon {
  display: inline-flex;
  color: #9bdcf2;
}

.wallet-actions {
  gap: 0.55rem;
}

.wallet-btn-action {
  height: 2.65rem;
  border-radius: 999px;
  padding: 0 0.9rem;
  font-weight: 700;
}

.wallet-circle-btn {
  width: 2.65rem;
  height: 2.65rem;
}

.dashboard-row {
  gap: 1.25rem;
}

@media (min-width: 1180px) {
  .dashboard-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

.dashboard-row-spaced {
  margin-top: 1.25rem;
}

.dashboard-card-full {
  grid-column: 1 / -1;
}

.dashboard-card,
.insight-mini-card,
.next-month-card,
.stat-group,
.projected-balance-banner,
.alert-box {
  border-color: rgba(176, 152, 255, 0.12);
}

.dashboard-card {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(18, 10, 31, 0.92), rgba(13, 8, 23, 0.94));
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.035);
}

.dashboard-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, rgba(34, 211, 238, 0), rgba(34, 211, 238, 0.28), rgba(192, 132, 252, 0.2), rgba(34, 211, 238, 0));
  opacity: 0.75;
  pointer-events: none;
}

.card-header {
  gap: 0.9rem;
  align-items: flex-start;
}

.card-title {
  line-height: 1.25;
}

.header-legend {
  margin-left: auto;
}

.card-menu-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.055);
  color: #847d9e;
  flex: 0 0 auto;
}

.card-menu-btn:hover {
  color: #fff;
  background: rgba(168, 85, 247, 0.14);
  border-color: rgba(192, 132, 252, 0.24);
}

.sales-pills-row {
  gap: 0.85rem;
}

.sales-pill-item {
  background: rgba(255, 255, 255, 0.025);
  border-color: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  min-height: 3.85rem;
}

.pill-title {
  color: #797392;
}

.pill-val {
  line-height: 1.15;
}

.bar-chart-container,
.indicators-chart-container {
  height: 178px;
}

.bar-chart-y-axis,
.bar-label,
.btc-label,
.card-subtitle {
  color: #6f6986;
}

.bar-track-bg {
  width: 16px;
  background: rgba(255, 255, 255, 0.045);
}

.indicators-periods {
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.045);
}

.indicators-periods button {
  color: #746e8c;
}

.indicators-periods button.active {
  background: linear-gradient(135deg, #8b5cf6, #c084fc);
}

.indicators-bottom-row {
  padding-top: 0.15rem;
}

.connections-body {
  gap: 1.25rem;
}

.conn-label {
  color: #a19bb9;
}

.progress-segment {
  background: rgba(255, 255, 255, 0.045);
}

.insights-grid-col {
  gap: 1.25rem;
}

.insight-mini-card {
  min-height: 11.5rem;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(18, 10, 31, 0.92), rgba(13, 8, 23, 0.94));
}

.insight-icon-container {
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(192, 132, 252, 0.18);
}

.insight-label {
  color: #aaa4c3;
}

.insight-action-btn {
  color: #746e8c;
}

.insight-sparkline-bg {
  opacity: 0.38;
}

.dividas-overview-card .card-header {
  align-items: center;
}

.dividas-overview-body {
  gap: 1.25rem;
}

.overview-main-stat {
  gap: 0.85rem;
}

.stat-group {
  background: rgba(255, 255, 255, 0.035);
  border-radius: 14px;
}

.stat-group .stat-label {
  color: #8f89aa;
  font-size: 0.68rem;
  line-height: 1;
}

.stat-group .stat-value {
  font-size: 1.25rem;
  line-height: 1.15;
}

.projected-balance-banner,
.alert-box,
.next-month-card {
  border-radius: 14px;
}

.next-month-card {
  background: rgba(255, 255, 255, 0.035);
}

button:focus-visible,
input:focus-visible {
  outline: 2px solid rgba(34, 211, 238, 0.65);
  outline-offset: 2px;
}

.android-17-gemini-btn {
  left: auto;
  right: 1.5rem;
  bottom: 1.5rem;
  transform: none;
  display: flex;
  z-index: 1200;
  pointer-events: auto;
}

.android-17-gemini-btn:hover {
  transform: translateY(-2px) scale(1.03);
}

.android-17-gemini-btn:active {
  transform: scale(0.96);
}

@media (max-width: 1180px) {
  .app-header {
    grid-template-columns: minmax(140px, 1fr) auto;
  }

  .header-center-tabs {
    display: none;
  }

  .wallet-stats {
    grid-template-columns: repeat(2, minmax(118px, 1fr));
    justify-content: stretch;
  }

  .wallet-search-box,
  .wallet-actions {
    grid-column: 1 / -1;
  }
}

@media (max-width: 767px) {
  .app-header {
    height: 4rem;
    padding: 0 1rem;
  }

  .header-view-title {
    font-size: 1rem;
  }

  .user-profile-badge {
    padding-right: 0.3rem;
  }

  .user-meta {
    display: none;
  }

  .app-content-area {
    padding: 1rem 0.85rem 5.5rem;
  }

  .dashboard-wallet-card,
  .dashboard-card {
    border-radius: 16px;
    padding: 1rem;
  }

  .wallet-left {
    align-items: flex-start;
  }

  .wallet-amount {
    font-size: 1.95rem;
  }

  .wallet-currency {
    font-size: 0.95rem;
  }

  .wallet-stats {
    grid-template-columns: 1fr;
  }

  .wallet-search-box,
  .wallet-actions {
    grid-column: auto;
  }

  .wallet-actions {
    display: grid;
    grid-template-columns: 1fr 1fr 2.65rem;
  }

  .wallet-btn-action {
    justify-content: center;
    padding: 0 0.65rem;
  }

  .wallet-btn-action span {
    display: none;
  }

  .card-header {
    flex-wrap: wrap;
  }

  .header-legend {
    order: 3;
    width: 100%;
    justify-content: flex-start !important;
    margin-left: 0;
  }

  .sales-pills-row,
  .overview-main-stat {
    flex-direction: column;
  }

  .insights-grid-col {
    grid-template-columns: 1fr;
  }

  .bar-chart-container,
  .indicators-chart-container {
    height: 156px;
  }

  .android-17-gemini-btn {
    right: 0.9rem;
    bottom: calc(max(0.75rem, env(safe-area-inset-bottom)) + 4.25rem);
    width: 2.85rem;
    height: 2.85rem;
    padding: 0;
    justify-content: center;
  }

  .android-17-gemini-btn .gemini-label {
    display: none;
  }
}
</style>
