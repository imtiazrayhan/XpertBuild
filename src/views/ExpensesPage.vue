<!-- ExpensesPage.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'

interface Expense {
  id: string
  amount: number
  date: string
  description: string
  category: 'MATERIAL' | 'TOOLS' | 'RENTALS' | 'OPERATIONAL'
  type: 'GENERAL' | 'PROJECT'
  vendor?: string
  projectId?: string
  recurring: boolean
  project?: {
    name: string
  }
}

interface Project {
  id: string
  name: string
}

const expenses = ref<Expense[]>([])
const projects = ref<Project[]>([])
const currentPage = ref(1)
const itemsPerPage = 10
const selectedExpenses = ref<Set<string>>(new Set())
const showExpenseModal = ref(false)
const isEditing = ref(false)

const searchQuery = ref('')
const selectedProject = ref('')
const selectedCategory = ref('')
const dateRange = ref({
  start: '',
  end: '',
})

const categories = ['MATERIAL', 'TOOLS', 'RENTALS', 'OPERATIONAL']
const types = ['GENERAL', 'PROJECT']

const newExpense = ref({
  amount: 0,
  date: '',
  description: '',
  category: 'MATERIAL',
  type: 'GENERAL',
  vendor: '',
  projectId: '',
  recurring: false,
})

// Fetch Data
const fetchExpenses = async () => {
  try {
    const response = await fetch('/api/expenses')
    expenses.value = await response.json()
  } catch (error) {
    console.error('Error fetching expenses:', error)
  }
}

const fetchProjects = async () => {
  try {
    const response = await fetch('/api/projects')
    projects.value = await response.json()
  } catch (error) {
    console.error('Error fetching projects:', error)
  }
}

// Filters
const filteredExpenses = computed(() => {
  return expenses.value.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (expense.vendor?.toLowerCase().includes(searchQuery.value.toLowerCase()) ?? false)
    const matchesProject = !selectedProject.value || expense.projectId === selectedProject.value
    const matchesCategory = !selectedCategory.value || expense.category === selectedCategory.value
    const matchesDateRange =
      (!dateRange.value.start || new Date(expense.date) >= new Date(dateRange.value.start)) &&
      (!dateRange.value.end || new Date(expense.date) <= new Date(dateRange.value.end))

    return matchesSearch && matchesProject && matchesCategory && matchesDateRange
  })
})

// Pagination
const totalPages = computed(() => Math.ceil(filteredExpenses.value.length / itemsPerPage))
const paginatedExpenses = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredExpenses.value.slice(start, end)
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

// Modal Operations
const openCreateModal = () => {
  isEditing.value = false
  resetExpenseForm()
  showExpenseModal.value = true
}

const openEditModal = (expense: Expense) => {
  isEditing.value = true
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
    type: 'GENERAL',
    vendor: '',
    projectId: '',
    recurring: false,
  }
}

// CRUD Operations
const saveExpense = async () => {
  try {
    const url = '/api/expenses' + (isEditing.value ? `/${newExpense.value.id}` : '')
    const method = isEditing.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpense.value),
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

const deleteExpenses = async () => {
  if (!confirm('Are you sure you want to delete the selected expenses?')) return

  try {
    const deletePromises = Array.from(selectedExpenses.value).map((id) =>
      fetch(`/api/expenses/${id}`, { method: 'DELETE' }),
    )

    await Promise.all(deletePromises)
    await fetchExpenses()
    selectedExpenses.value.clear()
  } catch (error) {
    console.error('Error deleting expenses:', error)
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedProject.value = ''
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

onMounted(() => {
  fetchExpenses()
  fetchProjects()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Expenses</h1>
        <p class="text-gray-600">Track and manage project expenses</p>
      </div>
      <div class="flex space-x-3">
        <button
          v-if="selectedExpenses.size > 0"
          @click="deleteExpenses"
          class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
        >
          <TrashIcon class="w-5 h-5 mr-2" />
          Delete Selected ({{ selectedExpenses.size }})
        </button>
        <button
          @click="openCreateModal"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Expense
        </button>
      </div>
    </div>

    <!-- Overview Cards -->
    <div class="grid grid-cols-5 gap-4">
      <div
        class="bg-white p-6 rounded-lg shadow-sm border border-gray-100 transform transition-transform duration-200 hover:scale-105 hover:shadow-md"
      >
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Expenses</h3>
        <p class="text-2xl font-bold mt-2 text-gray-900 tracking-tight">
          {{ formatCurrency(totalAmount) }}
        </p>
      </div>
      <div
        v-for="categoryStats in expensesByCategory"
        :key="categoryStats.category"
        class="bg-white p-4 rounded-lg shadow-sm"
      >
        <h3 class="text-sm font-medium text-gray-500">{{ categoryStats.category }}</h3>
        <p class="text-2xl font-bold mt-2">{{ formatCurrency(categoryStats.amount) }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg p-6 shadow-sm space-y-4">
      <div class="grid grid-cols-5 gap-4">
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
          <label class="block text-sm font-medium text-gray-700">Project</label>
          <select
            v-model="selectedProject"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">All Projects</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
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

      <div class="flex justify-end">
        <button @click="clearFilters" class="text-gray-600 hover:text-gray-900 flex items-center">
          <XMarkIcon class="w-4 h-4 mr-1" />
          Clear Filters
        </button>
      </div>
    </div>

    <!-- Expenses Table -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="bg-gray-50 border-b">
              <th class="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  :checked="selectedExpenses.size === paginatedExpenses.length"
                  @change="
                    (e) => {
                      if (e.target.checked) {
                        paginatedExpenses.forEach((exp) => selectedExpenses.add(exp.id))
                      } else {
                        selectedExpenses.clear()
                      }
                    }
                  "
                  class="rounded border-gray-300"
                />
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Vendor
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Project
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="expense in paginatedExpenses"
              :key="expense.id"
              :class="['hover:bg-gray-50', expense.recurring ? 'bg-blue-50' : '']"
            >
              <td class="px-6 py-4">
                <input
                  type="checkbox"
                  :checked="selectedExpenses.has(expense.id)"
                  @change="
                    (e) => {
                      if (e.target.checked) {
                        selectedExpenses.add(expense.id)
                      } else {
                        selectedExpenses.delete(expense.id)
                      }
                    }
                  "
                  class="rounded border-gray-300"
                />
              </td>
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
              <td class="px-6 py-4">{{ expense.type }}</td>
              <td class="px-6 py-4">{{ expense.vendor || '-' }}</td>
              <td class="px-6 py-4">{{ expense.project?.name || '-' }}</td>
              <td class="px-6 py-4">
                <button @click="openEditModal(expense)" class="text-gray-600 hover:text-gray-900">
                  <PencilIcon class="w-5 h-5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="px-6 py-4 flex items-center justify-between border-t">
        <div class="text-sm text-gray-500">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
          {{ Math.min(currentPage * itemsPerPage, filteredExpenses.length) }}
          of {{ filteredExpenses.length }} expenses
        </div>
        <div class="flex space-x-2">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-3 py-1 rounded border"
            :class="currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50'"
          >
            Previous
          </button>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 rounded border"
            :class="currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50'"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Expense Modal -->
    <div
      v-if="showExpenseModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
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
              <label class="block text-sm font-medium text-gray-700">Type</label>
              <select
                v-model="newExpense.type"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option v-for="type in types" :key="type" :value="type">
                  {{ type }}
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
            <div>
              <label class="block text-sm font-medium text-gray-700">Project</label>
              <select
                v-model="newExpense.projectId"
                :required="newExpense.type === 'PROJECT'"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">No Project</option>
                <option v-for="project in projects" :key="project.id" :value="project.id">
                  {{ project.name }}
                </option>
              </select>
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
