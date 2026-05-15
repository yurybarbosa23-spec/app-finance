<template>
  <div class="auth-root" :class="{ 'page-ready': pageReady }">

    <!-- Painel esquerdo — visual -->
    <aside class="auth-panel">
      <div class="auth-panel-inner">
        <div class="brand">
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="9" fill="#0d9488"/>
            <path d="M10 22V16M10 16V10H19C20.657 10 22 11.343 22 13C22 14.657 20.657 16 19 16H10Z" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 19H21" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
          <span class="brand-name">Finora</span>
        </div>

        <div class="panel-copy">
          <h1>Comece a controlar<br>suas finanças hoje.</h1>
          <p>Crie sua conta gratuitamente e tenha visibilidade total sobre o seu dinheiro.</p>
        </div>

        <!-- Card de preview financeiro animado -->
        <div class="preview-card">
          <div class="preview-card-header">
            <span class="preview-card-label">Saldo disponível</span>
            <span class="preview-badge">● Ativo</span>
          </div>
          <div class="preview-card-value">R$ 4.820<span class="preview-cents">,50</span></div>
          <div class="preview-bars">
            <div class="preview-bar-row">
              <span>Receitas</span>
              <div class="preview-bar-track"><div class="preview-bar-fill green" style="width:78%"></div></div>
              <span class="preview-bar-pct green-text">78%</span>
            </div>
            <div class="preview-bar-row">
              <span>Despesas</span>
              <div class="preview-bar-track"><div class="preview-bar-fill red" style="width:42%"></div></div>
              <span class="preview-bar-pct red-text">42%</span>
            </div>
            <div class="preview-bar-row">
              <span>Poupança</span>
              <div class="preview-bar-track"><div class="preview-bar-fill teal" style="width:61%"></div></div>
              <span class="preview-bar-pct teal-text">61%</span>
            </div>
          </div>
        </div>

        <ul class="panel-features">
          <li>
            <span class="feat-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            Cadastro gratuito, sem cartão de crédito
          </li>
          <li>
            <span class="feat-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </span>
            Configure em menos de 2 minutos
          </li>
          <li>
            <span class="feat-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            Seus dados protegidos com criptografia
          </li>
        </ul>
      </div>

      <div class="panel-glow panel-glow-1"></div>
      <div class="panel-glow panel-glow-2"></div>
      <div class="panel-grid"></div>
    </aside>

    <!-- Painel direito — formulário -->
    <main class="auth-form-side">
      <div class="auth-form-wrap">

        <!-- Mobile hero -->
        <div class="mobile-hero">
          <div class="brand brand-mobile">
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="9" fill="#0d9488"/>
              <path d="M10 22V16M10 16V10H19C20.657 10 22 11.343 22 13C22 14.657 20.657 16 19 16H10Z" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 19H21" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
            </svg>
            <span class="brand-name">Finora</span>
          </div>
        </div>

        <div class="form-header">
          <h2>Criar conta gratuita</h2>
          <p>Preencha os dados abaixo para começar</p>
        </div>

        <!-- Step indicator -->
        <div class="step-indicator">
          <div class="step-item" :class="{ active: stepAtivo >= 1, done: stepAtivo > 1 }">
            <div class="step-dot">
              <svg v-if="stepAtivo > 1" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              <span v-else>1</span>
            </div>
            <span class="step-label">Identidade</span>
          </div>
          <div class="step-line" :class="{ active: stepAtivo > 1 }"></div>
          <div class="step-item" :class="{ active: stepAtivo >= 2, done: stepAtivo > 2 }">
            <div class="step-dot">
              <svg v-if="stepAtivo > 2" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              <span v-else>2</span>
            </div>
            <span class="step-label">Acesso</span>
          </div>
          <div class="step-line" :class="{ active: stepAtivo > 2 }"></div>
          <div class="step-item" :class="{ active: stepAtivo >= 3 }">
            <div class="step-dot"><span>3</span></div>
            <span class="step-label">Pronto</span>
          </div>
        </div>

        <form @submit.prevent="handleCadastro" class="auth-form" novalidate>

          <div class="field-group">
            <label for="nome">Nome completo</label>
            <div class="input-wrap" :class="{ 'input-error': erroNome, 'input-valid': nomeValido }">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <input id="nome" v-model="nome" type="text" placeholder="Seu nome completo" autocomplete="name" @blur="validarNome" @input="atualizarStep" />
              <svg v-if="nomeValido" class="valid-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span v-if="erroNome" class="field-error">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ erroNome }}
            </span>
          </div>

          <div class="field-group">
            <label for="email">E-mail</label>
            <div class="input-wrap" :class="{ 'input-error': erroEmail, 'input-valid': emailValido }">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input id="email" v-model="email" type="email" placeholder="seu@email.com" autocomplete="email" @blur="validarEmail" @input="atualizarStep" />
              <svg v-if="emailValido" class="valid-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span v-if="erroEmail" class="field-error">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ erroEmail }}
            </span>
          </div>

          <div class="field-group">
            <label for="senha">
              Senha
              <span class="label-hint">Mín. 6 caracteres</span>
            </label>
            <div class="input-wrap" :class="{ 'input-error': erroSenha, 'input-valid': senhaValida }">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input id="senha" v-model="senha" :type="mostrarSenha ? 'text' : 'password'" placeholder="••••••••" autocomplete="new-password" @blur="validarSenha" @input="atualizarStep" />
              <button type="button" class="toggle-senha" @click="mostrarSenha = !mostrarSenha" :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'">
                <svg v-if="!mostrarSenha" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
            <span v-if="erroSenha" class="field-error">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ erroSenha }}
            </span>
          </div>

          <!-- Força da senha melhorada -->
          <div v-if="senha.length > 0" class="senha-forca">
            <div class="forca-segmentos">
              <div
                v-for="i in 5"
                :key="i"
                class="forca-seg"
                :class="{ filled: forca >= i, [forcaClasse]: forca >= i }"
              ></div>
            </div>
            <div class="forca-info">
              <span class="forca-label" :class="forcaClasse">{{ forcaLabel }}</span>
              <span class="forca-dica">{{ forcaDica }}</span>
            </div>
          </div>

          <div v-if="erroGeral" class="alert-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ erroGeral }}
          </div>

          <button type="submit" class="btn-primary" :disabled="loading" :class="{ 'btn-success': sucesso }">
            <span v-if="sucesso" class="btn-loading">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              Conta criada!
            </span>
            <span v-else-if="!loading">Criar minha conta</span>
            <span v-else class="btn-loading">
              <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Criando conta...
            </span>
          </button>

        </form>

        <div class="divider"><span>ou</span></div>

        <p class="auth-switch">
          Já tem uma conta?
          <RouterLink to="/login">Entrar agora →</RouterLink>
        </p>

        <p class="terms-note">
          Ao criar uma conta, você concorda com nossos
          <a href="#">Termos de Uso</a> e <a href="#">Política de Privacidade</a>.
        </p>

      </div>
    </main>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth         = ref(useAuthStore())
const nome         = ref('')
const email        = ref('')
const senha        = ref('')
const erroNome     = ref('')
const erroEmail    = ref('')
const erroSenha    = ref('')
const erroGeral    = ref('')
const loading      = ref(false)
const sucesso      = ref(false)
const mostrarSenha = ref(false)
const pageReady    = ref(false)
const stepAtivo    = ref(1)

onMounted(() => {
  setTimeout(() => { pageReady.value = true }, 50)
})

const nomeValido  = computed(() => nome.value.trim().length >= 2 && !erroNome.value)
const emailValido = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) && !erroEmail.value)
const senhaValida = computed(() => senha.value.length >= 6 && !erroSenha.value)

function atualizarStep() {
  if (nomeValido.value && emailValido.value && senhaValida.value) stepAtivo.value = 3
  else if (nomeValido.value || emailValido.value) stepAtivo.value = 2
  else stepAtivo.value = 1
}

const forca = computed(() => {
  const s = senha.value
  if (s.length === 0) return 0
  let score = 0
  if (s.length >= 6)  score++
  if (s.length >= 10) score++
  if (/[A-Z]/.test(s)) score++
  if (/[0-9]/.test(s)) score++
  if (/[^A-Za-z0-9]/.test(s)) score++
  return score
})

const forcaLabel  = computed(() => ['', 'Fraca', 'Regular', 'Boa', 'Forte', 'Muito forte'][forca.value] || '')
const forcaClasse = computed(() => ['', 'fraca', 'regular', 'boa', 'forte', 'muito-forte'][forca.value] || '')
const forcaDica   = computed(() => {
  if (forca.value <= 1) return 'Adicione letras maiúsculas e números'
  if (forca.value === 2) return 'Tente adicionar símbolos especiais'
  if (forca.value === 3) return 'Quase lá! Mais um pouco...'
  if (forca.value === 4) return 'Senha forte!'
  return 'Senha excelente! 🎉'
})

function validarNome()  { erroNome.value  = !nome.value.trim() ? 'Nome é obrigatório' : nome.value.trim().length < 2 ? 'Nome muito curto' : '' }
function validarEmail() { erroEmail.value = !email.value ? 'E-mail é obrigatório' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? 'E-mail inválido' : '' }
function validarSenha() { erroSenha.value = senha.value.length < 6 ? 'Mínimo 6 caracteres' : '' }

async function handleCadastro() {
  validarNome(); validarEmail(); validarSenha()
  if (erroNome.value || erroEmail.value || erroSenha.value) return

  erroGeral.value = ''
  loading.value   = true
  try {
    await auth.value.register(nome.value, email.value, senha.value)
    sucesso.value = true
    stepAtivo.value = 3
  } catch (e) {
    erroGeral.value = e.response?.data?.erro || 'Erro ao criar conta. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Animação de entrada ── */
.auth-root {
  display: flex;
  min-height: 100dvh;
  font-family: 'Inter', sans-serif;
  background: #0b0d12;
  color: #e2e8f0;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 400ms ease, transform 400ms ease;
}
.auth-root.page-ready { opacity: 1; transform: translateY(0); }

/* ── Painel esquerdo ── */
.auth-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44%;
  min-height: 100dvh;
  background: linear-gradient(145deg, #0d1117 0%, #0f1923 50%, #091a18 100%);
  border-right: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
  padding: 3rem;
}
.auth-panel-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 380px;
  width: 100%;
}

/* ── Grid de fundo no painel ── */
.panel-grid {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse 70% 70% at 60% 40%, black 30%, transparent 100%);
}

/* ── Brand ── */
.brand { display: flex; align-items: center; gap: 0.6rem; }
.brand-name { font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em; color: #f0fdf9; }

/* ── Panel copy ── */
.panel-copy h1 {
  font-size: clamp(1.6rem, 2.6vw, 2.2rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.03em;
  color: #f0fdf9;
  margin-bottom: 0.75rem;
}
.panel-copy p { font-size: 0.9rem; color: rgba(255,255,255,0.45); line-height: 1.65; max-width: 34ch; }

/* ── Preview card ── */
.preview-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 1.1rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  backdrop-filter: blur(8px);
}
.preview-card-header { display: flex; align-items: center; justify-content: space-between; }
.preview-card-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
.preview-badge { font-size: 0.7rem; color: #4ade80; background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.2); padding: 0.2rem 0.55rem; border-radius: 99px; }
.preview-card-value { font-size: 1.6rem; font-weight: 700; color: #f0fdf9; letter-spacing: -0.03em; }
.preview-cents { font-size: 1rem; color: rgba(255,255,255,0.5); }
.preview-bars { display: flex; flex-direction: column; gap: 0.55rem; }
.preview-bar-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.72rem; color: rgba(255,255,255,0.4); }
.preview-bar-row > span:first-child { width: 58px; flex-shrink: 0; }
.preview-bar-track { flex: 1; height: 5px; background: rgba(255,255,255,0.07); border-radius: 99px; overflow: hidden; }
.preview-bar-fill { height: 100%; border-radius: 99px; transition: width 1s ease; }
.preview-bar-fill.green { background: #4ade80; }
.preview-bar-fill.red   { background: #f87171; }
.preview-bar-fill.teal  { background: #2dd4bf; }
.preview-bar-pct { width: 28px; text-align: right; font-weight: 500; }
.green-text { color: #4ade80; }
.red-text   { color: #f87171; }
.teal-text  { color: #2dd4bf; }

/* ── Features ── */
.panel-features { display: flex; flex-direction: column; gap: 0.75rem; list-style: none; }
.panel-features li { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; color: rgba(255,255,255,0.5); }
.feat-icon {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border-radius: 8px;
  background: rgba(13,148,136,0.15);
  color: #2dd4bf;
  border: 1px solid rgba(13,148,136,0.2);
}

/* ── Glows ── */
.panel-glow { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 1; }
.panel-glow-1 { width: 350px; height: 350px; background: radial-gradient(circle, rgba(13,148,136,0.18) 0%, transparent 70%); top: -80px; right: -80px; }
.panel-glow-2 { width: 280px; height: 280px; background: radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%); bottom: 60px; left: -60px; }

/* ── Formulário lado direito ── */
.auth-form-side {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem;
  background: #0b0d12;
}
.auth-form-wrap {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.mobile-hero { display: none; }
.brand-mobile { display: none; }

.form-header h2 { font-size: 1.55rem; font-weight: 700; letter-spacing: -0.025em; color: #f0fdf9; margin-bottom: 0.3rem; }
.form-header p { font-size: 0.875rem; color: rgba(255,255,255,0.38); }

/* ── Step indicator ── */
.step-indicator {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0.75rem 0;
}
.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}
.step-dot {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  border: 1.5px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.7rem; font-weight: 600;
  color: rgba(255,255,255,0.3);
  transition: all 250ms ease;
}
.step-item.active .step-dot {
  background: rgba(13,148,136,0.2);
  border-color: #0d9488;
  color: #2dd4bf;
}
.step-item.done .step-dot {
  background: #0d9488;
  border-color: #0d9488;
  color: #fff;
}
.step-label { font-size: 0.65rem; color: rgba(255,255,255,0.3); transition: color 250ms ease; }
.step-item.active .step-label { color: rgba(255,255,255,0.6); }
.step-line {
  flex: 1;
  height: 1.5px;
  background: rgba(255,255,255,0.07);
  margin: 0 0.4rem;
  margin-bottom: 1rem;
  transition: background 250ms ease;
}
.step-line.active { background: #0d9488; }

/* ── Formulário ── */
.auth-form { display: flex; flex-direction: column; gap: 0.9rem; }
.field-group { display: flex; flex-direction: column; gap: 0.4rem; }
.field-group label {
  font-size: 0.8rem; font-weight: 500;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.01em;
  display: flex; align-items: center; justify-content: space-between;
}
.label-hint { font-size: 0.7rem; color: rgba(255,255,255,0.25); font-weight: 400; }

.input-wrap {
  position: relative; display: flex; align-items: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px;
  transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
}
.input-wrap:focus-within {
  border-color: rgba(13,148,136,0.6);
  box-shadow: 0 0 0 3px rgba(13,148,136,0.1);
  background: rgba(13,148,136,0.03);
}
.input-wrap.input-error { border-color: rgba(248,113,113,0.5); box-shadow: 0 0 0 3px rgba(248,113,113,0.07); }
.input-wrap.input-valid { border-color: rgba(74,222,128,0.4); }

.input-icon { flex-shrink: 0; margin-left: 0.9rem; color: rgba(255,255,255,0.25); pointer-events: none; transition: color 180ms ease; }
.input-wrap:focus-within .input-icon { color: rgba(13,148,136,0.8); }

.input-wrap input {
  flex: 1; background: transparent; border: none; outline: none;
  padding: 0.8rem 0.9rem;
  font-size: 0.9rem; color: #e2e8f0; font-family: inherit;
}
.input-wrap input::placeholder { color: rgba(255,255,255,0.2); }

.valid-icon { margin-right: 0.85rem; color: #4ade80; flex-shrink: 0; }

.toggle-senha {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; margin-right: 0.3rem;
  background: transparent; border: none; cursor: pointer;
  color: rgba(255,255,255,0.28); border-radius: 6px;
  transition: color 150ms ease, background 150ms ease;
}
.toggle-senha:hover { color: rgba(255,255,255,0.65); background: rgba(255,255,255,0.05); }

.field-error {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.775rem; color: #f87171;
  animation: slideDown 200ms ease;
}
@keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

/* ── Autofill fix ── */
.input-wrap input:-webkit-autofill,
.input-wrap input:-webkit-autofill:hover,
.input-wrap input:-webkit-autofill:focus,
.input-wrap input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #0f1117 inset !important;
  -webkit-text-fill-color: #e2e8f0 !important;
  caret-color: #e2e8f0;
  transition: background-color 9999s ease-in-out 0s;
}

/* ── Força da senha melhorada ── */
.senha-forca { display: flex; flex-direction: column; gap: 0.4rem; }
.forca-segmentos { display: flex; gap: 4px; }
.forca-seg {
  flex: 1; height: 4px; border-radius: 99px;
  background: rgba(255,255,255,0.08);
  transition: background 300ms ease;
}
.forca-seg.filled.fraca      { background: #f87171; }
.forca-seg.filled.regular    { background: #fb923c; }
.forca-seg.filled.boa        { background: #facc15; }
.forca-seg.filled.forte      { background: #4ade80; }
.forca-seg.filled.muito-forte { background: #2dd4bf; }

.forca-info { display: flex; align-items: center; justify-content: space-between; }
.forca-label { font-size: 0.72rem; font-weight: 600; }
.forca-label.fraca      { color: #f87171; }
.forca-label.regular    { color: #fb923c; }
.forca-label.boa        { color: #facc15; }
.forca-label.forte      { color: #4ade80; }
.forca-label.muito-forte { color: #2dd4bf; }
.forca-dica { font-size: 0.7rem; color: rgba(255,255,255,0.3); }

/* ── Alerta de erro geral ── */
.alert-error {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.7rem 0.9rem; border-radius: 8px;
  background: rgba(248,113,113,0.08);
  border: 1px solid rgba(248,113,113,0.2);
  font-size: 0.83rem; color: #fca5a5;
  animation: slideDown 200ms ease;
}

/* ── Botão ── */
.btn-primary {
  margin-top: 0.1rem; width: 100%; padding: 0.88rem;
  border: none; border-radius: 10px;
  background: linear-gradient(135deg, #0d9488, #0891b2);
  color: #fff; font-size: 0.9rem; font-weight: 600; font-family: inherit;
  cursor: pointer;
  transition: all 200ms ease;
  box-shadow: 0 2px 16px rgba(13,148,136,0.35);
  letter-spacing: 0.01em;
}
.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0f766e, #0e7490);
  box-shadow: 0 4px 24px rgba(13,148,136,0.45);
  transform: translateY(-1px);
}
.btn-primary:active:not(:disabled) { transform: translateY(1px); box-shadow: 0 1px 8px rgba(13,148,136,0.25); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
.btn-primary.btn-success { background: linear-gradient(135deg, #16a34a, #0d9488); box-shadow: 0 4px 20px rgba(22,163,74,0.35); }
.btn-loading { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }

/* ── Divider ── */
.divider {
  display: flex; align-items: center; gap: 0.75rem;
  color: rgba(255,255,255,0.18); font-size: 0.75rem;
}
.divider::before, .divider::after {
  content: ''; flex: 1; height: 1px;
  background: rgba(255,255,255,0.07);
}

/* ── Links inferiores ── */
.auth-switch { text-align: center; font-size: 0.845rem; color: rgba(255,255,255,0.32); }
.auth-switch a { color: #2dd4bf; text-decoration: none; font-weight: 500; transition: color 150ms ease; }
.auth-switch a:hover { color: #5eead4; }

.terms-note { text-align: center; font-size: 0.73rem; color: rgba(255,255,255,0.2); line-height: 1.6; }
.terms-note a { color: rgba(255,255,255,0.35); text-decoration: underline; transition: color 150ms ease; }
.terms-note a:hover { color: rgba(255,255,255,0.6); }

/* ── Responsivo ── */
@media (max-width: 768px) {
  .auth-root { flex-direction: column; }
  .auth-panel { display: none; }
  .mobile-hero { display: flex; justify-content: center; padding-top: 1rem; }
  .brand-mobile { display: flex; }
  .auth-form-side { align-items: flex-start; padding: 1.5rem 1.5rem 3rem; }
  .auth-form-wrap { max-width: 100%; gap: 1.25rem; }
  .form-header { text-align: center; }
}
</style>
