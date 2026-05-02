<template>
  <div class="admin-layout">

    <aside class="sidebar">
      <div class="sidebar-logo">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="8" fill="#14b8a6"/>
          <path d="M7 14h14M14 7v14" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <span>FinanceApp</span>
      </div>
      <nav class="sidebar-nav">
        <button :class="['nav-item', aba === 'dashboard' && 'active']" @click="aba = 'dashboard'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Dashboard
        </button>
        <button :class="['nav-item', aba === 'usuarios' && 'active']" @click="aba = 'usuarios'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Usuários
        </button>
      </nav>
      <button class="logout-btn" @click="auth.logout()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sair
      </button>
    </aside>

    <main class="admin-main">
      <header class="admin-header">
        <h1 class="page-title">{{ aba === 'dashboard' ? '📊 Dashboard' : '👥 Usuários' }}</h1>
        <div class="header-info">
          <span class="badge-admin">Admin</span>
          <span class="header-nome">{{ auth.nome }}</span>
        </div>
      </header>

      <!-- ===== DASHBOARD ===== -->
      <section v-if="aba === 'dashboard'" class="content">
        <div v-if="loadingStats" class="loading-wrap"><div class="spinner"></div></div>
        <template v-else>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
              <div class="stat-info"><span class="stat-label">Total de Usuários</span><span class="stat-value">{{ stats.totalUsuarios ?? '—' }}</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon teal"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg></div>
              <div class="stat-info"><span class="stat-label">Contas Abertas</span><span class="stat-value">{{ stats.totalContas ?? '—' }}</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
              <div class="stat-info"><span class="stat-label">Transações</span><span class="stat-value">{{ stats.totalTransacoes ?? '—' }}</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon purple"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
              <div class="stat-info"><span class="stat-label">Saldo Total Geral</span><span class="stat-value">{{ formatarMoeda(stats.saldoTotal ?? 0) }}</span></div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h2>Últimos usuários cadastrados</h2>
              <button class="btn-link" @click="aba = 'usuarios'">Ver todos →</button>
            </div>
            <table class="tabela">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Tipo</th><th>Cadastro</th></tr></thead>
              <tbody>
                <tr v-for="u in (stats.ultimosUsuarios ?? [])" :key="u.id">
                  <td>{{ u.nome }}</td>
                  <td class="muted">{{ u.email }}</td>
                  <td><span :class="['badge', u.isAdmin ? 'badge-admin-tag' : 'badge-user']">{{ u.isAdmin ? 'Admin' : 'User' }}</span></td>
                  <td class="muted">{{ formatarData(u.createdAt) }}</td>
                </tr>
                <tr v-if="!(stats.ultimosUsuarios?.length)">
                  <td colspan="4" class="empty-row">Nenhum usuário encontrado</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </section>

      <!-- ===== USUÁRIOS ===== -->
      <section v-if="aba === 'usuarios'" class="content">
        <div class="toolbar">
          <input v-model="busca" class="input-busca" placeholder="🔍 Buscar por nome ou e-mail..." />
          <button class="btn-primary" @click="abrirModalCriar">+ Novo Usuário</button>
        </div>
        <div v-if="loadingUsers" class="loading-wrap"><div class="spinner"></div></div>
        <div v-else class="card">
          <table class="tabela">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Tipo</th><th>Cadastro</th><th>Ações</th></tr></thead>
            <tbody>
              <tr v-for="u in usuariosFiltrados" :key="u.id" class="row-hover" @click="abrirDetalhes(u)">
                <td>{{ u.nome }}</td>
                <td class="muted">{{ u.email }}</td>
                <td><span :class="['badge', u.isAdmin ? 'badge-admin-tag' : 'badge-user']">{{ u.isAdmin ? 'Admin' : 'User' }}</span></td>
                <td class="muted">{{ formatarData(u.createdAt) }}</td>
                <td @click.stop>
                  <div class="acoes">
                    <button class="btn-icon blue" title="Ver detalhes" @click="abrirDetalhes(u)">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-icon yellow" title="Resetar senha" @click="abrirResetSenha(u)">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </button>
                    <button class="btn-icon red" title="Deletar usuário" @click="confirmarDeletar(u)" :disabled="u.isAdmin">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!usuariosFiltrados.length">
                <td colspan="5" class="empty-row">Nenhum usuário encontrado</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <!-- ====== MODAL CRIAR USUÁRIO ====== -->
    <div v-if="modalCriar" class="overlay" @click.self="modalCriar = false">
      <div class="modal">
        <h2 class="modal-title">➕ Novo Usuário</h2>
        <div class="form-group"><label>Nome</label><input v-model="formCriar.nome" class="input" placeholder="Nome completo" /></div>
        <div class="form-group"><label>E-mail</label><input v-model="formCriar.email" type="email" class="input" placeholder="email@exemplo.com" /></div>
        <div class="form-group"><label>Senha</label><input v-model="formCriar.senha" type="password" class="input" placeholder="Mínimo 6 caracteres" /></div>
        <div class="form-group">
          <label class="checkbox-label"><input type="checkbox" v-model="formCriar.isAdmin" /> Administrador</label>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="modalCriar = false">Cancelar</button>
          <button class="btn-primary" @click="criarUsuario" :disabled="loadingAcao">{{ loadingAcao ? 'Criando...' : 'Criar Usuário' }}</button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL RESETAR SENHA ====== -->
    <div v-if="modalReset" class="overlay" @click.self="modalReset = false">
      <div class="modal">
        <h2 class="modal-title">🔒 Resetar Senha</h2>
        <p class="modal-desc">Usuário: <strong>{{ usuarioSelecionado?.nome }}</strong></p>
        <div class="form-group"><label>Nova Senha</label><input v-model="novaSenha" type="password" class="input" placeholder="Nova senha" /></div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="modalReset = false">Cancelar</button>
          <button class="btn-primary" @click="resetarSenha" :disabled="loadingAcao">{{ loadingAcao ? 'Salvando...' : 'Salvar Senha' }}</button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL CONFIRMAR DELETAR ====== -->
    <div v-if="modalDeletar" class="overlay" @click.self="modalDeletar = false">
      <div class="modal modal-sm">
        <h2 class="modal-title">🗑️ Deletar Usuário</h2>
        <p class="modal-desc">Tem certeza que deseja deletar <strong>{{ usuarioSelecionado?.nome }}</strong>? Essa ação não pode ser desfeita.</p>
        <div class="modal-footer">
          <button class="btn-secondary" @click="modalDeletar = false">Cancelar</button>
          <button class="btn-danger" @click="deletarUsuario" :disabled="loadingAcao">{{ loadingAcao ? 'Deletando...' : 'Confirmar Deletar' }}</button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL DETALHES COM ABAS ====== -->
    <div v-if="modalDetalhes" class="overlay" @click.self="modalDetalhes = false">
      <div class="modal modal-lg">

        <!-- cabeçalho -->
        <div class="modal-header-user">
          <div>
            <h2 class="modal-title">👤 {{ usuarioSelecionado?.nome }}</h2>
            <p class="modal-desc">{{ usuarioSelecionado?.email }}</p>
          </div>
          <span :class="['badge', usuarioSelecionado?.isAdmin ? 'badge-admin-tag' : 'badge-user']">
            {{ usuarioSelecionado?.isAdmin ? 'Admin' : 'User' }}
          </span>
        </div>

        <!-- abas -->
        <div class="abas">
          <button :class="['aba-btn', abaDetalhe === 'transacoes' && 'aba-ativa']" @click="abaDetalhe = 'transacoes'">💳 Transações</button>
          <button :class="['aba-btn', abaDetalhe === 'contas'     && 'aba-ativa']" @click="abaDetalhe = 'contas'; carregarContas()">🏦 Contas</button>
          <button :class="['aba-btn', abaDetalhe === 'seguranca'  && 'aba-ativa']" @click="abaDetalhe = 'seguranca'">🔐 Segurança</button>
        </div>

        <div v-if="loadingDetalhes" class="loading-wrap"><div class="spinner"></div></div>

        <!-- ABA TRANSAÇÕES -->
        <template v-else-if="abaDetalhe === 'transacoes'">
          <table class="tabela">
            <thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Data</th></tr></thead>
            <tbody>
              <tr v-for="t in transacoesDetalhes" :key="t.id">
                <td>{{ t.descricao }}</td>
                <td><span :class="['badge', t.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida']">{{ t.tipo }}</span></td>
                <td :class="t.tipo === 'entrada' ? 'valor-positivo' : 'valor-negativo'">{{ formatarMoeda(t.valor) }}</td>
                <td class="muted">{{ formatarData(t.createdAt) }}</td>
              </tr>
              <tr v-if="!transacoesDetalhes.length">
                <td colspan="4" class="empty-row">Nenhuma transação encontrada</td>
              </tr>
            </tbody>
          </table>
        </template>

        <!-- ABA CONTAS -->
        <template v-else-if="abaDetalhe === 'contas'">
          <div class="aba-toolbar">
            <span class="secao-titulo">Contas do usuário</span>
            <button class="btn-primary btn-sm" @click="modalAddConta = true">+ Adicionar Conta</button>
          </div>
          <table class="tabela">
            <thead><tr><th>Nome</th><th>Banco</th><th>Saldo</th><th>Cor</th><th></th></tr></thead>
            <tbody>
              <tr v-for="c in contasDetalhes" :key="c.id">
                <td>{{ c.nome }}</td>
                <td class="muted">{{ c.banco }}</td>
                <td :class="c.saldo >= 0 ? 'valor-positivo' : 'valor-negativo'">{{ formatarMoeda(c.saldo) }}</td>
                <td><span class="cor-bolinha" :style="{ background: c.cor }"></span></td>
                <td>
                  <button class="btn-icon red" @click="confirmarDeletarConta(c)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  </button>
                </td>
              </tr>
              <tr v-if="!contasDetalhes.length">
                <td colspan="5" class="empty-row">Nenhuma conta encontrada</td>
              </tr>
            </tbody>
          </table>
        </template>

        <!-- ABA SEGURANÇA -->
        <template v-else-if="abaDetalhe === 'seguranca'">
          <div class="seguranca-grid">

            <!-- Ver senha -->
            <div class="seg-card">
              <h3 class="seg-titulo">🔑 Senha Visível</h3>
              <p class="modal-desc">Visualize a senha atual armazenada.</p>
              <button class="btn-secondary" @click="verSenha" :disabled="loadingAcao">
                {{ loadingAcao ? 'Buscando...' : 'Mostrar Senha' }}
              </button>
              <div v-if="senhaVisivel" class="senha-box">{{ senhaVisivel }}</div>
            </div>

            <!-- Resetar tudo -->
            <div class="seg-card seg-card-danger">
              <h3 class="seg-titulo">⚠️ Resetar Tudo</h3>
              <p class="modal-desc">Remove todas as contas e transações do usuário. Não pode ser desfeito.</p>
              <button class="btn-danger" @click="confirmarResetarTudo" :disabled="loadingAcao">
                Resetar Conta
              </button>
            </div>

          </div>
        </template>

        <div class="modal-footer">
          <button class="btn-secondary" @click="modalDetalhes = false">Fechar</button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL ADICIONAR CONTA ====== -->
    <div v-if="modalAddConta" class="overlay" @click.self="modalAddConta = false">
      <div class="modal">
        <h2 class="modal-title">🏦 Adicionar Conta</h2>
        <div class="form-group"><label>Nome da Conta</label><input v-model="formConta.nome" class="input" placeholder="Ex: Conta Corrente" /></div>
        <div class="form-group"><label>Banco</label><input v-model="formConta.banco" class="input" placeholder="Ex: Nubank" /></div>
        <div class="form-group"><label>Saldo Inicial</label><input v-model="formConta.saldo" type="number" class="input" placeholder="0.00" /></div>
        <div class="form-group"><label>Cor</label><input v-model="formConta.cor" type="color" class="input input-cor" /></div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="modalAddConta = false">Cancelar</button>
          <button class="btn-primary" @click="adicionarConta" :disabled="loadingAcao">{{ loadingAcao ? 'Criando...' : 'Criar Conta' }}</button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL CONFIRMAR DELETAR CONTA ====== -->
    <div v-if="modalDeletarConta" class="overlay" @click.self="modalDeletarConta = false">
      <div class="modal modal-sm">
        <h2 class="modal-title">🗑️ Deletar Conta</h2>
        <p class="modal-desc">Deletar <strong>{{ contaSelecionada?.nome }}</strong> e todas as suas transações?</p>
        <div class="modal-footer">
          <button class="btn-secondary" @click="modalDeletarConta = false">Cancelar</button>
          <button class="btn-danger" @click="deletarConta" :disabled="loadingAcao">{{ loadingAcao ? 'Deletando...' : 'Confirmar' }}</button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL CONFIRMAR RESETAR TUDO ====== -->
    <div v-if="modalResetarTudo" class="overlay" @click.self="modalResetarTudo = false">
      <div class="modal modal-sm">
        <h2 class="modal-title">⚠️ Resetar Tudo</h2>
        <p class="modal-desc">Isso vai apagar <strong>todas as contas e transações</strong> de <strong>{{ usuarioSelecionado?.nome }}</strong>. Tem certeza?</p>
        <div class="modal-footer">
          <button class="btn-secondary" @click="modalResetarTudo = false">Cancelar</button>
          <button class="btn-danger" @click="resetarTudo" :disabled="loadingAcao">{{ loadingAcao ? 'Resetando...' : 'Confirmar Reset' }}</button>
        </div>
      </div>
    </div>

    <!-- TOAST -->
    <transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const auth = useAuthStore()

const aba             = ref('dashboard')
const toast           = ref('')
const loadingStats    = ref(false)
const loadingUsers    = ref(false)
const loadingAcao     = ref(false)
const loadingDetalhes = ref(false)

const stats    = ref({})
const usuarios = ref([])
const busca    = ref('')

const modalCriar       = ref(false)
const modalReset       = ref(false)
const modalDeletar     = ref(false)
const modalDetalhes    = ref(false)
const modalAddConta    = ref(false)
const modalDeletarConta = ref(false)
const modalResetarTudo  = ref(false)

const abaDetalhe         = ref('transacoes')
const usuarioSelecionado = ref(null)
const contaSelecionada   = ref(null)
const transacoesDetalhes = ref([])
const contasDetalhes     = ref([])
const senhaVisivel       = ref('')
const novaSenha          = ref('')

const formCriar = ref({ nome: '', email: '', senha: '', isAdmin: false })
const formConta = ref({ nome: '', banco: '', saldo: 0, cor: '#14b8a6' })

const usuariosFiltrados = computed(() => {
  const q = busca.value.toLowerCase()
  return usuarios.value.filter(u =>
    u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  )
})

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatarData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}
function mostrarToast(msg) {
  toast.value = msg
  setTimeout(() => toast.value = '', 3000)
}

async function carregarStats() {
  loadingStats.value = true
  try { const res = await api.get('/admin/stats'); stats.value = res.data }
  catch { mostrarToast('❌ Erro ao carregar estatísticas') }
  finally { loadingStats.value = false }
}

async function carregarUsuarios() {
  loadingUsers.value = true
  try { const res = await api.get('/admin/users'); usuarios.value = res.data }
  catch { mostrarToast('❌ Erro ao carregar usuários') }
  finally { loadingUsers.value = false }
}

async function criarUsuario() {
  if (!formCriar.value.nome || !formCriar.value.email || !formCriar.value.senha) {
    mostrarToast('⚠️ Preencha todos os campos'); return
  }
  loadingAcao.value = true
  try {
    await api.post('/admin/users', formCriar.value)
    modalCriar.value = false
    formCriar.value = { nome: '', email: '', senha: '', isAdmin: false }
    await carregarUsuarios()
    mostrarToast('✅ Usuário criado!')
  } catch (e) {
    mostrarToast('❌ ' + (e.response?.data?.erro || 'Erro ao criar usuário'))
  } finally { loadingAcao.value = false }
}

async function resetarSenha() {
  if (!novaSenha.value) { mostrarToast('⚠️ Digite a nova senha'); return }
  loadingAcao.value = true
  try {
    await api.put(`/admin/users/${usuarioSelecionado.value.id}/reset-password`, { senha: novaSenha.value })
    modalReset.value = false
    novaSenha.value = ''
    mostrarToast('✅ Senha resetada!')
  } catch { mostrarToast('❌ Erro ao resetar senha') }
  finally { loadingAcao.value = false }
}

async function deletarUsuario() {
  loadingAcao.value = true
  try {
    await api.delete(`/admin/users/${usuarioSelecionado.value.id}`)
    modalDeletar.value = false
    await carregarUsuarios()
    mostrarToast('🗑️ Usuário deletado!')
  } catch { mostrarToast('❌ Erro ao deletar usuário') }
  finally { loadingAcao.value = false }
}

async function abrirDetalhes(u) {
  usuarioSelecionado.value = u
  abaDetalhe.value = 'transacoes'
  senhaVisivel.value = ''
  transacoesDetalhes.value = []
  contasDetalhes.value = []
  modalDetalhes.value = true
  loadingDetalhes.value = true
  try {
    const res = await api.get(`/admin/users/${u.id}/transactions`)
    transacoesDetalhes.value = res.data
  } catch { mostrarToast('❌ Erro ao carregar transações') }
  finally { loadingDetalhes.value = false }
}

async function carregarContas() {
  loadingDetalhes.value = true
  try {
    const res = await api.get(`/admin/users/${usuarioSelecionado.value.id}/accounts`)
    contasDetalhes.value = res.data
  } catch { mostrarToast('❌ Erro ao carregar contas') }
  finally { loadingDetalhes.value = false }
}

async function adicionarConta() {
  if (!formConta.value.nome || !formConta.value.banco) {
    mostrarToast('⚠️ Preencha nome e banco'); return
  }
  loadingAcao.value = true
  try {
    await api.post(`/admin/users/${usuarioSelecionado.value.id}/accounts`, formConta.value)
    modalAddConta.value = false
    formConta.value = { nome: '', banco: '', saldo: 0, cor: '#14b8a6' }
    await carregarContas()
    mostrarToast('✅ Conta criada!')
  } catch { mostrarToast('❌ Erro ao criar conta') }
  finally { loadingAcao.value = false }
}

async function deletarConta() {
  loadingAcao.value = true
  try {
    await api.delete(`/admin/accounts/${contaSelecionada.value.id}`)
    modalDeletarConta.value = false
    await carregarContas()
    mostrarToast('🗑️ Conta deletada!')
  } catch { mostrarToast('❌ Erro ao deletar conta') }
  finally { loadingAcao.value = false }
}

async function verSenha() {
  loadingAcao.value = true
  try {
    const res = await api.get(`/admin/users/${usuarioSelecionado.value.id}/password`)
    senhaVisivel.value = res.data.senhaVisivel
  } catch { mostrarToast('❌ Erro ao buscar senha') }
  finally { loadingAcao.value = false }
}

async function resetarTudo() {
  loadingAcao.value = true
  try {
    await api.post(`/admin/users/${usuarioSelecionado.value.id}/reset-all`)
    modalResetarTudo.value = false
    mostrarToast('✅ Conta resetada com sucesso!')
    await carregarContas()
  } catch { mostrarToast('❌ Erro ao resetar conta') }
  finally { loadingAcao.value = false }
}

function abrirModalCriar() {
  formCriar.value = { nome: '', email: '', senha: '', isAdmin: false }
  modalCriar.value = true
}
function abrirResetSenha(u) { usuarioSelecionado.value = u; novaSenha.value = ''; modalReset.value = true }
function confirmarDeletar(u) { usuarioSelecionado.value = u; modalDeletar.value = true }
function confirmarDeletarConta(c) { contaSelecionada.value = c; modalDeletarConta.value = true }
function confirmarResetarTudo() { modalResetarTudo.value = true }

onMounted(async () => {
  await carregarStats()
  await carregarUsuarios()
})
</script>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.admin-layout {
  display: flex; min-height: 100vh;
  background: #0f1117; color: #e2e8f0;
  font-family: 'Inter', sans-serif;
}

.sidebar {
  width: 220px; min-height: 100vh;
  background: #161b27; border-right: 1px solid #1e2535;
  display: flex; flex-direction: column;
  padding: 1.5rem 1rem; position: sticky; top: 0;
}
.sidebar-logo {
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 1.1rem; font-weight: 700; color: #14b8a6;
  margin-bottom: 2rem; padding: 0 0.5rem;
}
.sidebar-nav { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; }
.nav-item {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.6rem 0.8rem; border-radius: 8px;
  background: none; border: none; color: #94a3b8;
  font-size: 0.9rem; cursor: pointer; text-align: left; transition: all 0.2s;
}
.nav-item:hover  { background: #1e2535; color: #e2e8f0; }
.nav-item.active { background: #14b8a620; color: #14b8a6; font-weight: 600; }
.logout-btn {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.6rem 0.8rem; border-radius: 8px;
  background: none; border: none; color: #f87171;
  font-size: 0.9rem; cursor: pointer; transition: all 0.2s; margin-top: auto;
}
.logout-btn:hover { background: #f8717120; }

.admin-main { flex: 1; display: flex; flex-direction: column; }
.admin-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.25rem 2rem; border-bottom: 1px solid #1e2535;
  background: #161b27; position: sticky; top: 0; z-index: 10;
}
.page-title { font-size: 1.2rem; font-weight: 700; }
.header-info { display: flex; align-items: center; gap: 0.75rem; }
.header-nome { font-size: 0.9rem; color: #94a3b8; }

.content { padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.stat-card {
  background: #161b27; border: 1px solid #1e2535;
  border-radius: 12px; padding: 1.25rem;
  display: flex; align-items: center; gap: 1rem;
}
.stat-icon { width: 46px; height: 46px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-icon.blue   { background: #1e3a5f;   color: #60a5fa; }
.stat-icon.teal   { background: #14b8a620; color: #14b8a6; }
.stat-icon.green  { background: #14532d;   color: #4ade80; }
.stat-icon.purple { background: #2e1065;   color: #c084fc; }
.stat-info { display: flex; flex-direction: column; gap: 0.2rem; }
.stat-label { font-size: 0.78rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 1.4rem; font-weight: 700; color: #f1f5f9; }

.card { background: #161b27; border: 1px solid #1e2535; border-radius: 12px; overflow: hidden; }
.card-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #1e2535; }
.card-header h2 { font-size: 0.95rem; font-weight: 600; }
.btn-link { background: none; border: none; color: #14b8a6; font-size: 0.85rem; cursor: pointer; }

.tabela { width: 100%; border-collapse: collapse; }
.tabela th {
  text-align: left; padding: 0.75rem 1.25rem;
  font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #1e2535;
}
.tabela td { padding: 0.85rem 1.25rem; font-size: 0.88rem; border-bottom: 1px solid #1e253570; color: #cbd5e1; }
.tabela tbody tr:last-child td { border-bottom: none; }
.row-hover { cursor: pointer; transition: background 0.15s; }
.row-hover:hover td { background: #1e253580; }
.muted { color: #64748b !important; }
.empty-row { text-align: center; color: #475569; padding: 2rem !important; }

.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.badge-admin     { background: #7c3aed20; color: #a78bfa; border: 1px solid #7c3aed40; }
.badge-admin-tag { background: #7c3aed20; color: #a78bfa; border: 1px solid #7c3aed40; }
.badge-user      { background: #14b8a620; color: #14b8a6; border: 1px solid #14b8a640; }
.badge-entrada   { background: #14532d;   color: #4ade80; }
.badge-saida     { background: #450a0a;   color: #f87171; }

.toolbar { display: flex; align-items: center; gap: 1rem; }
.input-busca {
  flex: 1; background: #161b27; border: 1px solid #1e2535;
  border-radius: 8px; padding: 0.6rem 1rem; color: #e2e8f0;
  font-size: 0.9rem; outline: none; transition: border-color 0.2s;
}
.input-busca:focus { border-color: #14b8a6; }

.acoes { display: flex; gap: 0.4rem; }
.btn-icon { width: 30px; height: 30px; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.btn-icon.blue          { background: #1e3a5f;   color: #60a5fa; }
.btn-icon.blue:hover    { background: #1e40af; }
.btn-icon.yellow        { background: #451a0340; color: #fbbf24; }
.btn-icon.yellow:hover  { background: #78350f; }
.btn-icon.red           { background: #450a0a;   color: #f87171; }
.btn-icon.red:hover     { background: #7f1d1d; }
.btn-icon:disabled      { opacity: 0.3; cursor: not-allowed; }

.btn-primary { background: #14b8a6; color: #fff; border: none; border-radius: 8px; padding: 0.6rem 1.2rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
.btn-primary:hover    { background: #0d9488; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-sm { padding: 0.4rem 0.9rem; font-size: 0.82rem; }
.btn-secondary { background: #1e2535; color: #94a3b8; border: 1px solid #2a3347; border-radius: 8px; padding: 0.6rem 1.2rem; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
.btn-secondary:hover { background: #2a3347; }
.btn-danger { background: #7f1d1d; color: #fca5a5; border: none; border-radius: 8px; padding: 0.6rem 1.2rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-danger:hover    { background: #991b1b; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

.overlay { position: fixed; inset: 0; background: #00000080; display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(2px); }
.modal { background: #161b27; border: 1px solid #1e2535; border-radius: 14px; padding: 1.75rem; width: 420px; max-width: 95vw; display: flex; flex-direction: column; gap: 1rem; }
.modal-sm { width: 360px; }
.modal-lg { width: 720px; max-height: 85vh; overflow-y: auto; }
.modal-title { font-size: 1.05rem; font-weight: 700; }
.modal-desc  { font-size: 0.88rem; color: #64748b; }
.modal-header-user { display: flex; align-items: flex-start; justify-content: space-between; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 0.5rem; }

/* ABAS */
.abas { display: flex; gap: 0.25rem; border-bottom: 1px solid #1e2535; padding-bottom: 0; }
.aba-btn { background: none; border: none; color: #64748b; font-size: 0.88rem; padding: 0.5rem 1rem; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; margin-bottom: -1px; }
.aba-btn:hover { color: #e2e8f0; }
.aba-ativa { color: #14b8a6 !important; border-bottom-color: #14b8a6 !important; font-weight: 600; }

.aba-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; }
.secao-titulo { font-size: 0.85rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }

/* SEGURANÇA */
.seguranca-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.seg-card { background: #1e2535; border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
.seg-card-danger { border: 1px solid #7f1d1d40; }
.seg-titulo { font-size: 0.95rem; font-weight: 600; }
.senha-box { background: #0f1117; border: 1px solid #1e2535; border-radius: 8px; padding: 0.6rem 1rem; font-family: monospace; font-size: 1rem; color: #4ade80; letter-spacing: 0.1em; }

.cor-bolinha { display: inline-block; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #ffffff20; }

.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group label { font-size: 0.82rem; font-weight: 600; color: #94a3b8; }
.input { background: #0f1117; border: 1px solid #1e2535; border-radius: 8px; padding: 0.6rem 0.9rem; color: #e2e8f0; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
.input:focus { border-color: #14b8a6; }
.input-cor { padding: 0.2rem; height: 42px; cursor: pointer; }
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer; color: #cbd5e1; }

.valor-positivo { color: #4ade80 !important; font-weight: 600; }
.valor-negativo { color: #f87171 !important; font-weight: 600; }

.loading-wrap { display: flex; justify-content: center; padding: 3rem; }
.spinner { width: 36px; height: 36px; border: 3px solid #1e2535; border-top-color: #14b8a6; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.toast { position: fixed; bottom: 2rem; right: 2rem; background: #1e2535; border: 1px solid #2a3347; color: #e2e8f0; padding: 0.75rem 1.25rem; border-radius: 10px; font-size: 0.9rem; box-shadow: 0 8px 24px #00000060; z-index: 999; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from,   .toast-leave-to    { opacity: 0; transform: translateY(1rem); }
</style>