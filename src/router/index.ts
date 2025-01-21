import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ProjectsPage from '../views/ProjectsPage.vue'
import ExpensesPage from '../views/ExpensesPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/projects',
      name: 'projects',
      component: ProjectsPage,
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: ExpensesPage,
    },
  ],
})

export default router
