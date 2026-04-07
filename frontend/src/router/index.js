import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import LoginView     from '../views/LoginView.vue'
import RegisterView  from '../views/RegisterView.vue'
import DashboardView from '../views/Dashboardview.vue'   // ← 'v' minúsculo — igual ao nome real do arquivo
import AdminView     from '../views/AdminView.vue'

const routes = [
  { path: '/',          redirect: '/login' },
  { path: '/login',     component: LoginView },
  { path: '/cadastro',  component: RegisterView },
  { path: '/dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/admin',     component: AdminView,     meta: { requiresAuth: true, requiresAdmin: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth  && !auth.logado)   return next('/login')
  if (to.meta.requiresAdmin && !auth.isAdmin)  return next('/dashboard')
  next()
})

export default router