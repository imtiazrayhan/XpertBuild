<!-- DashboardPage.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  BriefcaseIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  UsersIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface Project {
  id: string
  name: string
  contractValue: number
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'
  client: string
}

interface TimeEntry {
  id: number
  regularHours: number
  overtimeHours: number
  employee: {
    employeeType: 'LOCAL' | 'UNION'
  }
}

interface Expense {
  id: string
  amount: number
  category: string
  date: string
}

const projects = ref<Project[]>([])
const timeEntries = ref<TimeEntry[]>([])
const expenses = ref<Expense[]>([])
const totalActiveWorkers = ref(0)

const projectMetrics = computed(() => {
  const total = projects.value.length
  const statuses = projects.value.reduce(
    (acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const totalValue = projects.value.reduce((sum, p) => sum + p.contractValue, 0)

  return {
    total,
    statuses,
    totalValue,
  }
})

const laborMetrics = computed(() => {
  const regularHours = timeEntries.value.reduce((sum, entry) => sum + entry.regularHours, 0)
  const overtimeHours = timeEntries.value.reduce((sum, entry) => sum + entry.overtimeHours, 0)

  const localWorkers = timeEntries.value.filter((e) => e.employee.employeeType === 'LOCAL').length
  const unionWorkers = timeEntries.value.filter((e) => e.employee.employeeType === 'UNION').length

  return {
    regularHours,
    overtimeHours,
    localWorkers,
    unionWorkers,
    totalHours: regularHours + overtimeHours,
  }
})

const expenseMetrics = computed(() => {
  const totalAmount = expenses.value.reduce((sum, exp) => sum + exp.amount, 0)

  const byCategory = expenses.value.reduce(
    (acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount
      return acc
    },
    {} as Record<string, number>,
  )

  return {
    totalAmount,
    byCategory,
  }
})

const fetchDashboardData = async () => {
  try {
    const [projectsRes, timeEntriesRes, expensesRes, workersRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/time-entries/current-week'),
      fetch('/api/expenses/recent'),
      fetch('/api/employees/active'),
    ])

    projects.value = await projectsRes.json()
    timeEntries.value = await timeEntriesRes.json()
    expenses.value = await expensesRes.json()
    totalActiveWorkers.value = await workersRes.json()
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

onMounted(fetchDashboardData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold">Dashboard</h1>
      <p class="text-gray-600">Project and Operations Overview</p>
    </div>

    <!-- Project Metrics -->
    <div class="grid grid-cols-4 gap-4">
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Active Projects</p>
            <p class="mt-1 text-3xl font-semibold text-gray-900">
              {{ projectMetrics.statuses['IN_PROGRESS'] || 0 }}
            </p>
          </div>
          <div class="p-3 bg-blue-50 rounded-lg">
            <BriefcaseIcon class="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <p class="mt-1 text-sm text-gray-600">{{ projectMetrics.total }} total projects</p>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Contract Value</p>
            <p class="mt-1 text-3xl font-semibold text-gray-900">
              {{ formatCurrency(projectMetrics.totalValue) }}
            </p>
          </div>
          <div class="p-3 bg-green-50 rounded-lg">
            <ArrowTrendingUpIcon class="w-6 h-6 text-green-600" />
          </div>
        </div>
        <p class="mt-1 text-sm text-gray-600">Across all active projects</p>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Weekly Hours</p>
            <p class="mt-1 text-3xl font-semibold text-gray-900">
              {{ laborMetrics.totalHours }}
            </p>
          </div>
          <div class="p-3 bg-purple-50 rounded-lg">
            <ClockIcon class="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <p class="mt-1 text-sm text-gray-600">{{ laborMetrics.overtimeHours }} overtime hours</p>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Active Workers</p>
            <p class="mt-1 text-3xl font-semibold text-gray-900">
              {{ totalActiveWorkers }}
            </p>
          </div>
          <div class="p-3 bg-orange-50 rounded-lg">
            <UsersIcon class="w-6 h-6 text-orange-600" />
          </div>
        </div>
        <p class="mt-1 text-sm text-gray-600">
          {{ laborMetrics.localWorkers }} local, {{ laborMetrics.unionWorkers }} union
        </p>
      </div>
    </div>

    <!-- Project Status Distribution -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-white p-6 rounded-lg shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium">Projects by Status</h3>
          <router-link to="/projects" class="text-gray-600 hover:text-gray-900">
            <ArrowRightIcon class="w-5 h-5" />
          </router-link>
        </div>
        <div class="space-y-4">
          <div
            v-for="(count, status) in projectMetrics.statuses"
            :key="status"
            class="flex items-center"
          >
            <span class="w-24 text-sm text-gray-600">{{
              status
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
            }}</span>
            <div class="flex-1 ml-4">
              <div class="h-2 bg-gray-100 rounded-full">
                <div
                  class="h-2 rounded-full"
                  :style="{
                    width: `${(count / projectMetrics.total) * 100}%`,
                  }"
                  :class="{
                    'bg-yellow-400': status === 'PLANNING',
                    'bg-blue-400': status === 'IN_PROGRESS',
                    'bg-green-400': status === 'COMPLETED',
                    'bg-gray-400': status === 'ON_HOLD',
                  }"
                ></div>
              </div>
            </div>
            <span class="ml-4 text-sm font-medium">{{ count }}</span>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium">Recent Expenses</h3>
          <router-link to="/expenses" class="text-gray-600 hover:text-gray-900">
            <ArrowRightIcon class="w-5 h-5" />
          </router-link>
        </div>
        <div class="space-y-3">
          <div
            v-for="category in Object.keys(expenseMetrics.byCategory)"
            :key="category"
            class="flex justify-between items-center"
          >
            <span class="text-sm text-gray-600">{{ category }}</span>
            <span class="font-medium">{{
              formatCurrency(expenseMetrics.byCategory[category])
            }}</span>
          </div>
          <div class="pt-2 border-t">
            <div class="flex justify-between items-center font-medium">
              <span>Total</span>
              <span>{{ formatCurrency(expenseMetrics.totalAmount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Project List -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium">Active Projects</h3>
      </div>
      <div class="divide-y divide-gray-200">
        <router-link
          v-for="project in projects.filter((p) => p.status === 'IN_PROGRESS')"
          :key="project.id"
          :to="{ name: 'project-details', params: { id: project.id } }"
          class="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <div>
            <div class="font-medium">{{ project.name }}</div>
            <div class="text-sm text-gray-600">{{ project.client }}</div>
          </div>
          <div class="text-right">
            <div class="font-medium">{{ formatCurrency(project.contractValue) }}</div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>
