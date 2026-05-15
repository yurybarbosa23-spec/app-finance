<template>
  <div class="ai-chat">
    <div class="mensagens" ref="msgBox">
      <div v-for="(msg, i) in mensagens" :key="i" :class="['msg', msg.papel]">
        <span>{{ msg.texto }}</span>
      </div>
      <div v-if="carregando" class="msg ia">
        <span>{{ respostaAtual }}<span class="cursor">▋</span></span>
      </div>
    </div>

    <form @submit.prevent="enviar" class="input-area">
      <input
        v-model="pergunta"
        placeholder="Pergunte sobre suas finanças..."
        :disabled="carregando"
      />
      <button type="submit" :disabled="carregando || !pergunta.trim()">
        Enviar
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth' // ajuste conforme seu store

const auth = useAuthStore()
const pergunta = ref('')
const mensagens = ref([])
const carregando = ref(false)
const respostaAtual = ref('')
const msgBox = ref(null)

async function enviar() {
  const texto = pergunta.value.trim()
  if (!texto) return

  mensagens.value.push({ papel: 'usuario', texto })
  pergunta.value = ''
  carregando.value = true
  respostaAtual.value = ''

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ mensagem: texto, userId: auth.user.id }),
  })

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    const linhas = chunk.split('\n').filter(l => l.startsWith('data: '))
    for (const linha of linhas) {
      respostaAtual.value += linha.replace('data: ', '')
      await nextTick()
      if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight
    }
  }

  mensagens.value.push({ papel: 'ia', texto: respostaAtual.value })
  respostaAtual.value = ''
  carregando.value = false
}
</script>

<style scoped>
.ai-chat { display: flex; flex-direction: column; height: 500px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
.mensagens { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.msg { max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 14px; }
.msg.usuario { align-self: flex-end; background: #01696f; color: white; }
.msg.ia { align-self: flex-start; background: #f3f0ec; color: #28251d; }
.cursor { animation: pisca 1s infinite; }
@keyframes pisca { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
.input-area { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #ddd; }
.input-area input { flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; outline: none; }
.input-area button { padding: 8px 16px; background: #01696f; color: white; border: none; border-radius: 8px; cursor: pointer; }
.input-area button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>