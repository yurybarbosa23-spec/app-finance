import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'

export const useItemsStore = defineStore('items', () => {
  const itens = ref([])

  async function carregar() {
    try {
      const res = await api.get('/items')
      itens.value = res.data
    } catch (err) {
      console.error('Erro ao carregar itens:', err)
    }
  }

  async function criar(dados) {
    const res = await api.post('/items', dados)
    itens.value.unshift(res.data)
    return res.data
  }

  async function vender(id, accountId, valor) {
    const res = await api.put(`/items/${id}/vender`, { accountId, valor }) // ← PUT não POST
    const idx = itens.value.findIndex(i => i.id === id)
    if (idx !== -1) itens.value[idx] = res.data
    return res.data
  }

  async function deletar(id) {
    await api.delete(`/items/${id}`)
    itens.value = itens.value.filter(i => i.id !== id)
  }

  return { itens, carregar, criar, vender, deletar }
})