<template>
  <div class="auth-root">

    <!-- Painel esquerdo — visual -->
    <aside class="auth-panel">
      <div class="auth-panel-inner">
        <div class="brand">
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="brand-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#7c3aed" />
                <stop offset="100%" stop-color="#e879f9" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#brand-grad)"/>
            <path d="M10 22V16M10 16V10H19C20.657 10 22 11.343 22 13C22 14.657 20.657 16 19 16H10Z" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 19H21" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
          <span class="brand-name">Finora</span>
        </div>

        <div class="panel-copy">
          <h1>Comece a controlar<br>suas finanças hoje.</h1>
          <p>Crie sua conta gratuitamente e tenha visibilidade total sobre o seu dinheiro.</p>
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
    </aside>

    <!-- Painel direito — formulário -->
    <main class="auth-form-side">
      <div class="auth-form-wrap">

        <div class="brand brand-mobile">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="brand-grad-mobile" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#7c3aed" />
                <stop offset="100%" stop-color="#e879f9" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#brand-grad-mobile)"/>
            <path d="M10 22V16M10 16V10H19C20.657 10 22 11.343 22 13C22 14.657 20.657 16 19 16H10Z" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 19H21" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
          <span class="brand-name">Finora</span>
        </div>

        <div class="form-header">
          <h2>Criar conta gratuita</h2>
          <p>Preencha os dados abaixo para começar</p>
        </div>

        <form @submit.prevent="handleCadastro" class="auth-form" novalidate>

          <div class="field-group">
            <label for="nome">Nome completo</label>
            <div class="input-wrap" :class="{ 'input-error': erroNome }">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <input id="nome" v-model="nome" type="text" placeholder="Seu nome" autocomplete="name" @blur="validarNome" />
            </div>
            <span v-if="erroNome" class="field-error">{{ erroNome }}</span>
          </div>

          <div class="field-group">
            <label for="email">E-mail</label>
            <div class="input-wrap" :class="{ 'input-error': erroEmail }">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input id="email" v-model="email" type="email" placeholder="seu@email.com" autocomplete="email" @blur="validarEmail" />
            </div>
            <span v-if="erroEmail" class="field-error">{{ erroEmail }}</span>
          </div>

          <div class="field-group">
            <label for="senha">Senha</label>
            <div class="input-wrap" :class="{ 'input-error': erroSenha }">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input id="senha" v-model="senha" :type="mostrarSenha ? 'text' : 'password'" placeholder="Mínimo 6 caracteres" autocomplete="new-password" @blur="validarSenha" />
              <button type="button" class="toggle-senha" @click="mostrarSenha = !mostrarSenha" :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'">
                <svg v-if="!mostrarSenha" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
            <span v-if="erroSenha" class="field-error">{{ erroSenha }}</span>
          </div>

          <!-- Força da senha -->
          <div v-if="senha.length > 0" class="senha-forca">
            <div class="forca-barra">
              <div class="forca-fill" :class="forcaClasse" :style="{ width: forcaLargura }"></div>
            </div>
            <span class="forca-label" :class="forcaClasse">{{ forcaLabel }}</span>
          </div>

          <div class="field-group">
            <label for="confirmarSenha">Confirmar Senha</label>
            <div class="input-wrap" :class="{ 'input-error': erroConfirmarSenha }">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input id="confirmarSenha" v-model="confirmarSenha" :type="mostrarConfirmarSenha ? 'text' : 'password'" placeholder="Digite a senha novamente" autocomplete="new-password" @blur="validarConfirmarSenha" />
              <button type="button" class="toggle-senha" @click="mostrarConfirmarSenha = !mostrarConfirmarSenha" :aria-label="mostrarConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'">
                <svg v-if="!mostrarConfirmarSenha" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
            <span v-if="erroConfirmarSenha" class="field-error">{{ erroConfirmarSenha }}</span>
          </div>

          <div v-if="erroGeral" class="alert-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ erroGeral }}
          </div>

          <button type="submit" class="btn-primary" :disabled="loading">
            <span v-if="!loading">Criar conta</span>
            <span v-else class="btn-loading">
              <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Criando conta...
            </span>
          </button>

        </form>

        <p class="auth-switch">
          Já tem uma conta?
          <RouterLink to="/login">Entrar</RouterLink>
        </p>

      </div>
    </main>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore    = useAuthStore()
const nome         = ref('')
const email        = ref('')
const senha        = ref('')
const confirmarSenha = ref('')
const erroNome     = ref('')
const erroEmail    = ref('')
const erroSenha    = ref('')
const erroConfirmarSenha = ref('')
const erroGeral    = ref('')
const loading      = ref(false)
const mostrarSenha = ref(false)
const mostrarConfirmarSenha = ref(false)

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

const forcaLabel   = computed(() => ['', 'Fraca', 'Regular', 'Boa', 'Forte', 'Muito forte'][forca.value] || '')
const forcaClasse  = computed(() => ['', 'fraca', 'regular', 'boa', 'forte', 'muito-forte'][forca.value] || '')
const forcaLargura = computed(() => `${(forca.value / 5) * 100}%`)

function validarNome()  { erroNome.value  = !nome.value.trim() ? 'Nome é obrigatório' : '' }
function validarEmail() { erroEmail.value = !email.value ? 'E-mail é obrigatório' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? 'E-mail inválido' : '' }
function validarSenha() {
  erroSenha.value = senha.value.length < 6 ? 'Mínimo 6 caracteres' : ''
  if (confirmarSenha.value) validarConfirmarSenha()
}
function validarConfirmarSenha() {
  erroConfirmarSenha.value = confirmarSenha.value !== senha.value ? 'As senhas não coincidem' : ''
}

async function handleCadastro() {
  validarNome(); validarEmail(); validarSenha(); validarConfirmarSenha()
  if (erroNome.value || erroEmail.value || erroSenha.value || erroConfirmarSenha.value) return

  erroGeral.value = ''
  loading.value   = true
  try {
    await authStore.register(nome.value, email.value, senha.value)
  } catch (e) {
    erroGeral.value = e.response?.data?.erro || 'Erro ao criar conta. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.auth-root {
  display: flex;
  min-height: 100dvh;
  font-family: 'Inter', sans-serif;
  background: #07030e;
  color: #e2e8f0;
}

.auth-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44%;
  min-height: 100dvh;
  background: linear-gradient(145deg, #0c081d 0%, #07030e 50%, #15092b 100%);
  border-right: 1px solid rgba(139, 120, 255, 0.08);
  overflow: hidden;
  padding: 3rem;
}

.auth-panel-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  max-width: 380px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.brand-name {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
  text-shadow: 0 2px 10px rgba(124, 58, 237, 0.3);
}

.panel-copy h1 {
  font-size: clamp(1.75rem, 2.8vw, 2.4rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.03em;
  color: #fff;
  text-shadow: 0 2px 15px rgba(124, 58, 237, 0.2);
  margin-bottom: 0.85rem;
}

.panel-copy p {
  font-size: 0.95rem;
  color: #8b89a8;
  line-height: 1.65;
  max-width: 34ch;
}

.panel-features {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  list-style: none;
}

.panel-features li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #8b89a8;
}

.feat-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(124, 58, 237, 0.12);
  color: #c084fc;
  border: 1px solid rgba(192, 132, 252, 0.25);
}

.panel-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 1;
}
.panel-glow-1 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.18) 0%, transparent 70%);
  top: -80px;
  right: -80px;
}
.panel-glow-2 {
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(232, 121, 249, 0.1) 0%, transparent 70%);
  bottom: 60px;
  left: -60px;
}

.auth-form-side {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem;
  background: #07030e;
}

.auth-form-wrap {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: rgba(22, 12, 38, 0.4);
  border: 1px solid rgba(192, 132, 252, 0.15);
  border-radius: 24px;
  padding: 2.5rem;
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05);
}

.brand-mobile {
  display: none;
}

.form-header h2 {
  font-size: 1.55rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: #fff;
  text-shadow: 0 2px 10px rgba(124,58,237,0.25);
  margin-bottom: 0.35rem;
}

.form-header p {
  font-size: 0.875rem;
  color: #8b89a8;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field-group label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #8b89a8;
  letter-spacing: 0.01em;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.input-wrap:focus-within {
  border-color: rgba(192, 132, 252, 0.45);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
}

.input-wrap.input-error {
  border-color: rgba(244, 114, 182, 0.5);
}

.input-icon {
  flex-shrink: 0;
  margin-left: 0.9rem;
  color: rgba(255, 255, 255, 0.28);
  pointer-events: none;
}

.input-wrap input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  padding: 0.8rem 0.9rem;
  font-size: 0.9rem;
  color: #fff;
  font-family: inherit;
}

.input-wrap input::placeholder { color: rgba(255, 255, 255, 0.22); }

.toggle-senha {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-right: 0.3rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  transition: color 150ms ease, background 150ms ease;
}

.toggle-senha:hover {
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.06);
}

.field-error {
  font-size: 0.775rem;
  color: #f472b6;
  padding-left: 0.1rem;
}

/* ── Corrige autofill do navegador ── */
.input-wrap:has(input:-webkit-autofill) {
  background: #160c26 !important;
}

.input-wrap input:-webkit-autofill,
.input-wrap input:-webkit-autofill:hover,
.input-wrap input:-webkit-autofill:focus,
.input-wrap input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #160c26 inset !important;
  -webkit-text-fill-color: #fff !important;
  caret-color: #fff;
  transition: background-color 9999s ease-in-out 0s;
}

/* ── Força da senha ── */
.senha-forca {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.forca-barra {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 99px;
  overflow: hidden;
}

.forca-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 300ms ease, background 300ms ease;
}

.forca-fill.fraca { background: #f472b6; }
.forca-fill.regular { background: #fb923c; }
.forca-fill.boa { background: #c084fc; }
.forca-fill.forte { background: #34d399; }
.forca-fill.muito-forte { background: #a78bfa; }

.forca-label {
  font-size: 0.75rem;
  font-weight: 500;
  min-width: 70px;
  text-align: right;
}

.forca-label.fraca { color: #f472b6; }
.forca-label.regular { color: #fb923c; }
.forca-label.boa { color: #c084fc; }
.forca-label.forte { color: #34d399; }
.forca-label.muito-forte { color: #a78bfa; }

.alert-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  background: rgba(244, 114, 182, 0.08);
  border: 1px solid rgba(244, 114, 182, 0.2);
  font-size: 0.83rem;
  color: #fca5a5;
}

.btn-primary {
  margin-top: 0.25rem;
  width: 100%;
  padding: 0.85rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 180ms ease, transform 100ms ease;
  box-shadow: 0 4px 15px rgba(124, 58, 237, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #6d28d9, #9333ea);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3);
}

.btn-primary:active:not(:disabled) { transform: translateY(1px); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-loading { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }

.auth-switch {
  text-align: center;
  font-size: 0.845rem;
  color: rgba(255, 255, 255, 0.35);
}

.auth-switch a {
  color: #c084fc;
  text-decoration: none;
  font-weight: 500;
  transition: color 150ms ease;
}

.auth-switch a:hover { color: #e879f9; text-decoration: underline; }

@media (max-width: 768px) {
  .auth-root { flex-direction: column; }
  .auth-panel { display: none; }
  .brand-mobile { display: flex; justify-content: center; }
  .auth-form-side { align-items: flex-start; padding: 2.5rem 1.5rem 3rem; }
  .auth-form-wrap {
    max-width: 100%;
    gap: 1.5rem;
    padding: 0;
    border: none;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
  }
  .form-header { text-align: center; }
}
</style>