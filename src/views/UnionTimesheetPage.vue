# UnionTimesheetPage.vue
<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { XMarkIcon, PlusIcon } from '@heroicons/vue/24/outline'

interface UnionEmployee {
  id: number
  firstName: string
  lastName: string
  unionClassId: number
  unionClass: {
    name: string
  }
}

interface Project {
  id: string
  name: string
}

interface UnionRate {
  regularRate: number
  overtimeRate: number
  benefitsRate: number
  effectiveDate: string
  endDate: string | null
}

interface TimeEntry {
  id: number
  employeeId: number
  projectId: string
  date: string
  regularHours: number
  overtimeHours: number
  paymentStatus: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED'
  calculatedPay: {
    regularPay: number
    overtimePay: number
    benefitsPay: number
    totalPay: number
  }
}

interface WeeklyTimesheet {
  weekNumber: number
  yearNumber: number
  startDate: string
  endDate: string
  regularHours: number
  overtimeHours: number
  totalRegularPay: number
  totalOvertimePay: number
  totalBenefitsPay: number
  totalPay: number
  paymentStatus: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED'
  entries: TimeEntry[]
}

const employees = ref<UnionEmployee[]>([])
const projects = ref<Project[]>([])
const weeklyTimesheets = ref<WeeklyTimesheet[]>([])
const selectedEmployee = ref<number>()
const showEntryModal = ref(false)

const newEntry = ref({
  employeeId: 0,
  projectId: '',
  date: '',
  regularHours: 0,
  overtimeHours: 0,
})

const fetchEmployees = async () => {
  try {
    const response = await fetch('/api/employees?type=UNION')
    employees.value = await response.json()
  } catch (error) {
    console.error('Error fetching employees:', error)
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

const fetchTimesheets = async () => {
  if (!selectedEmployee.value) return

  try {
    const response = await fetch(`/api/timesheets/union/${selectedEmployee.value}`)
    weeklyTimesheets.value = await response.json()
  } catch (error) {
    console.error('Error fetching timesheets:', error)
  }
}

const createTimeEntry = async () => {
  try {
    const response = await fetch('/api/timesheets/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newEntry.value,
        type: 'UNION',
      }),
    })

    if (response.ok) {
      showEntryModal.value = false
      await fetchTimesheets()
      resetEntryForm()
    }
  } catch (error) {
    console.error('Error creating time entry:', error)
  }
}

const markWeekPaid = async (weekNumber: number, yearNumber: number) => {
  try {
    await fetch('/api/timesheets/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekNumber, yearNumber, employeeId: selectedEmployee.value }),
    })
    await fetchTimesheets()
  } catch (error) {
    console.error('Error marking week as paid:', error)
  }
}

const resetEntryForm = () => {
  newEntry.value = {
    employeeId: selectedEmployee.value || 0,
    projectId: '',
    date: '',
    regularHours: 0,
    overtimeHours: 0,
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const calculateOutstandingBalance = computed(() => {
  return weeklyTimesheets.value
    .filter((week) => week.paymentStatus === 'PENDING')
    .reduce((total, week) => total + week.totalPay, 0)
})

onMounted(() => {
  fetchEmployees()
  fetchProjects()
})

watch(selectedEmployee, () => {
  fetchTimesheets()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Union Employee Timesheet</h1>
        <p class="text-gray-600">Manage union employee time entries and payments</p>
      </div>
      <button
        @click="showEntryModal = true"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        :disabled="!selectedEmployee"
      >
        <PlusIcon class="w-5 h-5 mr-2" />
        New Time Entry
      </button>
    </div>

    <!-- Employee Selection -->
    <div class="bg-white rounded-lg p-6 shadow-sm">
      <label class="block text-sm font-medium text-gray-700">Select Employee</label>
      <select
        v-model="selectedEmployee"
        class="mt-1 block w-64 rounded-md border border-gray-300 px-3 py-2"
      >
        <option value="">Select an employee</option>
        <option v-for="emp in employees" :key="emp.id" :value="emp.id">
          {{ emp.firstName }} {{ emp.lastName }} ({{ emp.unionClass.name }})
        </option>
      </select>
    </div>

    <!-- Outstanding Balance Card -->
    <div v-if="selectedEmployee" class="bg-white rounded-lg p-6 shadow-sm">
      <h2 class="text-lg font-semibold mb-2">Outstanding Balance</h2>
      <p class="text-3xl font-bold text-blue-600">
        {{ formatCurrency(calculateOutstandingBalance) }}
      </p>
    </div>

    <!-- Weekly Timesheets -->
    <div v-if="selectedEmployee" class="space-y-4">
      <div
        v-for="week in weeklyTimesheets"
        :key="`${week.weekNumber}-${week.yearNumber}`"
        class="bg-white rounded-lg shadow-sm"
      >
        <div class="p-4 border-b flex justify-between items-center">
          <div>
            <h3 class="font-semibold">
              Week {{ week.weekNumber }} ({{ week.startDate }} - {{ week.endDate }})
            </h3>
            <div class="text-sm text-gray-600 space-y-1">
              <p>
                Regular Hours: {{ week.regularHours }} | Overtime Hours: {{ week.overtimeHours }}
              </p>
              <p>Regular Pay: {{ formatCurrency(week.totalRegularPay) }}</p>
              <p>Overtime Pay: {{ formatCurrency(week.totalOvertimePay) }}</p>
              <p>Benefits: {{ formatCurrency(week.totalBenefitsPay) }}</p>
              <p class="font-medium">Total: {{ formatCurrency(week.totalPay) }}</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span
              :class="{
                'bg-yellow-100 text-yellow-800': week.paymentStatus === 'PENDING',
                'bg-blue-100 text-blue-800': week.paymentStatus === 'PROCESSING',
                'bg-green-100 text-green-800': week.paymentStatus === 'PAID',
                'bg-red-100 text-red-800': week.paymentStatus === 'CANCELLED',
              }"
              class="px-3 py-1 rounded-full text-sm font-medium"
            >
              {{ week.paymentStatus }}
            </span>
            <button
              v-if="week.paymentStatus === 'PENDING'"
              @click="markWeekPaid(week.weekNumber, week.yearNumber)"
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark as Paid
            </button>
          </div>
        </div>

        <div class="p-4">
          <table class="min-w-full">
            <thead>
              <tr class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th class="px-4 py-2">Date</th>
                <th class="px-4 py-2">Project</th>
                <th class="px-4 py-2">Regular Hours</th>
                <th class="px-4 py-2">Overtime Hours</th>
                <th class="px-4 py-2">Regular Pay</th>
                <th class="px-4 py-2">Overtime Pay</th>
                <th class="px-4 py-2">Benefits</th>
                <th class="px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="entry in week.entries" :key="entry.id">
                <td class="px-4 py-2">{{ entry.date }}</td>
                <td class="px-4 py-2">
                  {{ projects.find((p) => p.id === entry.projectId)?.name }}
                </td>
                <td class="px-4 py-2">{{ entry.regularHours }}</td>
                <td class="px-4 py-2">{{ entry.overtimeHours }}</td>
                <td class="px-4 py-2">{{ formatCurrency(entry.calculatedPay.regularPay) }}</td>
                <td class="px-4 py-2">{{ formatCurrency(entry.calculatedPay.overtimePay) }}</td>
                <td class="px-4 py-2">{{ formatCurrency(entry.calculatedPay.benefitsPay) }}</td>
                <td class="px-4 py-2 font-medium">
                  {{ formatCurrency(entry.calculatedPay.totalPay) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- New Entry Modal -->
    <div
      v-if="showEntryModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">New Time Entry</h2>
          <button @click="showEntryModal = false" class="text-gray-500 hover:text-gray-700">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="createTimeEntry" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Project</label>
            <select
              v-model="newEntry.projectId"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">Select Project</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Date</label>
            <input
              v-model="newEntry.date"
              type="date"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Regular Hours</label>
            <input
              v-model="newEntry.regularHours"
              type="number"
              step="0.5"
              min="0"
              max="24"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Overtime Hours</label>
            <input
              v-model="newEntry.overtimeHours"
              type="number"
              step="0.5"
              min="0"
              max="24"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showEntryModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
