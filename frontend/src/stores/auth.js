import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'
import router from '../router'

export const useAuthStore = defineStore('auth', () => {
  function lerToken() {
    try {
      const t = localStorage.getItem('token')
      if (!t || t === 'undefined' || t === 'null') return ''
      return t
    } catch { return '' }
  }

  function lerUser() {
    try {
      const raw = localStorage.getItem('user')
      if (!raw || raw === 'undefined' || raw === 'null') return null
      return JSON.parse(raw)
    } catch { return null }
  }

  const token = ref(lerToken())
  const user  = ref(lerUser())

  const nome    = computed(() => user.value?.nome  || '')
  const logado  = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.isAdmin || false)

  function salvarSessao(t, u) {
    token.value = t
    user.value  = u
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
  }

  function limparSessao() {
    token.value = ''
    user.value  = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function login(email, senha) {
    const res = await api.post('/auth/login', { email, senha })
    const { token: t, user: u } = res.data
    salvarSessao(t, u)
    router.push(u.isAdmin ? '/admin' : '/dashboard')
  }

  async function register(nome, email, senha) {
    const res = await api.post('/auth/register', { nome, email, senha })
    const { token: t, user: u } = res.data
    salvarSessao(t, u)
    router.push(u.isAdmin ? '/admin' : '/dashboard')
  }

  function logout() {
    limparSessao()
    router.push('/login')
  }

  return { token, user, nome, logado, isAdmin, login, register, logout }
})