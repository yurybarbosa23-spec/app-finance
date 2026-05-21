<template>
  <div class="admin-layout">

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
        </div>
        <div class="logo-text">
          <span class="logo-title">Finora</span>
          <span class="logo-subtitle">ADMIN</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <button :class="['nav-item', aba === 'dashboard' && 'active']" @click="aba = 'dashboard'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </button>
        <button :class="['nav-item', aba === 'usuarios' && 'active']" @click="aba = 'usuarios'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Usuários
        </button>
        <button :class="['nav-item', aba === 'transacoes' && 'active']" @click="aba = 'transacoes'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Transações Globais
        </button>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" @click="auth.logout()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sair do Admin
        </button>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="admin-main">
      <header class="admin-header">
        <div class="header-left">
          <h1 class="page-title">
            <span v-if="aba === 'dashboard'">📊 Dashboard de Monitoramento</span>
            <span v-else-if="aba === 'usuarios'">👥 Controle de Usuários</span>
            <span v-else-if="aba === 'transacoes'">💸 Fluxo Financeiro Global</span>
          </h1>
        </div>
        <div class="header-right">
          <div class="user-badge">
            <span class="user-role">ADMINISTRADOR</span>
            <span class="user-name">{{ auth.nome }}</span>
          </div>
        </div>
      </header>

      <!-- ===== DASHBOARD ===== -->
      <section v-if="aba === 'dashboard'" class="content">
        <div v-if="loadingStats" class="loading-wrap">
          <div class="spinner"></div>
        </div>
        <template v-else>
          <!-- GRID DE METRICAS COMPLETO -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon-wrapper purple-glow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div class="stat-info">
                <span class="stat-label">Usuários Cadastrados</span>
                <span class="stat-value">{{ stats.totalUsuarios ?? 0 }}</span>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon-wrapper blue-glow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              </div>
              <div class="stat-info">
                <span class="stat-label">Contas Criadas</span>
                <span class="stat-value">{{ stats.totalContas ?? 0 }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper pink-glow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div class="stat-info">
                <span class="stat-label">Transações Totais</span>
                <span class="stat-value">{{ stats.totalTransacoes ?? 0 }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper teal-glow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div class="stat-info">
                <span class="stat-label">Lançamentos de Contas (Dívidas)</span>
                <span class="stat-value">{{ stats.totalBills ?? 0 }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper orange-glow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <div class="stat-info">
                <span class="stat-label">Itens em Estoque</span>
                <span class="stat-value">{{ stats.totalItems ?? 0 }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper yellow-glow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div class="stat-info">
                <span class="stat-label">Limites de Orçamento (Metas)</span>
                <span class="stat-value">{{ stats.totalBudgets ?? 0 }}</span>
              </div>
            </div>

            <div class="stat-card double-width">
              <div class="stat-icon-wrapper green-glow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div class="stat-info">
                <span class="stat-label">Saldo Bancário Geral Acumulado</span>
                <span class="stat-value highlight-text">{{ formatarMoeda(stats.saldoTotal ?? 0) }}</span>
              </div>
            </div>
          </div>

          <!-- BALANÇO FINANCEIRO GLOBAL DO SISTEMA (CASHFLOW) -->
          <div class="card glass-card cashflow-section">
            <div class="cashflow-header">
              <div class="cf-title">
                <h2>📈 Balanço do Sistema de Todos os Usuários</h2>
                <p class="muted">Visualização geral do fluxo de caixa agregado no banco de dados.</p>
              </div>
              <div class="cf-total-balance" :class="(stats.totalReceitas - stats.totalDespesas) >= 0 ? 'valor-positivo' : 'valor-negativo'">
                Balanço Geral: {{ formatarMoeda((stats.totalReceitas ?? 0) - (stats.totalDespesas ?? 0)) }}
              </div>
            </div>
            
            <div class="cashflow-indicators">
              <div class="cf-indicator green">
                <span class="dot"></span>
                <span class="label">Total Receitas: <strong>{{ formatarMoeda(stats.totalReceitas ?? 0) }}</strong></span>
              </div>
              <div class="cf-indicator red">
                <span class="dot"></span>
                <span class="label">Total Despesas: <strong>{{ formatarMoeda(stats.totalDespesas ?? 0) }}</strong></span>
              </div>
            </div>

            <div class="cashflow-bar-container">
              <div class="cashflow-progress-bar">
                <div class="bar-fill green-bar" :style="{ width: `${pctReceitas}%` }">
                  <span class="bar-pct" v-if="pctReceitas > 15">{{ pctReceitas.toFixed(1) }}%</span>
                </div>
                <div class="bar-fill red-bar" :style="{ width: `${pctDespesas}%` }">
                  <span class="bar-pct" v-if="pctDespesas > 15">{{ pctDespesas.toFixed(1) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ULTIMOS USUARIOS CADASTRADOS -->
          <div class="card glass-card">
            <div class="card-header">
              <h2>👥 Recém Chegados no Sistema</h2>
              <button class="btn-link-premium" @click="aba = 'usuarios'">Ver todos os usuários →</button>
            </div>
            <div class="table-responsive">
              <table class="tabela">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Tipo</th>
                    <th>Data de Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in (stats.ultimosUsuarios ?? [])" :key="u.id">
                    <td class="font-semibold">{{ u.nome }}</td>
                    <td class="muted">{{ u.email }}</td>
                    <td>
                      <span :class="['badge', u.isAdmin ? 'badge-admin-tag' : 'badge-user']">
                        {{ u.isAdmin ? 'Administrador' : 'Usuário' }}
                      </span>
                    </td>
                    <td class="muted">{{ formatarData(u.createdAt) }}</td>
                  </tr>
                  <tr v-if="!(stats.ultimosUsuarios?.length)">
                    <td colspan="4" class="empty-row">Nenhum usuário recente encontrado.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </section>

      <!-- ===== USUÁRIOS ===== -->
      <section v-if="aba === 'usuarios'" class="content">
        <div class="toolbar-premium">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="busca" class="input-busca" placeholder="Filtrar por nome ou endereço de e-mail..." />
          </div>
          <button class="btn-primary-glow" @click="abrirModalCriar">+ Novo Usuário</button>
        </div>

        <div v-if="loadingUsers" class="loading-wrap">
          <div class="spinner"></div>
        </div>

        <div v-else class="card glass-card">
          <div class="table-responsive">
            <table class="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Tipo</th>
                  <th>Cadastro</th>
                  <th>Ações de Gerenciamento</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in usuariosFiltrados" :key="u.id" class="row-hover" @click="abrirDetalhes(u)">
                  <td class="font-semibold">{{ u.nome }}</td>
                  <td class="muted">{{ u.email }}</td>
                  <td>
                    <span :class="['badge', u.isAdmin ? 'badge-admin-tag' : 'badge-user']">
                      {{ u.isAdmin ? 'Administrador' : 'Usuário' }}
                    </span>
                  </td>
                  <td class="muted">{{ formatarData(u.createdAt) }}</td>
                  <td @click.stop>
                    <div class="acoes">
                      <button class="btn-action-icon blue" title="Visualizar Detalhes" @click="abrirDetalhes(u)">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button class="btn-action-icon yellow" title="Resetar Senha" @click="abrirResetSenha(u)">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </button>
                      <button class="btn-action-icon red" title="Deletar Usuário" @click="confirmarDeletar(u)" :disabled="u.isAdmin">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!usuariosFiltrados.length">
                  <td colspan="5" class="empty-row">Nenhum usuário corresponde aos critérios de busca.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ===== TRANSAÇÕES GLOBAIS ===== -->
      <section v-if="aba === 'transacoes'" class="content">
        <div class="toolbar-premium">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="buscaTransacoes" class="input-busca" placeholder="Filtrar por usuário, e-mail, descrição ou categoria..." />
          </div>
          <div class="transacoes-contador">
            {{ transacoesGeraisFiltradas.length }} lançamentos listados
          </div>
        </div>

        <div v-if="loadingTransacoesGerais" class="loading-wrap">
          <div class="spinner"></div>
        </div>

        <div v-else class="card glass-card">
          <div class="table-responsive">
            <table class="tabela">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Origem/Conta</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in transacoesGeraisFiltradas" :key="t.id">
                  <td>
                    <div class="user-cell-info">
                      <span class="user-cell-nome">{{ t.User?.nome || 'Inexistente' }}</span>
                      <span class="user-cell-email">{{ t.User?.email || '' }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="account-badge-wrapper" v-if="t.Account">
                      <span class="color-dot" :style="{ background: t.Account?.cor || '#6366f1' }"></span>
                      <span class="account-name-cell">{{ t.Account?.nome }} ({{ t.Account?.banco }})</span>
                    </div>
                    <span class="muted" v-else>Indefinido</span>
                  </td>
                  <td class="font-semibold">{{ t.descricao }}</td>
                  <td>
                    <span class="category-pill">{{ t.categoria || 'outro' }}</span>
                  </td>
                  <td>
                    <span :class="['badge', t.tipo === 'receita' || t.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida']">
                      {{ t.tipo === 'receita' || t.tipo === 'entrada' ? 'receita' : 'despesa' }}
                    </span>
                  </td>
                  <td :class="t.tipo === 'receita' || t.tipo === 'entrada' ? 'valor-positivo font-bold' : 'valor-negativo font-bold'">
                    {{ t.tipo === 'receita' || t.tipo === 'entrada' ? '+' : '-' }}{{ formatarMoeda(t.valor) }}
                  </td>
                  <td class="muted">{{ formatarData(t.data || t.createdAt) }}</td>
                </tr>
                <tr v-if="!transacoesGeraisFiltradas.length">
                  <td colspan="7" class="empty-row">Nenhuma transação registrada no sistema com esses critérios.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <!-- ====== MODAL CRIAR USUÁRIO ====== -->
    <div v-if="modalCriar" class="overlay" @click.self="modalCriar = false">
      <div class="modal glass-modal">
        <div class="modal-header">
          <h2 class="modal-title">➕ Cadastrar Novo Usuário</h2>
          <button class="btn-close" @click="modalCriar = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nome Completo</label>
            <input v-model="formCriar.nome" class="input" placeholder="Ex: Yurii Barbosa" />
          </div>
          <div class="form-group">
            <label>Endereço de E-mail</label>
            <input v-model="formCriar.email" type="email" class="input" placeholder="email@exemplo.com" />
          </div>
          <div class="form-group">
            <label>Senha de Acesso</label>
            <input v-model="formCriar.senha" type="password" class="input" placeholder="Mínimo de 6 caracteres" />
          </div>
          <div class="form-group checkbox-wrapper">
            <label class="checkbox-label-premium">
              <input type="checkbox" v-model="formCriar.isAdmin" class="custom-checkbox" />
              <span class="checkbox-text">Definir usuário como administrador</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary-premium" @click="modalCriar = false">Cancelar</button>
          <button class="btn-primary-glow" @click="criarUsuario" :disabled="loadingAcao">
            {{ loadingAcao ? 'Gravando...' : 'Confirmar Cadastro' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL RESETAR SENHA ====== -->
    <div v-if="modalReset" class="overlay" @click.self="modalReset = false">
      <div class="modal glass-modal modal-sm">
        <div class="modal-header">
          <h2 class="modal-title">🔒 Alterar Credenciais</h2>
          <button class="btn-close" @click="modalReset = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">Alterando senha do usuário: <strong class="text-white">{{ usuarioSelecionado?.nome }}</strong></p>
          <div class="form-group">
            <label>Nova Senha</label>
            <input v-model="novaSenha" type="password" class="input" placeholder="Digite o novo segredo..." />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary-premium" @click="modalReset = false">Cancelar</button>
          <button class="btn-primary-glow" @click="resetarSenha" :disabled="loadingAcao">
            {{ loadingAcao ? 'Redefinindo...' : 'Atualizar Senha' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL CONFIRMAR DELETAR USUÁRIO ====== -->
    <div v-if="modalDeletar" class="overlay" @click.self="modalDeletar = false">
      <div class="modal glass-modal modal-sm">
        <div class="modal-header header-danger">
          <h2 class="modal-title text-red">🗑️ Remover Usuário</h2>
          <button class="btn-close" @click="modalDeletar = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">
            Tem certeza que deseja apagar a conta de <strong class="text-white">{{ usuarioSelecionado?.nome }}</strong>?
            <br/><span class="alert-text-danger">Todas as contas e movimentações deste usuário no banco de dados serão eliminadas definitivamente.</span>
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary-premium" @click="modalDeletar = false">Manter Usuário</button>
          <button class="btn-danger-premium" @click="deletarUsuario" :disabled="loadingAcao">
            {{ loadingAcao ? 'Eliminando...' : 'Excluir Definitivamente' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL DETALHES DO USUÁRIO ====== -->
    <div v-if="modalDetalhes" class="overlay" @click.self="modalDetalhes = false">
      <div class="modal glass-modal modal-lg">
        
        <!-- Header -->
        <div class="modal-header-user">
          <div class="user-details-title-info">
            <div class="user-avatar-placeholder">
              {{ usuarioSelecionado?.nome?.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h2 class="modal-title">{{ usuarioSelecionado?.nome }}</h2>
              <p class="modal-desc">{{ usuarioSelecionado?.email }}</p>
            </div>
          </div>
          <span :class="['badge', usuarioSelecionado?.isAdmin ? 'badge-admin-tag' : 'badge-user']">
            {{ usuarioSelecionado?.isAdmin ? 'Administrador' : 'Usuário' }}
          </span>
        </div>

        <!-- Abas Internas -->
        <div class="abas-premium">
          <button :class="['aba-btn-premium', abaDetalhe === 'transacoes' && 'active']" @click="abaDetalhe = 'transacoes'">
            💳 Movimentações ({{ transacoesDetalhes.length }})
          </button>
          <button :class="['aba-btn-premium', abaDetalhe === 'contas' && 'active']" @click="abaDetalhe = 'contas'; carregarContas()">
            🏦 Contas Bancárias ({{ contasDetalhes.length }})
          </button>
          <button :class="['aba-btn-premium', abaDetalhe === 'seguranca' && 'active']" @click="abaDetalhe = 'seguranca'">
            🔐 Segurança & Acesso
          </button>
        </div>

        <div v-if="loadingDetalhes" class="loading-wrap">
          <div class="spinner"></div>
        </div>

        <div class="modal-body-scrollable" v-else>
          <!-- ABA TRANSAÇÕES -->
          <template v-if="abaDetalhe === 'transacoes'">
            <table class="tabela font-sm">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in transacoesDetalhes" :key="t.id">
                  <td class="font-semibold">{{ t.descricao }}</td>
                  <td>
                    <span :class="['badge', t.tipo === 'receita' || t.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida']">
                      {{ t.tipo === 'receita' || t.tipo === 'entrada' ? 'receita' : 'despesa' }}
                    </span>
                  </td>
                  <td :class="t.tipo === 'receita' || t.tipo === 'entrada' ? 'valor-positivo font-bold' : 'valor-negativo font-bold'">
                    {{ t.tipo === 'receita' || t.tipo === 'entrada' ? '+' : '-' }}{{ formatarMoeda(t.valor) }}
                  </td>
                  <td class="muted">{{ formatarData(t.data || t.createdAt) }}</td>
                </tr>
                <tr v-if="!transacoesDetalhes.length">
                  <td colspan="4" class="empty-row">Nenhuma transação encontrada para este usuário.</td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- ABA CONTAS -->
          <template v-else-if="abaDetalhe === 'contas'">
            <div class="aba-toolbar-premium">
              <span class="secao-titulo-premium">Contas vinculadas</span>
              <button class="btn-primary-glow btn-sm" @click="modalAddConta = true">+ Nova Conta</button>
            </div>
            <table class="tabela">
              <thead>
                <tr>
                  <th>Identificador</th>
                  <th>Banco</th>
                  <th>Saldo Atual</th>
                  <th>Cor Indicativa</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in contasDetalhes" :key="c.id">
                  <td class="font-semibold">{{ c.nome }}</td>
                  <td class="muted">{{ c.banco }}</td>
                  <td :class="c.saldo >= 0 ? 'valor-positivo' : 'valor-negativo'">
                    {{ formatarMoeda(c.saldo) }}
                  </td>
                  <td>
                    <span class="cor-bolinha-border" :style="{ background: c.cor || '#14b8a6' }"></span>
                  </td>
                  <td>
                    <button class="btn-action-icon red" @click="confirmarDeletarConta(c)" title="Remover Conta">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                  </td>
                </tr>
                <tr v-if="!contasDetalhes.length">
                  <td colspan="5" class="empty-row">Nenhuma conta bancária associada a este usuário.</td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- ABA SEGURANÇA -->
          <template v-else-if="abaDetalhe === 'seguranca'">
            <div class="seguranca-grid-premium">
              <!-- Visualização da Senha -->
              <div class="seg-card-premium">
                <h3 class="seg-titulo-premium">🔑 Credenciais Gravadas</h3>
                <p class="muted font-xs">Reverter hash de segurança para visualizar o texto puro.</p>
                <button class="btn-secondary-premium btn-full" @click="verSenha" :disabled="loadingAcao">
                  {{ loadingAcao ? 'Visualizando...' : 'Revelar Senha Visível' }}
                </button>
                <div v-if="senhaVisivel" class="senha-box-glow">
                  <span class="senha-label">Senha Atual:</span>
                  <code class="senha-texto">{{ senhaVisivel }}</code>
                </div>
              </div>

              <!-- Reset Completo da Conta -->
              <div class="seg-card-premium border-danger">
                <h3 class="seg-titulo-premium text-red">⚠️ Reset Geral de Dados</h3>
                <p class="muted font-xs">Limpar de forma irreversível todas as contas, extratos e dívidas do usuário.</p>
                <button class="btn-danger-premium btn-full" @click="confirmarResetarTudo" :disabled="loadingAcao">
                  Redefinir Dados a Zero
                </button>
              </div>
            </div>
          </template>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary-premium" @click="modalDetalhes = false">Fechar Painel</button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL ADICIONAR CONTA ====== -->
    <div v-if="modalAddConta" class="overlay" @click.self="modalAddConta = false">
      <div class="modal glass-modal">
        <div class="modal-header">
          <h2 class="modal-title">🏦 Criar Conta Bancária</h2>
          <button class="btn-close" @click="modalAddConta = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nome Amigável</label>
            <input v-model="formConta.nome" class="input" placeholder="Ex: Carteira Principal ou Salário" />
          </div>
          <div class="form-group">
            <label>Instituição Financeira</label>
            <input v-model="formConta.banco" class="input" placeholder="Ex: Caixa Econômica, Itaú, Nubank" />
          </div>
          <div class="form-group">
            <label>Saldo Inicial</label>
            <input v-model="formConta.saldo" type="number" class="input" placeholder="Ex: 1500.00" />
          </div>
          <div class="form-group">
            <label>Identificador Visual (Cor)</label>
            <input v-model="formConta.cor" type="color" class="input input-cor" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary-premium" @click="modalAddConta = false">Cancelar</button>
          <button class="btn-primary-glow" @click="adicionarConta" :disabled="loadingAcao">
            {{ loadingAcao ? 'Salvando...' : 'Adicionar Conta' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL CONFIRMAR DELETAR CONTA ====== -->
    <div v-if="modalDeletarConta" class="overlay" @click.self="modalDeletarConta = false">
      <div class="modal glass-modal modal-sm">
        <div class="modal-header header-danger">
          <h2 class="modal-title text-red">🗑️ Remover Conta Bancária</h2>
          <button class="btn-close" @click="modalDeletarConta = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">
            Confirma a exclusão da conta <strong class="text-white">{{ contaSelecionada?.nome }}</strong>?
            <br/><span class="alert-text-danger">Todas as transações atreladas a ela serão perdidas.</span>
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary-premium" @click="modalDeletarConta = false">Manter Conta</button>
          <button class="btn-danger-premium" @click="deletarConta" :disabled="loadingAcao">
            {{ loadingAcao ? 'Excluindo...' : 'Confirmar Exclusão' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL CONFIRMAR RESETAR TUDO ====== -->
    <div v-if="modalResetarTudo" class="overlay" @click.self="modalResetarTudo = false">
      <div class="modal glass-modal modal-sm">
        <div class="modal-header header-danger">
          <h2 class="modal-title text-red">⚠️ Zerar Todo o Histórico</h2>
          <button class="btn-close" @click="modalResetarTudo = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">
            Atenção! Você está prestes a limpar **absolutamente todos** os saldos e lançamentos de <strong class="text-white">{{ usuarioSelecionado?.nome }}</strong>.
            <br/><span class="alert-text-danger">Essa operação é imediata e irreversível.</span>
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary-premium" @click="modalResetarTudo = false">Cancelar Ação</button>
          <button class="btn-danger-premium" @click="resetarTudo" :disabled="loadingAcao">
            {{ loadingAcao ? 'Limpando...' : 'Zerar Dados Agora' }}
          </button>
        </div>
      </div>
    </div>

    <!-- TOAST -->
    <transition name="toast">
      <div v-if="toast" class="toast-glow">{{ toast }}</div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const auth = useAuthStore()

const aba                 = ref('dashboard')
const toast               = ref('')
const loadingStats        = ref(false)
const loadingUsers        = ref(false)
const loadingAcao         = ref(false)
const loadingDetalhes     = ref(false)
const loadingTransacoesGerais = ref(false)

const stats               = ref({})
const usuarios           = ref([])
const busca               = ref('')
const buscaTransacoes     = ref('')
const transacoesGerais    = ref([])

const modalCriar          = ref(false)
const modalReset          = ref(false)
const modalDeletar        = ref(false)
const modalDetalhes       = ref(false)
const modalAddConta       = ref(false)
const modalDeletarConta   = ref(false)
const modalResetarTudo    = ref(false)

const abaDetalhe          = ref('transacoes')
const usuarioSelecionado  = ref(null)
const contaSelecionada    = ref(null)
const transacoesDetalhes  = ref([])
const contasDetalhes      = ref([])
const senhaVisivel        = ref('')
const novaSenha           = ref('')

const formCriar = ref({ nome: '', email: '', senha: '', isAdmin: false })
const formConta = ref({ nome: '', banco: '', saldo: 0, cor: '#8b5cf6' })

// Computados
const usuariosFiltrados = computed(() => {
  const q = busca.value.toLowerCase().trim()
  if (!q) return usuarios.value
  return usuarios.value.filter(u =>
    u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  )
})

const transacoesGeraisFiltradas = computed(() => {
  const q = buscaTransacoes.value.toLowerCase().trim()
  if (!q) return transacoesGerais.value
  return transacoesGerais.value.filter(t =>
    t.descricao?.toLowerCase().includes(q) ||
    t.categoria?.toLowerCase().includes(q) ||
    t.User?.nome?.toLowerCase().includes(q) ||
    t.User?.email?.toLowerCase().includes(q)
  )
})

const pctReceitas = computed(() => {
  const rec = Number(stats.value.totalReceitas || 0)
  const des = Number(stats.value.totalDespesas || 0)
  const total = rec + des
  if (total === 0) return 50
  return (rec / total) * 100
})

const pctDespesas = computed(() => {
  const rec = Number(stats.value.totalReceitas || 0)
  const des = Number(stats.value.totalDespesas || 0)
  const total = rec + des
  if (total === 0) return 50
  return (des / total) * 100
})

// Métodos auxiliares
function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(d) {
  if (!d) return '—'
  const dateObj = new Date(d)
  return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function mostrarToast(msg) {
  toast.value = msg
  setTimeout(() => toast.value = '', 4000)
}

// Chamadas de API
async function carregarStats() {
  loadingStats.value = true
  try {
    const res = await api.get('/admin/stats')
    stats.value = res.data
  } catch (e) {
    mostrarToast('❌ Erro ao carregar estatísticas do sistema')
  } finally {
    loadingStats.value = false
  }
}

async function carregarUsuarios() {
  loadingUsers.value = true
  try {
    const res = await api.get('/admin/users')
    usuarios.value = res.data
  } catch (e) {
    mostrarToast('❌ Erro ao carregar lista de usuários')
  } finally {
    loadingUsers.value = false
  }
}

async function carregarTransacoesGerais() {
  loadingTransacoesGerais.value = true
  try {
    const res = await api.get('/admin/transactions')
    transacoesGerais.value = res.data
  } catch (e) {
    mostrarToast('❌ Erro ao carregar transações globais')
  } finally {
    loadingTransacoesGerais.value = false
  }
}

async function criarUsuario() {
  if (!formCriar.value.nome || !formCriar.value.email || !formCriar.value.senha) {
    mostrarToast('⚠️ Preencha todos os campos obrigatórios'); return
  }
  loadingAcao.value = true
  try {
    await api.post('/admin/users', formCriar.value)
    modalCriar.value = false
    formCriar.value = { nome: '', email: '', senha: '', isAdmin: false }
    await carregarUsuarios()
    await carregarStats()
    mostrarToast('✅ Novo usuário cadastrado com sucesso!')
  } catch (e) {
    mostrarToast('❌ ' + (e.response?.data?.erro || 'Erro ao criar usuário'))
  } finally {
    loadingAcao.value = false
  }
}

async function resetarSenha() {
  if (!novaSenha.value) { mostrarToast('⚠️ Preencha a nova senha'); return }
  loadingAcao.value = true
  try {
    await api.put(`/admin/users/${usuarioSelecionado.value.id}/reset-password`, { senha: novaSenha.value })
    modalReset.value = false
    novaSenha.value = ''
    mostrarToast('✅ Senha alterada com sucesso!')
  } catch (e) {
    mostrarToast('❌ Erro ao tentar atualizar a senha')
  } finally {
    loadingAcao.value = false
  }
}

async function deletarUsuario() {
  loadingAcao.value = true
  try {
    await api.delete(`/admin/users/${usuarioSelecionado.value.id}`)
    modalDeletar.value = false
    await carregarUsuarios()
    await carregarStats()
    mostrarToast('🗑️ Usuário removido permanentemente!')
  } catch (e) {
    mostrarToast('❌ Erro ao remover usuário')
  } finally {
    loadingAcao.value = false
  }
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
  } catch (e) {
    mostrarToast('❌ Erro ao obter transações do usuário')
  } finally {
    loadingDetalhes.value = false
  }
}

async function carregarContas() {
  loadingDetalhes.value = true
  try {
    const res = await api.get(`/admin/users/${usuarioSelecionado.value.id}/accounts`)
    contasDetalhes.value = res.data
  } catch (e) {
    mostrarToast('❌ Erro ao carregar contas do usuário')
  } finally {
    loadingDetalhes.value = false
  }
}

async function adicionarConta() {
  if (!formConta.value.nome || !formConta.value.banco) {
    mostrarToast('⚠️ Defina o nome e o banco'); return
  }
  loadingAcao.value = true
  try {
    await api.post(`/admin/users/${usuarioSelecionado.value.id}/accounts`, formConta.value)
    modalAddConta.value = false
    formConta.value = { nome: '', banco: '', saldo: 0, cor: '#8b5cf6' }
    await carregarContas()
    await carregarStats()
    mostrarToast('✅ Conta bancária adicionada!')
  } catch (e) {
    mostrarToast('❌ Falha ao criar conta bancária')
  } finally {
    loadingAcao.value = false
  }
}

async function deletarConta() {
  loadingAcao.value = true
  try {
    await api.delete(`/admin/accounts/${contaSelecionada.value.id}`)
    modalDeletarConta.value = false
    await carregarContas()
    await carregarStats()
    mostrarToast('🗑️ Conta bancária deletada com sucesso!')
  } catch (e) {
    mostrarToast('❌ Falha ao excluir conta')
  } finally {
    loadingAcao.value = false
  }
}

async function verSenha() {
  loadingAcao.value = true
  try {
    const res = await api.get(`/admin/users/${usuarioSelecionado.value.id}/password`)
    senhaVisivel.value = res.data.senhaVisivel
  } catch (e) {
    mostrarToast('❌ Erro ao revelar senha')
  } finally {
    loadingAcao.value = false
  }
}

async function resetarTudo() {
  loadingAcao.value = true
  try {
    await api.post(`/admin/users/${usuarioSelecionado.value.id}/reset-all`)
    modalResetarTudo.value = false
    mostrarToast('✅ Todo o histórico de transações e contas foi apagado!')
    await carregarContas()
    await carregarStats()
  } catch (e) {
    mostrarToast('❌ Falha ao zerar histórico')
  } finally {
    loadingAcao.value = false
  }
}

// Watchers
watch(aba, (novaAba) => {
  if (novaAba === 'dashboard') {
    carregarStats()
    carregarUsuarios()
  } else if (novaAba === 'usuarios') {
    carregarUsuarios()
  } else if (novaAba === 'transacoes') {
    carregarTransacoesGerais()
  }
})

// Setup inicial
onMounted(async () => {
  await carregarStats()
  await carregarUsuarios()
  await carregarTransacoesGerais()
})

function abrirModalCriar() {
  formCriar.value = { nome: '', email: '', senha: '', isAdmin: false }
  modalCriar.value = true
}

function abrirResetSenha(u) {
  usuarioSelecionado.value = u
  novaSenha.value = ''
  modalReset.value = true
}

function confirmarDeletar(u) {
  usuarioSelecionado.value = u
  modalDeletar.value = true
}

function confirmarDeletarConta(c) {
  contaSelecionada.value = c
  modalDeletarConta.value = true
}

function confirmarResetarTudo() {
  modalResetarTudo.value = true
}
</script>

<style scoped>
/* RESET E CONFIGURAÇÕES DE BASE */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* PALETA DE CORES & LAYOUT */
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: radial-gradient(circle at top right, #130a2b 0%, #080512 60%, #05030d 100%);
  color: #e2e8f0;
  font-family: 'Outfit', 'Inter', sans-serif;
  letter-spacing: -0.01em;
}

/* ASIDE / SIDEBAR COM GLASSMORPHISM */
.sidebar {
  width: 260px;
  min-height: 100vh;
  background: rgba(12, 8, 28, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(139, 92, 246, 0.12);
  display: flex;
  flex-direction: column;
  padding: 2rem 1.25rem;
  position: sticky;
  top: 0;
  z-index: 15;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 2.5rem;
  padding: 0 0.5rem;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.35);
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #f3f4f6;
  letter-spacing: -0.02em;
}

.logo-subtitle {
  font-size: 0.65rem;
  font-weight: 700;
  color: #a78bfa;
  letter-spacing: 0.1em;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item:hover {
  background: rgba(139, 92, 246, 0.08);
  color: #f3f4f6;
}

.nav-item.active {
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.18) 0%, rgba(139, 92, 246, 0.03) 100%);
  color: #c084fc;
  border-left: 3px solid #a78bfa;
  font-weight: 600;
  padding-left: 0.85rem;
  box-shadow: inset 2px 0 8px rgba(139, 92, 246, 0.05);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: transparent;
  border: none;
  color: #fca5a5;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* MAIN BODY & HEADER */
.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2.5rem;
  border-bottom: 1px solid rgba(139, 92, 246, 0.08);
  background: rgba(8, 5, 18, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #f3f4f6;
  letter-spacing: -0.02em;
}

.user-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  background: rgba(139, 92, 246, 0.05);
  padding: 0.5rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.15);
}

.user-role {
  font-size: 0.6rem;
  font-weight: 700;
  color: #a78bfa;
  letter-spacing: 0.08em;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f3f4f6;
}

.content {
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

/* CARDS DE ESTATÍSTICA (GLOWING CARDS) */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
}

.stat-card {
  background: rgba(20, 15, 41, 0.45);
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.stat-card:hover {
  transform: translateY(-3px);
  border-color: rgba(139, 92, 246, 0.25);
  box-shadow: 0 10px 30px rgba(139, 92, 246, 0.1);
}

.stat-card.double-width {
  grid-column: span 2;
}

@media (max-width: 900px) {
  .stat-card.double-width {
    grid-column: span 1;
  }
}

.stat-icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.purple-glow { background: rgba(167, 139, 250, 0.1); color: #c084fc; border: 1px solid rgba(167, 139, 250, 0.2); }
.blue-glow   { background: rgba(96, 165, 250, 0.1); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.2); }
.pink-glow   { background: rgba(244, 114, 182, 0.1); color: #f472b6; border: 1px solid rgba(244, 114, 182, 0.2); }
.teal-glow   { background: rgba(20, 184, 166, 0.1); color: #2dd4bf; border: 1px solid rgba(20, 184, 166, 0.2); }
.orange-glow { background: rgba(251, 146, 60, 0.1); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.2); }
.yellow-glow { background: rgba(250, 204, 21, 0.1); color: #facc15; border: 1px solid rgba(250, 204, 21, 0.2); }
.green-glow  { background: rgba(74, 222, 128, 0.1); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.2); }

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.8rem;
  color: #9ca3af;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.stat-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: #f3f4f6;
  line-height: 1.1;
}

.highlight-text {
  background: linear-gradient(90deg, #4ade80 0%, #2dd4bf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* CASHFLOW SECTION */
.cashflow-section {
  padding: 1.75rem;
}

.cashflow-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.cf-title h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f3f4f6;
}

.cf-total-balance {
  font-size: 1.1rem;
  font-weight: 800;
  padding: 0.4rem 1rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.cashflow-indicators {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
}

.cf-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.cf-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.cf-indicator.green .dot { background: #4ade80; box-shadow: 0 0 10px #4ade80; }
.cf-indicator.red .dot { background: #f87171; box-shadow: 0 0 10px #f87171; }

.cashflow-bar-container {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 99px;
  padding: 4px;
}

.cashflow-progress-bar {
  display: flex;
  height: 24px;
  border-radius: 99px;
  overflow: hidden;
  position: relative;
}

.bar-fill {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.green-bar {
  background: linear-gradient(90deg, #166534 0%, #22c55e 100%);
  color: #fff;
}

.red-bar {
  background: linear-gradient(90deg, #ef4444 0%, #991b1b 100%);
  color: #fff;
}

.bar-pct {
  font-size: 0.72rem;
  font-weight: 800;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

/* COMPONENT CARDS GERAIS (GLASS CARDS) */
.glass-card {
  background: rgba(20, 15, 41, 0.45);
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(139, 92, 246, 0.08);
}

.card-header h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f3f4f6;
  letter-spacing: -0.016em;
}

.btn-link-premium {
  background: transparent;
  border: none;
  color: #a78bfa;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-link-premium:hover {
  color: #c084fc;
  text-shadow: 0 0 8px rgba(192, 132, 252, 0.3);
}

/* TABELAS */
.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.tabela {
  width: 100%;
  border-collapse: collapse;
}

.tabela th {
  text-align: left;
  padding: 1rem 1.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  background: rgba(139, 92, 246, 0.02);
}

.tabela td {
  padding: 1.1rem 1.5rem;
  font-size: 0.9rem;
  border-bottom: 1px solid rgba(139, 92, 246, 0.05);
  color: #cbd5e1;
}

.tabela tbody tr:last-child td {
  border-bottom: none;
}

.row-hover {
  cursor: pointer;
  transition: background 0.2s;
}

.row-hover:hover td {
  background: rgba(139, 92, 246, 0.04);
}

.muted {
  color: #6b7280 !important;
}

.empty-row {
  text-align: center;
  color: #9ca3af;
  padding: 3rem !important;
  font-style: italic;
}

.font-semibold {
  font-weight: 600;
  color: #f3f4f6;
}

.font-bold {
  font-weight: 700;
}

.font-sm {
  font-size: 0.85rem;
}

/* BADGES E MARCADORES */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-admin-tag {
  background: rgba(167, 139, 250, 0.15);
  color: #c084fc;
  border: 1px solid rgba(167, 139, 250, 0.25);
}

.badge-user {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.badge-entrada {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.badge-saida {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.valor-positivo {
  color: #4ade80 !important;
}

.valor-negativo {
  color: #f87171 !important;
}

.cor-bolinha-border {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 8px currentColor;
}

.color-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* TOOLBARS E BUSCAS */
.toolbar-premium {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  min-width: 280px;
}

.search-icon {
  position: absolute;
  left: 1.1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
}

.input-busca {
  width: 100%;
  background: rgba(13, 9, 29, 0.6);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 12px;
  padding: 0.75rem 1.25rem 0.75rem 2.8rem;
  color: #f3f4f6;
  font-size: 0.92rem;
  outline: none;
  transition: all 0.3s;
}

.input-busca:focus {
  border-color: #a78bfa;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
  background: rgba(13, 9, 29, 0.85);
}

.transacoes-contador {
  font-size: 0.85rem;
  color: #9ca3af;
  font-weight: 500;
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 10px;
}

/* BOTÕES ESTILIZADOS */
.btn-primary-glow {
  background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
  white-space: nowrap;
}

.btn-primary-glow:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5);
  background: linear-gradient(135deg, #b59dfb 0%, #8b5cf6 100%);
}

.btn-primary-glow:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-primary-glow.btn-sm {
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  border-radius: 8px;
}

.btn-secondary-premium {
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary-premium:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.btn-danger-premium {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger-premium:hover {
  background: #ef4444;
  color: #fff;
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
}

.btn-full {
  width: 100%;
}

/* ACOES DE TABELA */
.acoes {
  display: flex;
  gap: 0.5rem;
}

.btn-action-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-action-icon.blue { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.15); }
.btn-action-icon.blue:hover { background: #2563eb; color: #fff; }

.btn-action-icon.yellow { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.15); }
.btn-action-icon.yellow:hover { background: #d97706; color: #fff; }

.btn-action-icon.red { background: rgba(239, 68, 68, 0.1); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.15); }
.btn-action-icon.red:hover { background: #dc2626; color: #fff; }

.btn-action-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.05) !important;
  color: #6b7280 !important;
}

/* OVERLAYS E MODAIS GLASS */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 2, 8, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.glass-modal {
  background: radial-gradient(circle at top left, #1c143d 0%, #0d0920 100%);
  border: 1px solid rgba(139, 92, 246, 0.18);
  border-radius: 20px;
  padding: 2rem;
  width: 460px;
  max-width: 95vw;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: modalScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalScale {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.glass-modal.modal-sm {
  width: 380px;
}

.glass-modal.modal-lg {
  width: 780px;
  max-height: 90vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
}

.text-red {
  color: #f87171 !important;
}

.text-white {
  color: #fff !important;
}

.btn-close {
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 1rem;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.modal-desc {
  font-size: 0.9rem;
  color: #9ca3af;
  line-height: 1.5;
}

.alert-text-danger {
  display: inline-block;
  margin-top: 0.5rem;
  color: #fca5a5;
  font-size: 0.8rem;
  background: rgba(239, 68, 68, 0.1);
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-body-scrollable {
  max-height: 50vh;
  overflow-y: auto;
  padding-right: 0.5rem;
}

/* CUSTOM SCROLLBAR FOR MODAL BODY */
.modal-body-scrollable::-webkit-scrollbar {
  width: 6px;
}
.modal-body-scrollable::-webkit-scrollbar-track {
  background: transparent;
}
.modal-body-scrollable::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.2);
  border-radius: 99px;
}
.modal-body-scrollable::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 92, 246, 0.4);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 1.25rem;
}

/* FORMULÁRIOS */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #a78bfa;
}

.input {
  background: rgba(8, 5, 18, 0.6);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 10px;
  padding: 0.7rem 1rem;
  color: #f3f4f6;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;
}

.input:focus {
  border-color: #a78bfa;
  background: rgba(8, 5, 18, 0.85);
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
}

.input-cor {
  padding: 0.2rem;
  height: 44px;
  cursor: pointer;
}

.checkbox-wrapper {
  margin-top: 0.25rem;
}

.checkbox-label-premium {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  user-select: none;
}

.custom-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #8b5cf6;
  cursor: pointer;
}

.checkbox-text {
  font-size: 0.88rem;
  color: #cbd5e1;
}

/* TABELAS ESPECÍFICAS DE MODAL DE DETALHES */
.user-cell-info {
  display: flex;
  flex-direction: column;
}

.user-cell-nome {
  font-weight: 600;
  color: #f3f4f6;
}

.user-cell-email {
  font-size: 0.75rem;
  color: #6b7280;
}

.account-badge-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.account-name-cell {
  font-size: 0.85rem;
  color: #e5e7eb;
}

.category-pill {
  display: inline-block;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  text-transform: capitalize;
}

/* DETALHES DO USUÁRIO AVATAR E ABAS */
.modal-header-user {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(139, 92, 246, 0.12);
  padding-bottom: 1.25rem;
  margin-bottom: 1rem;
}

.user-details-title-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 1.25rem;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

.abas-premium {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 1.25rem;
  gap: 0.5rem;
}

.aba-btn-premium {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #9ca3af;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.6rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.aba-btn-premium:hover {
  color: #fff;
}

.aba-btn-premium.active {
  color: #c084fc;
  border-bottom-color: #a78bfa;
  font-weight: 700;
}

.secao-titulo-premium {
  font-size: 0.85rem;
  font-weight: 700;
  color: #a78bfa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.aba-toolbar-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

/* SEGURANÇA E ACESSO */
.seguranca-grid-premium {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

@media (max-width: 700px) {
  .seguranca-grid-premium {
    grid-template-columns: 1fr;
  }
}

.seg-card-premium {
  background: rgba(8, 5, 18, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.seg-card-premium.border-danger {
  border-color: rgba(239, 68, 68, 0.15);
}

.seg-titulo-premium {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}

.font-xs {
  font-size: 0.78rem;
}

.senha-box-glow {
  background: rgba(34, 197, 94, 0.04);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-top: 0.5rem;
}

.senha-label {
  font-size: 0.65rem;
  color: #4ade80;
  font-weight: 700;
  text-transform: uppercase;
}

.senha-texto {
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 1.05rem;
  color: #4ade80;
  font-weight: 700;
  word-break: break-all;
}

/* TOAST E NOTIFICAÇÃO GLOW */
.toast-glow {
  position: fixed;
  bottom: 2.5rem;
  right: 2.5rem;
  background: #110d26;
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #f3f4f6;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-size: 0.92rem;
  font-weight: 600;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.15);
  z-index: 999;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateY(1.5rem) scale(0.9);
}
</style>