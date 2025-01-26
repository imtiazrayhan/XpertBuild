<!-- ExpensesTab.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
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
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const props = defineProps<{
  projectId: string
}>()

interface Expense {
  id: string
  amount: number
  date: string
  description: string
  category: 'MATERIAL' | 'TOOLS' | 'RENTALS' | 'OPERATIONAL'
  type: 'GENERAL' | 'PROJECT'
  vendor?: string
  recurring: boolean
}

const expenses = ref<Expense[]>([])
const showExpenseModal = ref(false)
const isEditing = ref(false)
const selectedExpense = ref<Expense | null>(null)

const searchQuery = ref('')
const selectedCategory = ref('')
const dateRange = ref({
  start: '',
  end: '',
})

const categories = ['MATERIAL', 'TOOLS', 'RENTALS', 'OPERATIONAL']

const newExpense = ref({
  amount: 0,
  date: '',
  description: '',
  category: 'MATERIAL',
  vendor: '',
  recurring: false,
})

// Fetch project expenses
const fetchExpenses = async () => {
  try {
    const response = await fetch(`/api/projects/${props.projectId}/expenses`)
    expenses.value = await response.json()
  } catch (error) {
    console.error('Error fetching expenses:', error)
  }
}

// Filters
const filteredExpenses = computed(() => {
  return expenses.value.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (expense.vendor?.toLowerCase().includes(searchQuery.value.toLowerCase()) ?? false)
    const matchesCategory = !selectedCategory.value || expense.category === selectedCategory.value
    const matchesDateRange =
      (!dateRange.value.start || new Date(expense.date) >= new Date(dateRange.value.start)) &&
      (!dateRange.value.end || new Date(expense.date) <= new Date(dateRange.value.end))

    return matchesSearch && matchesCategory && matchesDateRange
  })
})

// Overview Calculations
const totalAmount = computed(() => {
  return filteredExpenses.value.reduce((sum, expense) => sum + expense.amount, 0)
})

const expensesByCategory = computed(() => {
  return categories.map((category) => ({
    category,
    amount: filteredExpenses.value
      .filter((expense) => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }))
})

const monthlyTrends = computed(() => {
  const trends = new Map()

  filteredExpenses.value.forEach((expense) => {
    const month = new Date(expense.date).toLocaleString('default', {
      month: 'short',
      year: 'numeric',
    })
    if (!trends.has(month)) {
      trends.set(month, { total: 0 })
    }
    trends.get(month).total += expense.amount
  })

  return Array.from(trends.entries())
    .map(([month, data]) => ({
      month,
      total: data.total,
    }))
    .sort((a, b) => new Date(a.month) - new Date(b.month))
    .slice(-6)
})

// Modal Operations
const openCreateModal = () => {
  isEditing.value = false
  resetExpenseForm()
  showExpenseModal.value = true
}

const openEditModal = (expense: Expense) => {
  isEditing.value = true
  selectedExpense.value = expense
  newExpense.value = {
    ...expense,
    date: new Date(expense.date).toISOString().split('T')[0],
  }
  showExpenseModal.value = true
}

const resetExpenseForm = () => {
  newExpense.value = {
    amount: 0,
    date: '',
    description: '',
    category: 'MATERIAL',
    vendor: '',
    recurring: false,
  }
  selectedExpense.value = null
}

// CRUD Operations
const saveExpense = async () => {
  try {
    const url =
      '/api/expenses' +
      (isEditing.value && selectedExpense.value ? `/${selectedExpense.value.id}` : '')
    const method = isEditing.value ? 'PUT' : 'POST'

    const data = {
      ...newExpense.value,
      projectId: props.projectId,
      type: 'PROJECT',
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      showExpenseModal.value = false
      await fetchExpenses()
      resetExpenseForm()
    }
  } catch (error) {
    console.error('Error saving expense:', error)
  }
}

const deleteExpense = async (id: string) => {
  if (!confirm('Are you sure you want to delete this expense?')) return

  try {
    const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (response.ok) {
      await fetchExpenses()
    }
  } catch (error) {
    console.error('Error deleting expense:', error)
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = ''
  dateRange.value = { start: '', end: '' }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US')
}

onMounted(fetchExpenses)
</script>

<template>
  <div class="px-6 py-6">
    <!-- Overview Cards -->
    <div class="grid grid-cols-5 gap-4 mt-6 mb-6">
      <div class="bg-white border border-gray-300 p-6 rounded-lg shadow-sm">
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Expenses</h3>
        <p class="text-2xl font-bold mt-2">{{ formatCurrency(totalAmount) }}</p>
      </div>
      <div
        v-for="categoryStats in expensesByCategory"
        :key="categoryStats.category"
        class="bg-white border border-gray-300 p-4 rounded-lg shadow-sm"
      >
        <h3 class="text-sm font-medium text-gray-500">{{ categoryStats.category }}</h3>
        <p class="text-2xl font-bold mt-2">{{ formatCurrency(categoryStats.amount) }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg p-6 shadow-sm space-y-4">
      <div class="grid grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Search</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search expenses..."
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Category</label>
          <select
            v-model="selectedCategory"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">All Categories</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            v-model="dateRange.start"
            type="date"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">End Date</label>
          <input
            v-model="dateRange.end"
            type="date"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <div class="flex justify-between">
        <button @click="clearFilters" class="text-gray-600 hover:text-gray-900 flex items-center">
          <XMarkIcon class="w-4 h-4 mr-1" />
          Clear Filters
        </button>
        <button
          @click="openCreateModal"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Expense
        </button>
      </div>
    </div>

    <!-- Expenses Table -->
    <div class="bg-white rounded-lg shadow-sm mb-6">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr class="bg-gray-50">
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Description
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Category
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="expense in filteredExpenses"
            :key="expense.id"
            :class="['hover:bg-gray-50', expense.recurring ? 'bg-blue-50' : '']"
          >
            <td class="px-6 py-4">{{ formatDate(expense.date) }}</td>
            <td class="px-6 py-4">
              {{ expense.description }}
              <span
                v-if="expense.recurring"
                class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
              >
                Recurring
              </span>
            </td>
            <td class="px-6 py-4 font-medium">{{ formatCurrency(expense.amount) }}</td>
            <td class="px-6 py-4">
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="{
                  'bg-green-100 text-green-800': expense.category === 'MATERIAL',
                  'bg-blue-100 text-blue-800': expense.category === 'TOOLS',
                  'bg-purple-100 text-purple-800': expense.category === 'RENTALS',
                  'bg-orange-100 text-orange-800': expense.category === 'OPERATIONAL',
                }"
              >
                {{ expense.category }}
              </span>
            </td>
            <td class="px-6 py-4">{{ expense.vendor || '-' }}</td>
            <td class="px-6 py-4">
              <div class="flex justify-end space-x-3">
                <button @click="openEditModal(expense)" class="text-blue-600 hover:text-blue-900">
                  <PencilIcon class="h-5 w-5" />
                </button>
                <button @click="deleteExpense(expense.id)" class="text-red-600 hover:text-red-900">
                  <TrashIcon class="h-5 w-5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Monthly Trend Chart -->
    <!-- Monthly Trend Chart -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h3 class="text-lg font-medium mb-4">Monthly Expense Trend</h3>
      <div class="h-64">
        <Line
          :data="{
            labels: monthlyTrends.map((t) => t.month),
            datasets: [
              {
                label: 'Total Expenses',
                data: monthlyTrends.map((t) => t.total),
                borderColor: '#3B82F6',
                tension: 0.1,
              },
            ],
          }"
          :options="{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: {
                callbacks: {
                  label: (context) => formatCurrency(context.raw),
                },
              },
            },
          }"
        />
      </div>
    </div>

    <!-- Expense Modal -->
    <div
      v-if="showExpenseModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">{{ isEditing ? 'Edit' : 'New' }} Expense</h2>
          <button @click="showExpenseModal = false" class="text-gray-500 hover:text-gray-700">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="saveExpense" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Amount</label>
              <input
                v-model="newExpense.amount"
                type="number"
                step="0.01"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Date</label>
              <input
                v-model="newExpense.date"
                type="date"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700">Description</label>
              <input
                v-model="newExpense.description"
                type="text"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Category</label>
              <select
                v-model="newExpense.category"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option v-for="category in categories" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Vendor</label>
              <input
                v-model="newExpense.vendor"
                type="text"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div class="col-span-2">
              <label class="flex items-center space-x-2">
                <input
                  v-model="newExpense.recurring"
                  type="checkbox"
                  class="rounded border-gray-300"
                />
                <span class="text-sm font-medium text-gray-700">Recurring Expense</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showExpenseModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {{ isEditing ? 'Save Changes' : 'Create Expense' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
