import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useAccountsStore } from './accounts'
import { useTransactionsStore } from './transactions'

export const useBillsStore = defineStore('bills', () => {
  const bills = ref([])

  async function carregar() {
    const res = await api.get('/bills')
    bills.value = res.data
  }

  async function criar(dados) {
    await api.post('/bills', dados)
    await carregar()
  }

  async function atualizar(id, dados) {
    await api.put(`/bills/${id}`, dados)
    await carregar()
  }

  async function pagar(id, accountId, registrarTransacao = true) {
    const bill = bills.value.find(b => b.id === id)
    if (!bill) return

    // 1. Opcionalmente registrar a transação no extrato e debitar da conta
    if (registrarTransacao && accountId) {
      const txStore = useTransactionsStore()
      await txStore.criar({
        tipo: 'despesa',
        categoria: 'contas',
        descricao: `Pagamento: ${bill.descricao}`,
        valor: bill.valor,
        accountId: accountId,
        data: new Date().toISOString().split('T')[0]
      })
    }

    // 2. Marcar a conta como paga
    await api.post(`/bills/${id}/pagar`)
    await carregar()
    await useAccountsStore().carregar()
  }

  async function estornar(id) {
    await api.post(`/bills/${id}/estornar`)
    await carregar()
    await useAccountsStore().carregar()
  }

  async function deletar(id) {
    await api.delete(`/bills/${id}`)
    bills.value = bills.value.filter(b => b.id !== id)
  }

  return { bills, carregar, criar, atualizar, pagar, estornar, deletar }
})
