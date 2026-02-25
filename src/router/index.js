import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Stats', component: () => import('../views/StatsView.vue'), meta: { title: '统计' } },
  { path: '/record', name: 'Home', component: () => import('../views/HomeView.vue'), meta: { title: '计时' } },
  { path: '/sessions', name: 'Sessions', component: () => import('../views/SessionsView.vue'), meta: { title: '历史' } },
  { path: '/sessions/new', name: 'SessionNew', component: () => import('../views/SessionNewView.vue'), meta: { title: '添加记录' } },
  { path: '/sessions/:id', name: 'SessionDetail', component: () => import('../views/SessionDetailView.vue'), meta: { title: '记录详情' } },
  { path: '/projects', name: 'Projects', component: () => import('../views/ProjectsView.vue'), meta: { title: '项目' } },
  { path: '/help', name: 'Help', component: () => import('../views/HelpView.vue'), meta: { title: '说明' } },
  { path: '/stats', name: 'StatsRedirect', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 极简时间记录` : '极简时间记录'
})

export default router
