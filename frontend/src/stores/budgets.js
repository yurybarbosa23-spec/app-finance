import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'

export const useBudgetsStore = defineStore('budgets', () => {
  const budgets = ref([])

  async function carregar() {
    const res = await api.get('/budgets')
    budgets.value = res.data
  }

  async function salvar(dados) {
    await api.post('/budgets', dados)
    await carregar()
  }

  async function atualizar(id, dados) {
    await api.put(`/budgets/${id}`, dados)
    await carregar()
  }

  async function deletar(id) {
    await api.delete(`/budgets/${id}`)
    budgets.value = budgets.value.filter(b => b.id !== id)
  }

  // Retorna só os alertas ativos que já ultrapassaram o limite
  const alertasAtivos = () =>
    budgets.value.filter(b => b.ativo && b.gastoAtual >= b.limite)

  // Retorna alertas que ultrapassaram 70% (aviso antecipado)
  const alertasAviso = () =>
    budgets.value.filter(b => b.ativo && b.gastoAtual >= b.limite * 0.7 && b.gastoAtual < b.limite)

  return { budgets, carregar, salvar, atualizar, deletar, alertasAtivos, alertasAviso }
})