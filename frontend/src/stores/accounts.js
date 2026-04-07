import { defineStore } from 'pinia'
import api from '../services/api'

export const useAccountsStore = defineStore('accounts', {
  state: () => ({
    contas: [],
  }),

  getters: {
    saldoTotal: (state) =>
      state.contas.reduce((total, conta) => total + Number(conta.saldo), 0),
  },

  actions: {
    async carregar() {
      try {
        const res = await api.get('/accounts')
        this.contas = res.data
      } catch (err) {
        console.error('Erro ao carregar contas:', err)
      }
    },

    async criar(dados) {
      try {
        const res = await api.post('/accounts', dados)
        this.contas.push(res.data)
      } catch (err) {
        console.error('Erro ao criar conta:', err)
        throw err
      }
    },

    async atualizar(id, dados) {
      try {
        const res = await api.put(`/accounts/${id}`, dados)
        const idx = this.contas.findIndex(c => c.id === id)
        if (idx !== -1) this.contas[idx] = res.data
      } catch (err) {
        console.error('Erro ao atualizar conta:', err)
        throw err
      }
    },

    async deletar(id) {
      try {
        await api.delete(`/accounts/${id}`)
        this.contas = this.contas.filter(c => c.id !== id)
      } catch (err) {
        console.error('Erro ao deletar conta:', err)
        throw err
      }
    },
  },
})