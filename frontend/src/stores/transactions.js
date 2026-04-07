import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useAccountsStore } from './accounts'

export const useTransactionsStore = defineStore('transactions', () => {
  const transacoes = ref([])

  async function carregar() {
    const res = await api.get('/transactions')
    transacoes.value = res.data
  }

  async function criar(dados) {
    await api.post('/transactions', dados)
    await carregar()
    await useAccountsStore().carregar()
  }

  async function deletar(id) {
    await api.delete(`/transactions/${id}`)
    await carregar()
    await useAccountsStore().carregar()
  }

  return { transacoes, carregar, criar, deletar }
})