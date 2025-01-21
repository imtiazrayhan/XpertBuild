<!-- LocalTimesheetPage.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon } from '@heroicons/vue/24/outline'

interface Employee {
  id: number
  firstName: string
  lastName: string
  hourlyRate: number
  employeeType: 'LOCAL'
}

interface TimeEntry {
  id: number
  employeeId: number
  date: string
  regularHours: number
  paymentStatus: 'PENDING' | 'PAID'
}

interface EditEntryData {
  id: number
  employeeId: number
  date: string
  hours: number
}

const employees = ref<Employee[]>([])
const timeEntries = ref<TimeEntry[]>([])
const currentWeekStart = ref(getStartOfWeek(new Date()))
const showEntryModal = ref(false)
const editMode = ref(false)
const editEntryData = ref<EditEntryData | null>(null)

const newEntries = ref<{
  date: string
  entries: { employeeId: number; hours: number }[]
}>({
  date: new Date().toISOString().split('T')[0],
  entries: [],
})

const modalDate = computed({
  get: () =>
    editMode.value && editEntryData.value ? editEntryData.value.date : newEntries.value.date,
  set: (value) => {
    if (editMode.value && editEntryData.value) {
      editEntryData.value.date = value
    } else {
      newEntries.value.date = value
    }
  },
})

// Calculate start and end of week
function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setUTCHours(12, 0, 0, 0)
  return monday
}

function getEndOfWeek(date: Date): Date {
  const end = new Date(date)
  end.setDate(end.getDate() + 6)
  end.setUTCHours(12, 0, 0, 0)
  return end
}

// Week navigation
const navigateWeek = (direction: 'prev' | 'next') => {
  const newDate = new Date(currentWeekStart.value)
  newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
  currentWeekStart.value = getStartOfWeek(newDate)
  fetchTimeEntries()
}

// Format date range for display
const weekDateRange = computed(() => {
  const start = currentWeekStart.value
  const end = getEndOfWeek(start)
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
})

// Generate week days array
const weekDays = computed(() => {
  const days = []
  const start = new Date(currentWeekStart.value)
  for (let i = 0; i < 7; i++) {
    const day = new Date(start)
    day.setDate(day.getDate() + i)
    day.setUTCHours(12, 0, 0, 0)
    days.push(day)
  }
  return days
})

// Calculate employee hours and pay for current week
const employeeWeekData = computed(() => {
  return employees.value.map((employee) => {
    const weekEntries = timeEntries.value.filter((entry) => entry.employeeId === employee.id)

    const totalRegularHours = weekEntries.reduce((sum, entry) => sum + entry.regularHours, 0)
    const totalPay = totalRegularHours * employee.hourlyRate

    const isPaid = weekEntries.every((entry) => entry.paymentStatus === 'PAID')

    return {
      employee,
      totalRegularHours,
      totalPay,
      isPaid,
      entries: weekDays.value.map((day) => {
        const entry = weekEntries.find((e) => new Date(e.date).getTime() === day.getTime())
        return (
          entry || {
            regularHours: 0,
          }
        )
      }),
    }
  })
})

// Calculate outstanding balances for all unpaid entries
const outstandingBalances = computed(() => {
  return employees.value.map((employee) => {
    const unpaidEntries = timeEntries.value.filter(
      (entry) => entry.employeeId === employee.id && entry.paymentStatus === 'PENDING',
    )

    const totalUnpaidHours = unpaidEntries.reduce((sum, entry) => sum + entry.regularHours, 0)
    const totalOutstanding = totalUnpaidHours * employee.hourlyRate

    return {
      employee,
      totalOutstanding,
    }
  })
})

// Fetch data
const fetchEmployees = async () => {
  try {
    const response = await fetch('/api/employees')
    const allEmployees = await response.json()
    employees.value = allEmployees
      .filter((emp) => emp.employeeType === 'LOCAL')
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
  } catch (error) {
    console.error('Error fetching employees:', error)
  }
}

const fetchTimeEntries = async () => {
  try {
    const response = await fetch('/api/time-entries')
    const allEntries = await response.json()
    timeEntries.value = allEntries.filter((entry) => {
      const entryDate = new Date(entry.date)
      return (
        entryDate >= currentWeekStart.value && entryDate <= getEndOfWeek(currentWeekStart.value)
      )
    })
  } catch (error) {
    console.error('Error fetching time entries:', error)
  }
}

const openEditModal = (entry: TimeEntry) => {
  editMode.value = true
  editEntryData.value = {
    id: entry.id,
    employeeId: entry.employeeId,
    date: new Date(entry.date).toISOString().split('T')[0],
    hours: entry.regularHours,
  }
  showEntryModal.value = true
}

const submitTimeEntries = async () => {
  try {
    const date = new Date(editMode.value ? editEntryData.value!.date : newEntries.value.date)
    date.setUTCHours(12, 0, 0, 0)

    if (editMode.value && editEntryData.value) {
      await fetch(`/api/time-entries/${editEntryData.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date.toISOString(),
          regularHours: editEntryData.value.hours,
          overtimeHours: 0,
          type: 'REGULAR',
        }),
      })
    } else {
      const promises = newEntries.value.entries
        .filter((entry) => entry.hours > 0)
        .map((entry) =>
          fetch('/api/time-entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: entry.employeeId,
              date: date.toISOString(),
              regularHours: entry.hours,
              overtimeHours: 0,
              type: 'REGULAR',
            }),
          }),
        )

      await Promise.all(promises)
    }

    showEntryModal.value = false
    editMode.value = false
    editEntryData.value = null
    await fetchTimeEntries()
  } catch (error) {
    console.error('Error submitting time entries:', error)
  }
}

const openEntryModal = () => {
  editMode.value = false
  editEntryData.value = null
  newEntries.value = {
    date: new Date().toISOString().split('T')[0],
    entries: employees.value.map((emp) => ({
      employeeId: emp.id,
      hours: 0,
    })),
  }
  showEntryModal.value = true
}

// Mark week as paid
const markWeekAsPaid = async (employeeId: number) => {
  try {
    const weekEntries = timeEntries.value.filter((entry) => entry.employeeId === employeeId)

    const promises = weekEntries.map((entry) =>
      fetch(`/api/time-entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      }),
    )

    await Promise.all(promises)
    await fetchTimeEntries()
  } catch (error) {
    console.error('Error marking week as paid:', error)
  }
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

onMounted(() => {
  fetchEmployees()
  fetchTimeEntries()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Local Timesheet</h1>
        <p class="text-gray-600">Manage local employee hours and payments</p>
      </div>
      <button
        @click="openEntryModal"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        + Add Hours
      </button>
    </div>

    <!-- Week Navigation -->
    <div class="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
      <button @click="() => navigateWeek('prev')" class="p-2 hover:bg-gray-100 rounded-full">
        <ChevronLeftIcon class="w-5 h-5" />
      </button>
      <span class="font-medium">{{ weekDateRange }}</span>
      <button @click="() => navigateWeek('next')" class="p-2 hover:bg-gray-100 rounded-full">
        <ChevronRightIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Timesheet Table -->
    <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="bg-gray-50 border-b">
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Employee
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
            <th
              v-for="day in weekDays"
              :key="day.toISOString()"
              class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
            >
              {{ day.toLocaleDateString(undefined, { weekday: 'short' }) }}
              <br />
              {{ day.toLocaleDateString() }}
            </th>
            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Total Hours
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Total Pay
            </th>
            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="data in employeeWeekData" :key="data.employee.id">
            <td class="px-6 py-4">{{ data.employee.firstName }} {{ data.employee.lastName }}</td>
            <td class="px-6 py-4">{{ formatCurrency(data.employee.hourlyRate) }}/hr</td>
            <td
              v-for="(entry, index) in data.entries"
              :key="index"
              class="px-6 py-4 text-center relative group"
            >
              <div class="flex items-center justify-center space-x-2">
                <span>{{ entry.regularHours ? `${entry.regularHours}h` : '-' }}</span>
                <button
                  v-if="entry.regularHours && entry.paymentStatus !== 'PAID'"
                  @click="openEditModal(entry)"
                  class="text-gray-400 hover:text-gray-600"
                >
                  <PencilIcon class="w-4 h-4" />
                </button>
              </div>
            </td>
            <td class="px-6 py-4 text-center">{{ data.totalRegularHours }}h</td>
            <td class="px-6 py-4 text-right font-medium">
              {{ formatCurrency(data.totalPay) }}
            </td>
            <td class="px-6 py-4 text-center">
              <button
                v-if="!data.isPaid && data.totalRegularHours > 0"
                @click="markWeekAsPaid(data.employee.id)"
                class="text-blue-600 hover:text-blue-800"
              >
                Mark as Paid
              </button>
              <span v-else-if="data.isPaid" class="text-green-600">Paid</span>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Outstanding Balances -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h2 class="text-lg font-semibold mb-4">Outstanding Balances</h2>
      <div class="grid grid-cols-3 gap-4">
        <div
          v-for="balance in outstandingBalances"
          :key="balance.employee.id"
          class="p-4 bg-gray-50 rounded-lg"
        >
          <div class="font-medium">
            {{ balance.employee.firstName }} {{ balance.employee.lastName }}
          </div>
          <div class="text-2xl font-bold mt-2">
            {{ formatCurrency(balance.totalOutstanding) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Hour Entry Modal -->
    <div
      v-if="showEntryModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">{{ editMode ? 'Edit Hours' : 'Enter Hours' }}</h2>
          <button @click="showEntryModal = false" class="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form @submit.prevent="submitTimeEntries" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"> Date </label>
            <input
              v-model="modalDate"
              type="date"
              required
              class="block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div v-if="!editMode" class="space-y-4">
            <div
              v-for="entry in newEntries.entries"
              :key="entry.employeeId"
              class="grid grid-cols-3 gap-4 items-center"
            >
              <div class="font-medium">
                {{ employees.find((emp) => emp.id === entry.employeeId)?.firstName }}
                {{ employees.find((emp) => emp.id === entry.employeeId)?.lastName }}
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"> Hours </label>
                <input
                  v-model="entry.hours"
                  type="number"
                  min="0"
                  step="0.5"
                  class="block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="grid grid-cols-3 gap-4 items-center">
              <div class="font-medium">
                {{ employees.find((emp) => emp.id === editEntryData?.employeeId)?.firstName }}
                {{ employees.find((emp) => emp.id === editEntryData?.employeeId)?.lastName }}
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"> Hours </label>
                <input
                  v-model="editEntryData!.hours"
                  type="number"
                  min="0"
                  step="0.5"
                  class="block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-3">
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
              {{ editMode ? 'Save Changes' : 'Save Hours' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
