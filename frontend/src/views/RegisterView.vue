<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-950">
    <div class="bg-gray-900 p-8 rounded-2xl w-full max-w-sm shadow-xl">
      <h1 class="text-white text-2xl font-bold mb-2">💰 FinanceApp</h1>
      <p class="text-gray-400 text-sm mb-6">Crie sua conta</p>

      <form @submit.prevent="handleCadastro" class="flex flex-col gap-4">
        <input v-model="nome" type="text" placeholder="Seu nome"
          class="bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        <input v-model="email" type="email" placeholder="E-mail"
          class="bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        <input v-model="senha" type="password" placeholder="Senha"
          class="bg-gray-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />

        <p v-if="erro" class="text-red-400 text-sm text-center">{{ erro }}</p>

        <button type="submit" :disabled="loading"
          class="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
          {{ loading ? 'Criando conta...' : 'Criar conta' }}
        </button>
      </form>

      <p class="text-gray-500 text-sm text-center mt-4">
        Já tem conta?
        <RouterLink to="/login" class="text-teal-400 hover:underline">Entrar</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const nome = ref('')
const email = ref('')
const senha = ref('')
const erro = ref('')
const loading = ref(false)

async function handleCadastro() {
  erro.value = ''
  loading.value = true
  try {
    await auth.register(nome.value, email.value, senha.value)
  } catch (e) {
    erro.value = e.response?.data?.erro || 'Erro ao criar conta'
  } finally {
    loading.value = false
  }
}
</script>