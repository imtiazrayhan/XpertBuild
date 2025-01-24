import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ProjectsPage from '../views/ProjectsPage.vue'
import ExpensesPage from '../views/ExpensesPage.vue'
import EmployeesPage from '../views/EmployeesPage.vue'
import UnionClassesPage from '../views/UnionClassesPage.vue'
import TimesheetPage from '../views/TimesheetPage.vue'

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
    {
      path: '/employees',
      name: 'employees',
      component: EmployeesPage,
    },
    {
      path: '/union-classes',
      name: 'union-classes',
      component: UnionClassesPage,
    },
    {
      path: '/timesheet',
      name: 'timesheet',
      component: TimesheetPage,
    },
  ],
})

export default router
