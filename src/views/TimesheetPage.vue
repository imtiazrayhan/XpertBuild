<!-- TimesheetPage.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

interface TimeEntry {
  employeeId: number
  projectId: string
  date: string
  regularHours: number
  overtimeHours: number
}

interface Employee {
  id: number
  firstName: string
  lastName: string
  employeeType: 'LOCAL' | 'UNION'
  hourlyRate?: number
  unionClassId?: number
  selected?: boolean
  regularHours?: number
  overtimeHours?: number
}

interface Project {
  id: string
  name: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'
}

const selectedDate = ref(new Date().toISOString().split('T')[0])
const selectedProject = ref<string>('')
const employees = ref<Employee[]>([])
const projects = ref<Project[]>([])
const defaultRegularHours = ref(8)
const defaultOvertimeHours = ref(0)
const employeeFilter = ref<'ALL' | 'LOCAL' | 'UNION'>('ALL')
const showSuccessNotification = ref(false)

const selectedEmployees = computed(() =>
  employees.value
    .filter(
      (emp) =>
        emp.selected &&
        (employeeFilter.value === 'ALL' || emp.employeeType === employeeFilter.value),
    )
    .map((emp) => ({
      ...emp,
      regularHours: emp.regularHours ?? defaultRegularHours.value,
      overtimeHours: emp.overtimeHours ?? defaultOvertimeHours.value,
    })),
)

const getWeekNumber = (date: string) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { weekNumber, yearNumber: d.getFullYear() }
}

const fetchEmployees = async () => {
  try {
    const response = await fetch('/api/employees')
    const data = await response.json()
    employees.value = data.map((emp: Employee) => ({
      ...emp,
      selected: false,
      regularHours: undefined,
      overtimeHours: undefined,
    }))
  } catch (error) {
    console.error('Error fetching employees:', error)
  }
}

const fetchProjects = async () => {
  try {
    const response = await fetch('/api/projects')
    const allProjects = await response.json()
    projects.value = allProjects.filter(
      (p: Project) => p.status === 'IN_PROGRESS' || p.status === 'PLANNING',
    )
  } catch (error) {
    console.error('Error fetching projects:', error)
  }
}

const showSuccessMessage = () => {
  showSuccessNotification.value = true
  setTimeout(() => {
    showSuccessNotification.value = false
  }, 3000)
}

const submitTimeEntries = async () => {
  if (!selectedProject.value || !selectedDate.value) {
    alert('Please select a project and date')
    return
  }

  const entries = selectedEmployees.value.map((employee) => ({
    employeeId: employee.id,
    projectId: selectedProject.value,
    date: selectedDate.value,
    regularHours: employee.regularHours,
    overtimeHours: employee.overtimeHours,
  }))

  try {
    const response = await fetch('/api/time-entries/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries),
    })

    if (response.ok) {
      resetForm()
      showSuccessMessage()
    }
  } catch (error) {
    console.error('Error submitting time entries:', error)
  }
}

const resetForm = () => {
  employees.value.forEach((emp) => {
    emp.selected = false
    emp.regularHours = undefined
    emp.overtimeHours = undefined
  })
  selectedProject.value = ''
  defaultRegularHours.value = 8
  defaultOvertimeHours.value = 0
}

fetchEmployees()
fetchProjects()
</script>

<template>
  <div class="space-y-6">
    <!-- Success Notification -->
    <div
      v-if="showSuccessNotification"
      class="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded"
      role="alert"
    >
      <span class="block sm:inline">Time entries saved successfully!</span>
    </div>

    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Timesheet</h1>
        <p class="text-gray-600">Bulk time entry for employees</p>
      </div>
    </div>

    <!-- Entry Form -->
    <div class="bg-white rounded-lg p-6 shadow-sm space-y-6">
      <!-- Date and Project Selection -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Date</label>
          <input
            v-model="selectedDate"
            type="date"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Project</label>
          <select
            v-model="selectedProject"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">Select Project</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Default Hours -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Default Regular Hours</label>
          <input
            v-model="defaultRegularHours"
            type="number"
            min="0"
            max="24"
            step="0.5"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Default Overtime Hours</label>
          <input
            v-model="defaultOvertimeHours"
            type="number"
            min="0"
            max="24"
            step="0.5"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <!-- Employee Filter -->
      <div class="flex space-x-4">
        <button
          v-for="filter in ['ALL', 'LOCAL', 'UNION']"
          :key="filter"
          @click="employeeFilter = filter"
          :class="[
            'px-4 py-2 rounded-md',
            employeeFilter === filter
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          {{ filter }} Employees
        </button>
      </div>

      <!-- Employee Selection -->
      <div class="border rounded-lg">
        <div class="grid grid-cols-3 gap-4 p-4">
          <div
            v-for="employee in employees"
            :key="employee.id"
            v-show="employeeFilter === 'ALL' || employee.employeeType === employeeFilter"
            class="flex items-center space-x-2"
          >
            <input
              type="checkbox"
              v-model="employee.selected"
              :id="'emp-' + employee.id"
              class="rounded border-gray-300"
            />
            <label :for="'emp-' + employee.id" class="text-sm">
              {{ employee.firstName }} {{ employee.lastName }}
              <span
                class="ml-1 text-xs px-2 py-0.5 rounded-full"
                :class="{
                  'bg-blue-100 text-blue-800': employee.employeeType === 'LOCAL',
                  'bg-green-100 text-green-800': employee.employeeType === 'UNION',
                }"
              >
                {{ employee.employeeType }}
              </span>
            </label>
          </div>
        </div>
      </div>

      <!-- Individual Hours Adjustment -->
      <div v-if="selectedEmployees.length > 0" class="border rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-700 mb-4">Adjust Individual Hours</h3>
        <div class="space-y-4">
          <div
            v-for="employee in selectedEmployees"
            :key="employee.id"
            class="grid grid-cols-3 gap-4 items-center"
          >
            <div class="text-sm">{{ employee.firstName }} {{ employee.lastName }}</div>
            <div>
              <label class="block text-xs text-gray-500">Regular Hours</label>
              <input
                v-model="employee.regularHours"
                type="number"
                min="0"
                max="24"
                step="0.5"
                :placeholder="defaultRegularHours.toString()"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500">Overtime Hours</label>
              <input
                v-model="employee.overtimeHours"
                type="number"
                min="0"
                max="24"
                step="0.5"
                :placeholder="defaultOvertimeHours.toString()"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Selected Summary -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-sm font-medium text-gray-700">
          Selected Employees: {{ selectedEmployees.length }}
        </h3>
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end space-x-3">
        <button
          @click="resetForm"
          class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Reset
        </button>
        <button
          @click="submitTimeEntries"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          :disabled="!selectedProject || selectedEmployees.length === 0"
        >
          Save Time Entries
        </button>
      </div>
    </div>
  </div>
</template>
