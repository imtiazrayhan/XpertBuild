<!-- TimesheetPage.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { XMarkIcon } from '@heroicons/vue/24/outline'

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

interface TimeEntryValidation {
  validateHours: (regularHours: number, overtimeHours: number) => ValidationResult
  validateProject: (projectId: string, date: string) => Promise<ValidationResult>
  validateDuplicates: (entries: TimeEntry[]) => Promise<ValidationResult>
  validateUnionRules: (
    employee: Employee,
    regularHours: number,
    overtimeHours: number,
  ) => ValidationResult
}

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

interface TimeEntryView {
  date: string
  entries: {
    [key: string]: TimeEntry[] // Grouped by employeeId
  }
}

interface ProjectHours {
  projectName: string
  local: number
  union: {
    [className: string]: number
  }
}

const selectedDate = ref(new Date().toISOString().split('T')[0])
const selectedProject = ref<string>('')
const employees = ref<Employee[]>([])
const projects = ref<Project[]>([])
const defaultRegularHours = ref(8)
const defaultOvertimeHours = ref(0)
const employeeFilter = ref<'ALL' | 'LOCAL' | 'UNION'>('ALL')
const showSuccessNotification = ref(false)
const viewMode = ref<'entry' | 'calendar'>('entry')
const calendarView = ref<'week' | 'month'>('week')
const currentDate = ref(new Date())
const timeEntries = ref<TimeEntry[]>([])

const getDayHoursByProject = (entries: TimeEntry[]): ProjectHours[] => {
  // Group by project first
  const byProject = entries.reduce(
    (acc, entry) => {
      const projectId = entry.projectId || 'NO_PROJECT'
      if (!acc[projectId]) {
        acc[projectId] = {
          projectName: entry.project?.name || 'No Project',
          local: 0,
          union: {},
        }
      }

      const hours = entry.regularHours + entry.overtimeHours

      if (entry.employee.employeeType === 'LOCAL') {
        acc[projectId].local += hours
      } else {
        const className = entry.employee.unionClass?.name || 'Unknown Class'
        acc[projectId].union[className] = (acc[projectId].union[className] || 0) + hours
      }

      return acc
    },
    {} as Record<string, ProjectHours>,
  )

  return Object.values(byProject)
}

// Add new computed properties
const calendarDates = computed(() => {
  const dates: Date[] = []
  const start = new Date(currentDate.value)

  if (calendarView.value === 'week') {
    start.setDate(start.getDate() - start.getDay())
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      date.setUTCHours(12, 0, 0, 0)
      dates.push(date)
    }
  } else {
    start.setDate(1)
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    for (let d = start; d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const date = new Date(d)
      date.setUTCHours(12, 0, 0, 0)
      dates.push(date)
    }
  }
  return dates
})

const groupedEntries = computed(() => {
  const grouped: { [key: string]: TimeEntry[] } = {}
  timeEntries.value.forEach((entry) => {
    const dateKey = new Date(entry.date).toISOString().split('T')[0]
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    grouped[dateKey].push(entry)
  })
  return grouped
})

// Add new methods
const fetchTimeEntries = async (start: Date, end: Date) => {
  try {
    const response = await fetch(
      `/api/time-entries/range?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
    )
    timeEntries.value = await response.json()
  } catch (error) {
    console.error('Error fetching time entries:', error)
  }
}

const navigatePeriod = async (direction: 'prev' | 'next') => {
  const newDate = new Date(currentDate.value)
  if (calendarView.value === 'week') {
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    currentDate.value = newDate
    const lastDate = new Date(calendarDates.value[calendarDates.value.length - 1])
    await fetchTimeEntries(calendarDates.value[0], lastDate)
  } else {
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    currentDate.value = newDate
    const monthStart = new Date(newDate.getFullYear(), newDate.getMonth(), 1)
    const monthEnd = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0)
    await fetchTimeEntries(monthStart, monthEnd)
  }
}

const formatHours = (entries: TimeEntry[]) => {
  const total = entries.reduce((sum, entry) => sum + entry.regularHours + entry.overtimeHours, 0)
  return total.toFixed(1)
}

// Add to computed properties
const calculateHoursByType = (entries: TimeEntry[]) => {
  return entries.reduce(
    (acc, entry) => {
      const totalHours = entry.regularHours + entry.overtimeHours
      const type = entry.employee.employeeType
      acc[type] = (acc[type] || 0) + totalHours
      return acc
    },
    {} as Record<string, number>,
  )
}

const monthViewDates = computed(() => {
  const dates: Date[] = []
  const start = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1)
  const end = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = new Date(d)
    date.setUTCHours(12, 0, 0, 0)
    dates.push(date)
  }
  return dates
})

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

const validationErrors = ref<string[]>([])

const timeEntryValidation: TimeEntryValidation = {
  validateHours(regularHours: number, overtimeHours: number) {
    const errors: string[] = []
    const totalHours = regularHours + overtimeHours

    if (totalHours > 16) {
      errors.push('Total hours cannot exceed 16 hours per day')
    }

    if (totalHours <= 0) {
      errors.push('Total hours must be greater than 0')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  },

  async validateProject(projectId: string, date: string) {
    const errors: string[] = []

    try {
      const response = await fetch(`/api/projects/${projectId}`)
      const project = await response.json()

      const entryDate = new Date(date)
      const projectStart = new Date(project.startDate)

      if (entryDate < projectStart) {
        errors.push('Time entry date cannot be before project start date')
      }

      if (project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
        errors.push('Cannot add time entries to completed or on-hold projects')
      }
    } catch (error) {
      errors.push('Error validating project')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  },

  async validateDuplicates(entries: TimeEntry[]) {
    const errors: string[] = []

    try {
      // Get existing entries for the date
      const date = entries[0].date
      const { weekNumber, yearNumber } = getWeekNumber(date)

      const response = await fetch(
        `/api/time-entries?weekNumber=${weekNumber}&yearNumber=${yearNumber}`,
      )
      const existingEntries = await response.json()

      // Check for duplicates
      for (const entry of entries) {
        const duplicate = existingEntries.find(
          (e: TimeEntry) =>
            e.employeeId === entry.employeeId &&
            new Date(e.date).toISOString().split('T')[0] === entry.date,
        )

        if (duplicate) {
          errors.push(`Duplicate entry found for employee ID ${entry.employeeId} on ${entry.date}`)
        }
      }
    } catch (error) {
      errors.push('Error checking for duplicate entries')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  },

  validateUnionRules(employee: Employee, regularHours: number, overtimeHours: number) {
    const errors: string[] = []

    if (employee.employeeType === 'UNION') {
      // Validate minimum hours (4 hours for union workers)
      if (regularHours === 0) {
        errors.push('Union workers must be assigned minimum 1 regular hours')
      }

      // Validate overtime rules
      if (overtimeHours > 0 && regularHours < 8) {
        errors.push('8 regular hours required before overtime for union workers')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  },
}

const validateForm = (): ValidationResult => {
  const errors: string[] = []

  if (!selectedProject.value) {
    errors.push('Please select a project')
  }

  if (!selectedDate.value) {
    errors.push('Please select a date')
  }

  if (selectedEmployees.value.length === 0) {
    errors.push('Please select at least one employee')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

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
  validationErrors.value = []

  const formValidation = validateForm()
  if (!formValidation.isValid) {
    validationErrors.value = formValidation.errors
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
    // Run all validations
    const projectValidation = await timeEntryValidation.validateProject(
      selectedProject.value,
      selectedDate.value,
    )
    const duplicateValidation = await timeEntryValidation.validateDuplicates(entries)

    const hourValidations = selectedEmployees.value.map((employee) => ({
      employee,
      hoursValidation: timeEntryValidation.validateHours(
        employee.regularHours ?? defaultRegularHours.value,
        employee.overtimeHours ?? defaultOvertimeHours.value,
      ),
      unionValidation: timeEntryValidation.validateUnionRules(
        employee,
        employee.regularHours ?? defaultRegularHours.value,
        employee.overtimeHours ?? defaultOvertimeHours.value,
      ),
    }))

    // Collect all validation errors
    validationErrors.value = [
      ...projectValidation.errors,
      ...duplicateValidation.errors,
      ...hourValidations.flatMap((v) => [...v.hoursValidation.errors, ...v.unionValidation.errors]),
    ]

    if (validationErrors.value.length > 0) {
      return
    }

    // Submit if all validations pass
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
    validationErrors.value = ['Error submitting time entries']
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

// Add watch for calendarView
watch(calendarView, async () => {
  if (calendarView.value === 'month') {
    const monthStart = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1)
    const monthEnd = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0)
    await fetchTimeEntries(monthStart, monthEnd)
  } else {
    const lastDate = new Date(calendarDates.value[calendarDates.value.length - 1])
    await fetchTimeEntries(calendarDates.value[0], lastDate)
  }
})

onMounted(() => {
  fetchEmployees()
  fetchProjects()
  const lastDate = new Date(calendarDates.value[calendarDates.value.length - 1])
  fetchTimeEntries(calendarDates.value[0], lastDate)
})
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

    <div class="bg-white rounded-lg p-4 shadow-sm">
      <div class="flex justify-between items-center mb-4">
        <div class="flex space-x-4">
          <button
            v-for="mode in ['entry', 'calendar']"
            :key="mode"
            @click="viewMode = mode"
            :class="[
              'px-4 py-2 rounded-md',
              viewMode === mode ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100',
            ]"
          >
            {{ mode.charAt(0).toUpperCase() + mode.slice(1) }} View
          </button>
        </div>
        <div v-if="viewMode === 'calendar'" class="flex space-x-4">
          <button
            v-for="view in ['week', 'month']"
            :key="view"
            @click="calendarView = view"
            :class="[
              'px-4 py-2 rounded-md',
              calendarView === view
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100',
            ]"
          >
            {{ view.charAt(0).toUpperCase() + view.slice(1) }}
          </button>
        </div>
      </div>

      <!-- Calendar Navigation -->
      <div v-if="viewMode === 'calendar'" class="mb-4 flex justify-between items-center">
        <button @click="navigatePeriod('prev')" class="p-2 hover:bg-gray-100 rounded">
          <ChevronLeftIcon class="w-5 h-5" />
        </button>
        <span class="font-medium">
          {{ currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }}
          {{ calendarView === 'week' ? `Week ${getWeekNumber(currentDate).weekNumber}` : '' }}
        </span>
        <button @click="navigatePeriod('next')" class="p-2 hover:bg-gray-100 rounded">
          <ChevronRightIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div v-if="viewMode === 'calendar'" class="bg-white rounded-lg shadow-sm mt-4">
      <div class="grid" :class="calendarView === 'week' ? 'grid-cols-7' : 'grid-cols-7'">
        <!-- Header -->
        <div
          v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
          :key="day"
          class="p-2 text-center text-sm font-medium text-gray-700 border-b"
        >
          {{ day }}
        </div>

        <!-- Calendar Days -->
        <!-- Replace Calendar Days section -->
        <div
          v-for="date in calendarView === 'week' ? calendarDates : monthViewDates"
          :key="date.toISOString()"
          class="min-h-[100px] p-2 border-b border-r relative"
        >
          <div class="flex justify-between items-start">
            <span
              class="text-sm"
              :class="{
                'text-gray-900 font-medium': date.toDateString() === new Date().toDateString(),
              }"
            >
              {{ date.getDate() }}
            </span>
          </div>

          <div
            v-if="groupedEntries[date.toISOString().split('T')[0]]"
            class="mt-2 space-y-2 text-xs"
          >
            <div
              v-for="project in getDayHoursByProject(
                groupedEntries[date.toISOString().split('T')[0]],
              )"
              :key="project.projectName"
              class="p-2 rounded-md border border-gray-200 bg-gray-50"
            >
              <div class="font-medium text-gray-900">{{ project.projectName }}</div>

              <div v-if="project.local > 0" class="mt-1">
                <div class="flex justify-between bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  <span>Local</span>
                  <span>{{ project.local.toFixed(1) }}h</span>
                </div>
              </div>

              <div v-if="Object.keys(project.union).length > 0" class="mt-1 space-y-1">
                <div class="text-gray-500">Union:</div>
                <div
                  v-for="(hours, className) in project.union"
                  :key="className"
                  class="flex justify-between bg-green-50 text-green-700 px-2 py-1 rounded ml-2"
                >
                  <span>{{ className }}</span>
                  <span>{{ hours.toFixed(1) }}h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="space-y-6">
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

        <!-- Add this before the submit button -->
        <div
          v-if="validationErrors.length > 0"
          class="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong class="font-bold">Validation Errors:</strong>
          <ul class="mt-2 list-disc list-inside">
            <li v-for="error in validationErrors" :key="error" class="text-sm">
              {{ error }}
            </li>
          </ul>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end space-x-3">
          <div v-if="!selectedProject" class="text-red-600 text-sm mb-2">
            Please select a project to continue
          </div>
          <button
            @click="resetForm"
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reset
          </button>
          <!-- Add this above the submit button -->

          <button
            @click="submitTimeEntries"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!selectedProject || selectedEmployees.length === 0"
          >
            {{
              !selectedProject
                ? 'Select a Project'
                : selectedEmployees.length === 0
                  ? 'Select Employees'
                  : 'Save Time Entries'
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
