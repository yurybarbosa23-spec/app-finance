import axios from 'axios'
import { Capacitor } from '@capacitor/core'

// Em ambiente nativo (Capacitor), SEMPRE usar URL absoluta do backend.
// O proxy do Vite só funciona no browser durante desenvolvimento.
function resolveBaseURL() {
  const envUrl = import.meta.env.VITE_API_URL

  // Se a variável de ambiente está definida, usar ela
  if (envUrl) {
    return `${envUrl}/api`
  }

  // Se está rodando como app nativo, usar IP fixo do servidor
  if (Capacitor.isNativePlatform()) {
    return 'http://192.168.100.130:3000/api'
  }

  // No browser (dev com Vite), o proxy cuida do redirecionamento
  return '/api'
}

const api = axios.create({
  baseURL: resolveBaseURL(),
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token && token !== 'undefined' && token !== 'null') {
      if (!config.headers) {
        config.headers = {}
      }
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Log discreto no console ao invés de alert bloqueante
    console.error('[API Error]', error.message, error.config?.baseURL, error.config?.url)
    if (error.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api