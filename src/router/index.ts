import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/location',
      name: 'location',
      component: () => import('../views/LocationView.vue'),
    },
    {
      path: '/monitor',
      name: 'monitor',
      component: () => import('../views/MonitorConfigView.vue'),
    },
    {
      path: '/notify-history',
      name: 'notify-history',
      component: () => import('../views/NotifyHistoryView.vue'),
    },
    {
      path: '/store-inventory',
      name: 'store-inventory',
      component: () => import('../views/StoreInventoryHistoryView.vue'),
    },
    {
      path: '/s/:token/:id',
      name: 'pushed-history',
      component: () => import('../views/PushedHistoryView.vue'),
      meta: { hideNav: true },
    },
  ],
})

export default router

// 路由变化后同步更新 NavBar 显示状态
router.afterEach((to) => {
  const el = document.getElementById('app')
  if (el) {
    if (to.meta.hideNav) {
      el.setAttribute('data-hide-nav', 'true')
    } else {
      el.removeAttribute('data-hide-nav')
    }
  }
})
