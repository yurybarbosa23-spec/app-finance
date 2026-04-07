<template>
  <div class="auth-root">

    <!-- Painel esquerdo — visual -->
    <aside class="auth-panel">
      <div class="auth-panel-inner">

        <!-- Logo -->
        <div class="brand">
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="9" fill="#0d9488"/>
            <path d="M10 22V16M10 16V10H19C20.657 10 22 11.343 22 13C22 14.657 20.657 16 19 16H10Z" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 19H21" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
          <span class="brand-name">Finora</span>
        </div>

        <!-- Headline -->
        <div class="panel-copy">
          <h1>Seu dinheiro,<br>sob controle.</h1>
          <p>Gerencie contas, transações e investimentos em um só lugar com clareza e segurança.</p>
        </div>

        <!-- Features -->
        <ul class="panel-features">
          <li>
            <span class="feat-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </span>
            Acompanhe receitas e despesas em tempo real
          </li>
          <li>
            <span class="feat-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            </span>
            Múltiplas contas e carteiras organizadas
          </li>
          <li>
            <span class="feat-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            Dados protegidos com autenticação segura
          </li>
        </ul>

      </div>

      <!-- Decoração de fundo -->
      <div class="panel-glow panel-glow-1"></div>
      <div class="panel-glow panel-glow-2"></div>
    </aside>

    <!-- Painel direito — formulário -->
    <main class="auth-form-side">
      <div class="auth-form-wrap">

        <!-- Logo mobile (só aparece em telas pequenas) -->
        <div class="brand brand-mobile">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="9" fill="#0d9488"/>
            <path d="M10 22V16M10 16V10H19C20.657 10 22 11.343 22 13C22 14.657 20.657 16 19 16H10Z" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 19H21" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
          <span class="brand-name">Finora</span>
        </div>

        <div class="form-header">
          <h2>Bem-vindo de volta</h2>
          <p>Entre na sua conta para continuar</p>
        </div>

        <form @submit.prevent="handleLogin" class="auth-form" novalidate>

          <div class="field-group">
            <label for="email">E-mail</label>
            <div class="input-wrap" :class="{ 'input-error': erroEmail }">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="seu@email.com"
                autocomplete="email"
                @blur="validarEmail"
              />
            </div>
            <span v-if="erroEmail" class="field-error">{{ erroEmail }}</span>
          </div>

          <div class="field-group">
            <label for="senha">Senha</label>
            <div class="input-wrap" :class="{ 'input-error': erroSenha }">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input
                id="senha"
                v-model="senha"
                :type="mostrarSenha ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                @blur="validarSenha"
              />
              <button type="button" class="toggle-senha" @click="mostrarSenha = !mostrarSenha" :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'">
                <svg v-if="!mostrarSenha" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
            <span v-if="erroSenha" class="field-error">{{ erroSenha }}</span>
          </div>

          <div v-if="erroGeral" class="alert-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ erroGeral }}
          </div>

          <button type="submit" class="btn-primary" :disabled="loading">
            <span v-if="!loading">Entrar</span>
            <span v-else class="btn-loading">
              <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Entrando...
            </span>
          </button>

        </form>

        <p class="auth-switch">
          Ainda não tem conta?
          <RouterLink to="/cadastro">Criar conta gratuita</RouterLink>
        </p>

      </div>
    </main>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth        = ref(useAuthStore())
const email       = ref('')
const senha       = ref('')
const erroEmail   = ref('')
const erroSenha   = ref('')
const erroGeral   = ref('')
const loading     = ref(false)
const mostrarSenha = ref(false)

function validarEmail() {
  erroEmail.value = !email.value
    ? 'E-mail é obrigatório'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
      ? 'E-mail inválido'
      : ''
}

function validarSenha() {
  erroSenha.value = !senha.value ? 'Senha é obrigatória' : ''
}

async function handleLogin() {
  validarEmail()
  validarSenha()
  if (erroEmail.value || erroSenha.value) return

  erroGeral.value = ''
  loading.value   = true
  try {
    await auth.value.login(email.value, senha.value)
  } catch (e) {
    erroGeral.value = e.response?.data?.erro || 'Credenciais inválidas. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Reset & base ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.auth-root {
  display: flex;
  min-height: 100dvh;
  font-family: 'Inter', sans-serif;
  background: #0b0d12;
  color: #e2e8f0;
}

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
  color: #f0fdf9;
}

.panel-copy h1 {
  font-size: clamp(1.9rem, 3vw, 2.6rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.03em;
  color: #f0fdf9;
  margin-bottom: 0.85rem;
}

.panel-copy p {
  font-size: 0.95rem;
  color: rgba(255,255,255,0.48);
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
  color: rgba(255,255,255,0.55);
}

.feat-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(13,148,136,0.15);
  color: #2dd4bf;
  border: 1px solid rgba(13,148,136,0.2);
}

/* Glows decorativos */
.panel-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 1;
}
.panel-glow-1 {
  width: 350px; height: 350px;
  background: radial-gradient(circle, rgba(13,148,136,0.18) 0%, transparent 70%);
  top: -80px; right: -80px;
}
.panel-glow-2 {
  width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%);
  bottom: 60px; left: -60px;
}

/* ── Painel direito — formulário ── */
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
  gap: 1.75rem;
}

.brand-mobile {
  display: none;
}

.form-header h2 {
  font-size: 1.55rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: #f0fdf9;
  margin-bottom: 0.35rem;
}

.form-header p {
  font-size: 0.875rem;
  color: rgba(255,255,255,0.4);
}

/* ── Campos ── */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field-group label {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(255,255,255,0.55);
  letter-spacing: 0.01em;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.input-wrap:focus-within {
  border-color: rgba(13,148,136,0.6);
  box-shadow: 0 0 0 3px rgba(13,148,136,0.12);
}

.input-wrap.input-error {
  border-color: rgba(248,113,113,0.5);
}

.input-icon {
  flex-shrink: 0;
  margin-left: 0.9rem;
  color: rgba(255,255,255,0.28);
  pointer-events: none;
}

.input-wrap input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  padding: 0.8rem 0.9rem;
  font-size: 0.9rem;
  color: #e2e8f0;
  font-family: inherit;
}

.input-wrap input::placeholder { color: rgba(255,255,255,0.22); }

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
  color: rgba(255,255,255,0.3);
  border-radius: 6px;
  transition: color 150ms ease, background 150ms ease;
}

/* ── Corrige autofill do navegador ── */
.input-wrap input:-webkit-autofill,
.input-wrap input:-webkit-autofill:hover,
.input-wrap input:-webkit-autofill:focus,
.input-wrap input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #131519 inset !important;
  -webkit-text-fill-color: #e2e8f0 !important;
  caret-color: #e2e8f0;
  transition: background-color 9999s ease-in-out 0s;
}

.toggle-senha:hover {
  color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.06);
}

.field-error {
  font-size: 0.775rem;
  color: #f87171;
  padding-left: 0.1rem;
}

/* ── Alerta de erro geral ── */
.alert-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  background: rgba(248,113,113,0.08);
  border: 1px solid rgba(248,113,113,0.2);
  font-size: 0.83rem;
  color: #fca5a5;
}

/* ── Botão principal ── */
.btn-primary {
  margin-top: 0.35rem;
  width: 100%;
  padding: 0.85rem;
  border: none;
  border-radius: 10px;
  background: #0d9488;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 180ms ease, transform 100ms ease, box-shadow 180ms ease;
  box-shadow: 0 2px 12px rgba(13,148,136,0.3);
}

.btn-primary:hover:not(:disabled) {
  background: #0f766e;
  box-shadow: 0 4px 20px rgba(13,148,136,0.4);
}

.btn-primary:active:not(:disabled) { transform: translateY(1px); }

.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }

/* ── Link de cadastro ── */
.auth-switch {
  text-align: center;
  font-size: 0.845rem;
  color: rgba(255,255,255,0.35);
}

.auth-switch a {
  color: #2dd4bf;
  text-decoration: none;
  font-weight: 500;
  transition: color 150ms ease;
}

.auth-switch a:hover { color: #5eead4; text-decoration: underline; }

/* ── Responsivo mobile ── */
@media (max-width: 768px) {
  .auth-root { flex-direction: column; }

  .auth-panel { display: none; }

  .brand-mobile { display: flex; justify-content: center; }

  .auth-form-side {
    align-items: flex-start;
    padding: 2.5rem 1.5rem 3rem;
  }

  .auth-form-wrap { max-width: 100%; gap: 1.5rem; }

  .form-header { text-align: center; }
}
</style>