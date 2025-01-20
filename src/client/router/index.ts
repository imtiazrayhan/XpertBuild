import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue')
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('../views/projects/ProjectList.vue')
  },
  {
    path: '/projects/:id',
    name: 'ProjectDetail',
    component: () => import('../views/projects/ProjectDetail.vue')
  },
  {
    path: '/employees',
    name: 'Employees',
    component: () => import('../views/employees/EmployeeList.vue')
  },
  {
    path: '/expenses',
    name: 'Expenses',
    component: () => import('../views/expenses/ExpenseList.vue')
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})