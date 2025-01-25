<!-- TimesheetPage.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const dateUtils = {
  normalize(date: Date | string): Date {
    const d = new Date(date)
    d.setUTCHours(12, 0, 0, 0)
    return d
  },

  format(date: Date | string): string {
    const d = this.normalize(date)
    return d.toISOString().split('T')[0]
  },

  isSameDay(d1: Date | string, d2: Date | string): boolean {
    const date1 = this.normalize(d1)
    const date2 = this.normalize(d2)
    return date1.getTime() === date2.getTime()
  },

  getWeekDates(date: Date): Date[] {
    const d = this.normalize(date)
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day
    const week = []

    for (let i = 0; i < 7; i++) {
      const newDate = new Date(d)
      newDate.setUTCDate(diff + i)
      newDate.setUTCHours(12, 0, 0, 0)
      week.push(newDate)
    }

    return week
  },
}

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
const viewMode = ref<'entry' | 'calendar' | 'manage'>('entry')
const calendarView = ref<'week' | 'month'>('week')
const currentDate = ref(dateUtils.normalize(new Date()))
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
  const start = dateUtils.normalize(currentDate.value)

  if (calendarView.value === 'week') {
    dates.push(...dateUtils.getWeekDates(start))
  } else {
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)

    for (let d = dateUtils.normalize(monthStart); d <= monthEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      dates.push(new Date(d))
    }
  }
  return dates
})

const groupedEntries = computed(() => {
  const grouped: { [key: string]: TimeEntry[] } = {}

  timeEntries.value.forEach((entry) => {
    const dateKey = dateUtils.format(entry.date)
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
    const startDate = dateUtils.format(start)
    const endDate = dateUtils.format(end)
    const response = await fetch(
      `/api/time-entries/range?startDate=${startDate}&endDate=${endDate}`,
    )
    timeEntries.value = await response.json()
  } catch (error) {
    console.error('Error fetching time entries:', error)
  }
}

const navigatePeriod = async (direction: 'prev' | 'next') => {
  const newDate = dateUtils.normalize(currentDate.value)

  if (calendarView.value === 'week') {
    newDate.setUTCDate(newDate.getUTCDate() + (direction === 'next' ? 7 : -7))
  } else {
    newDate.setUTCMonth(newDate.getUTCMonth() + (direction === 'next' ? 1 : -1))
  }

  currentDate.value = dateUtils.normalize(newDate)
  await fetchTimeEntries(
    calendarDates.value[0],
    calendarDates.value[calendarDates.value.length - 1],
  )
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
  const year = currentDate.value.getUTCFullYear()
  const month = currentDate.value.getUTCMonth()

  // Get first day of month
  const firstDay = dateUtils.normalize(new Date(Date.UTC(year, month, 1)))
  const firstDayOfWeek = firstDay.getUTCDay()

  // Get last day of month
  const lastDay = dateUtils.normalize(new Date(Date.UTC(year, month + 1, 0)))
  const lastDate = lastDay.getUTCDate()

  // Calculate days from previous month needed to fill first week
  const daysFromPrevMonth = firstDayOfWeek
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year

  // Calculate days from next month needed to fill last week
  const lastDayOfWeek = lastDay.getUTCDay()
  const daysFromNextMonth = 6 - lastDayOfWeek

  const dates: Date[] = []

  // Add days from previous month
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const prevMonthLastDay = new Date(Date.UTC(prevYear, prevMonth + 1, 0))
    const day = prevMonthLastDay.getUTCDate() - i
    dates.push(dateUtils.normalize(new Date(Date.UTC(prevYear, prevMonth, day))))
  }

  // Add days from current month
  for (let day = 1; day <= lastDate; day++) {
    dates.push(dateUtils.normalize(new Date(Date.UTC(year, month, day))))
  }

  // Add days from next month
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  for (let day = 1; day <= daysFromNextMonth; day++) {
    dates.push(dateUtils.normalize(new Date(Date.UTC(nextYear, nextMonth, day))))
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

      const entryDate = dateUtils.normalize(date)
      const projectStart = dateUtils.normalize(project.startDate)

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
      const date = dateUtils.normalize(entries[0].date)
      const { weekNumber, yearNumber } = getWeekNumber(date)

      const response = await fetch(
        `/api/time-entries?weekNumber=${weekNumber}&yearNumber=${yearNumber}`,
      )
      const existingEntries = await response.json()

      for (const entry of entries) {
        const duplicate = existingEntries.find(
          (e: TimeEntry) =>
            e.employeeId === entry.employeeId && dateUtils.isSameDay(e.date, entry.date),
        )

        if (duplicate) {
          errors.push(
            `Duplicate entry found for employee ID ${entry.employeeId} on ${dateUtils.format(entry.date)}`,
          )
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

interface TimeEntryWithDetails extends TimeEntry {
  employee: Employee
  project?: Project
}

// Add to ref declarations
const manageViewTab = ref<'entries' | 'local' | 'union'>('entries')
const dateRange = ref({
  start: (() => {
    const today = dateUtils.normalize(new Date())
    const day = today.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day // If Sunday, go back 6 days, otherwise get last Monday
    const lastMonday = new Date(today)
    lastMonday.setDate(today.getDate() + mondayOffset - 7) // Subtract 7 to get last week
    return dateUtils.format(lastMonday)
  })(),
  end: (() => {
    const today = dateUtils.normalize(new Date())
    const day = today.getDay()
    const sundayOffset = day === 0 ? 0 : 7 - day
    const lastSunday = new Date(today)
    lastSunday.setDate(today.getDate() + sundayOffset - 7) // Subtract 7 to get last week
    return dateUtils.format(lastSunday)
  })(),
})
const selectedEntries = ref<Set<number>>(new Set())
const timeEntriesWithDetails = ref<TimeEntryWithDetails[]>([])

// Add to script section:

const formatDate = (dateString: string) => {
  const date = dateUtils.normalize(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

// Add new methods
const fetchTimeEntriesWithDetails = async () => {
  if (!dateRange.value.start || !dateRange.value.end) return

  try {
    const response = await fetch(
      `/api/time-entries/range?startDate=${dateRange.value.start}&endDate=${dateRange.value.end}`,
    )
    timeEntriesWithDetails.value = await response.json()
  } catch (error) {
    console.error('Error fetching time entries:', error)
  }
}

const deleteTimeEntries = async () => {
  if (!confirm('Are you sure you want to delete the selected time entries?')) return

  try {
    const deletePromises = Array.from(selectedEntries.value).map((id) =>
      fetch(`/api/time-entries/${id}`, { method: 'DELETE' }),
    )

    await Promise.all(deletePromises)
    await fetchTimeEntriesWithDetails()
    selectedEntries.value.clear()
  } catch (error) {
    console.error('Error deleting time entries:', error)
  }
}

const updateTimeEntry = async (entry: TimeEntry) => {
  try {
    const response = await fetch(`/api/time-entries/${entry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })

    if (response.ok) {
      await fetchTimeEntriesWithDetails()
    }
  } catch (error) {
    console.error('Error updating time entry:', error)
  }
}

// Add to script section:

const showEditModal = ref(false)
const editingEntry = ref<TimeEntry | null>(null)

const openEditModal = (entry: TimeEntry) => {
  editingEntry.value = { ...entry }
  showEditModal.value = true
}

const handleEditSave = async () => {
  if (!editingEntry.value) return

  try {
    await updateTimeEntry(editingEntry.value)
    showEditModal.value = false
    editingEntry.value = null
  } catch (error) {
    console.error('Error updating time entry:', error)
  }
}

// Add watch for dateRange
watch([() => dateRange.value.start, () => dateRange.value.end], () => {
  if (dateRange.value.start && dateRange.value.end) {
    fetchTimeEntriesWithDetails()
  }
})

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

watch(viewMode, (newMode) => {
  if (newMode === 'manage' && dateRange.value.start && dateRange.value.end) {
    fetchTimeEntriesWithDetails()
  }
})

onMounted(() => {
  if (viewMode.value === 'manage' && dateRange.value.start && dateRange.value.end) {
    fetchTimeEntriesWithDetails()
  }
})

interface WeeklyPayment {
  weekNumber: number
  yearNumber: number
  employee: Employee
  regularHours: number
  overtimeHours: number
  regularPay: number
  overtimePay: number
  totalPay: number
  timeEntries: TimeEntry[]
  status: PaymentStatus
}

const getLastWeek = () => {
  const today = new Date()
  const lastWeek = new Date(today)
  lastWeek.setDate(today.getDate() - 7)
  lastWeek.setUTCHours(12, 0, 0, 0)

  // Get week number
  const yearStart = new Date(lastWeek.getFullYear(), 0, 1)
  const weekNumber = Math.ceil(((lastWeek.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)

  return {
    weekNumber,
    yearNumber: lastWeek.getFullYear(),
  }
}

const selectedWeek = ref(getLastWeek())

const weeklyPayments = ref<WeeklyPayment[]>([])
const selectedPayments = ref<Set<string>>(new Set()) // employeeId-weekNumber-yearNumber

const calculateLocalPayment = (timeEntries: TimeEntry[], employee: Employee): WeeklyPayment => {
  const regularHours = timeEntries.reduce((sum, entry) => sum + entry.regularHours, 0)
  const overtimeHours = timeEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0)
  const hourlyRate = employee.hourlyRate || 0

  return {
    weekNumber: timeEntries[0].weekNumber,
    yearNumber: timeEntries[0].yearNumber,
    employee,
    regularHours,
    overtimeHours,
    regularPay: regularHours * hourlyRate,
    overtimePay: overtimeHours * (hourlyRate * 1.5),
    totalPay: regularHours * hourlyRate + overtimeHours * (hourlyRate * 1.5),
    timeEntries,
    status: timeEntries[0].paymentStatus,
  }
}

const fetchLocalPayments = async () => {
  if (!selectedWeek.value) return

  try {
    const response = await fetch(
      `/api/time-entries/local-payments?weekNumber=${selectedWeek.value.weekNumber}&yearNumber=${selectedWeek.value.yearNumber}`,
    )
    const data = await response.json()
    weeklyPayments.value = data
  } catch (error) {
    console.error('Error fetching local payments:', error)
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

interface PaymentRecord {
  id: number
  amount: number
  date: string
  weekNumber: number
  yearNumber: number
  status: PaymentStatus
  notes?: string
  employee: Employee
  timeEntries?: TimeEntry[]
}

const showPaymentHistory = ref(false)
const selectedEmployeeId = ref<number | null>(null)
const paymentHistory = ref<PaymentRecord[]>([])

const fetchPaymentHistory = async (employeeId: number) => {
  try {
    const response = await fetch(`/api/payments/employee/${employeeId}`)
    const data = await response.json()
    console.log('Payment history received:', data)

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch payment history')
    }

    paymentHistory.value = data
  } catch (error) {
    console.error('Error fetching payment history:', error)
  }
}

// Add watch for selectedWeek
watch(selectedWeek, () => {
  if (selectedWeek.value) {
    fetchLocalPayments()
  }
})

onMounted(() => {
  fetchUnionClasses()
  fetchEmployees()
  fetchProjects()
  const lastDate = new Date(calendarDates.value[calendarDates.value.length - 1])
  fetchTimeEntries(calendarDates.value[0], lastDate)
  fetchLocalPayments()
  fetchUnionPayments()
})

interface Employee {
  id: number
  firstName: string
  lastName: string
  employeeType: 'LOCAL' | 'UNION'
  unionClassId?: number
  unionClass?: UnionClass & {
    rates: UnionClassRate[]
  }
}

interface UnionClass {
  id: number
  name: string
  rates: UnionClassRate[]
}

interface UnionClassRate {
  regularRate: number
  overtimeRate: number
  benefitsRate: number
  effectiveDate: string
  endDate: string | null
}

interface TimeEntry {
  id: number
  employeeId: number
  date: string
  regularHours: number
  overtimeHours: number
  paymentStatus: PaymentStatus
  employee: Employee
}

interface UnionPayment {
  weekNumber: number
  yearNumber: number
  employee: Employee
  regularHours: number
  overtimeHours: number
  regularPay: number
  overtimePay: number
  benefitsPay: number
  totalPay: number
  timeEntries: TimeEntry[]
  status: PaymentStatus
}

interface PaymentRecord {
  id: number
  amount: number
  date: string
  weekNumber: number
  yearNumber: number
  status: PaymentStatus
  notes?: string
  employee: Employee
  timeEntries?: TimeEntry[]
}

type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED'

// State
const unionPayments = ref<UnionPayment[]>([])

const unionClasses = ref<UnionClass[]>([])
const selectedUnionClass = ref('')

// Computed
const filteredPayments = computed(() => {
  if (!selectedUnionClass.value) return unionPayments.value
  const selectedId = parseInt(selectedUnionClass.value)
  return unionPayments.value.filter((payment) => payment.employee.unionClassId === selectedId)
})

const summaryStats = computed(() => ({
  totalRegularHours: filteredPayments.value.reduce((sum, p) => sum + p.regularHours, 0),
  totalOvertimeHours: filteredPayments.value.reduce((sum, p) => sum + p.overtimeHours, 0),
  totalRegularPay: filteredPayments.value.reduce((sum, p) => sum + p.regularPay, 0),
  totalOvertimePay: filteredPayments.value.reduce((sum, p) => sum + p.overtimePay, 0),
  totalBenefitsPay: filteredPayments.value.reduce((sum, p) => sum + p.benefitsPay, 0),
  totalPay: filteredPayments.value.reduce((sum, p) => sum + p.totalPay, 0),
}))

// Methods
const fetchUnionClasses = async () => {
  try {
    const response = await fetch('/api/union-classes')
    unionClasses.value = await response.json()
  } catch (error) {
    console.error('Error fetching union classes:', error)
  }
}

const fetchUnionPayments = async () => {
  if (!selectedWeek.value) return

  try {
    const timeEntriesResponse = await fetch(
      `/api/time-entries?weekNumber=${selectedWeek.value.weekNumber}&yearNumber=${selectedWeek.value.yearNumber}`,
    )
    const timeEntries = await timeEntriesResponse.json()

    // Add debugging logs
    console.log('Raw time entries:', timeEntries)

    // Group by employee
    const groupedEntries = timeEntries.reduce(
      (acc: { [key: string]: TimeEntry[] }, entry: TimeEntry) => {
        if (entry.employee.employeeType === 'UNION') {
          const key = entry.employeeId.toString()
          if (!acc[key]) acc[key] = []
          acc[key].push(entry)
        }
        return acc
      },
      {},
    )

    // Calculate payments for each employee
    unionPayments.value = Object.entries(groupedEntries)
      .map(([_, entries]) => {
        const employee = entries[0].employee
        const regularHours = entries.reduce((sum, entry) => sum + entry.regularHours, 0)
        const overtimeHours = entries.reduce((sum, entry) => sum + entry.overtimeHours, 0)

        // Find applicable rate based on the week's date
        // Add inside rate finding logic:
        const weekDate = dateUtils.normalize(entries[0].date)
        console.log('Looking for rate for date:', dateUtils.normalize(weekDate))
        console.log('Employee union class:', employee.unionClass)
        console.log('Available rates:', employee.unionClass?.rates)

        const applicableRate = employee.unionClass?.rates.find((rate) => {
          const effectiveDate = dateUtils.normalize(rate.effectiveDate)
          const endDate = rate.endDate
            ? dateUtils.normalize(rate.endDate)
            : dateUtils.normalize(new Date())
          console.log('Checking rate:', { effectiveDate, endDate })
          return weekDate >= effectiveDate && weekDate <= endDate
        })

        if (!applicableRate) {
          console.error('No applicable rate found for', employee.firstName, employee.lastName)
          return null
        }

        const regularPay = regularHours * applicableRate.regularRate
        const overtimePay = overtimeHours * applicableRate.overtimeRate
        const benefitsPay = (regularHours + overtimeHours) * applicableRate.benefitsRate

        return {
          weekNumber: selectedWeek.value!.weekNumber,
          yearNumber: selectedWeek.value!.yearNumber,
          employee,
          regularHours,
          overtimeHours,
          regularPay,
          overtimePay,
          benefitsPay,
          totalPay: regularPay + overtimePay + benefitsPay,
          timeEntries: entries,
          status: entries[0].paymentStatus,
        }
      })
      .filter(Boolean) as UnionPayment[]
  } catch (error) {
    console.error('Error fetching union payments:', error)
  }
}

const updatePaymentStatus = async (status: PaymentStatus) => {
  try {
    const updatePromises = Array.from(selectedPayments.value).map(async (key) => {
      const [employeeId, weekNumber, yearNumber] = key.split('-')
      return fetch('/api/time-entries/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: parseInt(employeeId),
          weekNumber: parseInt(weekNumber),
          yearNumber: parseInt(yearNumber),
          status,
        }),
      })
    })

    await Promise.all(updatePromises)
    await fetchUnionPayments()
    selectedPayments.value.clear()
  } catch (error) {
    console.error('Error updating payment status:', error)
  }
}

const openPaymentHistory = async (employeeId: number) => {
  selectedEmployeeId.value = employeeId
  await fetchPaymentHistory(employeeId)
  showPaymentHistory.value = true
}

// Watchers
watch([selectedWeek], () => {
  if (selectedWeek.value) {
    fetchUnionPayments()
  }
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
            v-for="mode in ['entry', 'calendar', 'manage']"
            :key="mode"
            @click="viewMode = mode"
            :class="[
              'px-4 py-2 rounded-md',
              viewMode === mode ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100',
            ]"
          >
            {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
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
    </div>

    <!-- Calendar Grid -->
    <div v-if="viewMode === 'calendar'" class="bg-white rounded-lg shadow-sm mt-4">
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

    <!-- Manage View -->
    <div v-if="viewMode === 'manage'" class="space-y-6">
      <!-- Tab Navigation -->
      <div class="bg-white rounded-lg p-4 shadow-sm">
        <div class="flex space-x-4">
          <button
            v-for="tab in ['entries', 'local', 'union']"
            :key="tab"
            @click="manageViewTab = tab"
            :class="[
              'px-4 py-2 rounded-md',
              manageViewTab === tab
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100',
            ]"
          >
            {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
          </button>
        </div>
      </div>

      <!-- Time Entries Management -->
      <div v-if="manageViewTab === 'entries'" class="space-y-6">
        <!-- Filters -->
        <div class="bg-white rounded-lg p-6 shadow-sm space-y-4">
          <div class="grid grid-cols-2 gap-4">
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
        </div>

        <!-- Actions -->
        <div class="flex justify-between items-center">
          <div>
            <span class="text-gray-700"> {{ selectedEntries.size }} entries selected </span>
          </div>
          <button
            v-if="selectedEntries.size > 0"
            @click="deleteTimeEntries"
            class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Delete Selected
          </button>
        </div>

        <!-- Entries Table -->
        <div class="bg-white rounded-lg shadow-sm">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr class="bg-gray-50">
                <th class="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    :checked="selectedEntries.size === timeEntriesWithDetails.length"
                    @change="
                      (e) => {
                        if (e.target.checked) {
                          timeEntriesWithDetails.forEach((entry) => selectedEntries.add(entry.id))
                        } else {
                          selectedEntries.clear()
                        }
                      }
                    "
                    class="rounded border-gray-300"
                  />
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Employee
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Project
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hours
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="entry in timeEntriesWithDetails" :key="entry.id">
                <td class="px-6 py-4">
                  <input
                    type="checkbox"
                    :checked="selectedEntries.has(entry.id)"
                    @change="
                      (e) => {
                        if (e.target.checked) {
                          selectedEntries.add(entry.id)
                        } else {
                          selectedEntries.delete(entry.id)
                        }
                      }
                    "
                    class="rounded border-gray-300"
                  />
                </td>
                <td class="px-6 py-4">{{ formatDate(entry.date) }}</td>
                <td class="px-6 py-4">
                  {{ entry.employee.firstName }} {{ entry.employee.lastName }}
                  <span
                    class="ml-1 text-xs px-2 py-0.5 rounded-full"
                    :class="{
                      'bg-blue-100 text-blue-800': entry.employee.employeeType === 'LOCAL',
                      'bg-green-100 text-green-800': entry.employee.employeeType === 'UNION',
                    }"
                  >
                    {{ entry.employee.employeeType }}
                  </span>
                </td>
                <td class="px-6 py-4">{{ entry.project?.name || '-' }}</td>
                <td class="px-6 py-4">
                  <div>Regular: {{ entry.regularHours }}h</div>
                  <div>OT: {{ entry.overtimeHours }}h</div>
                </td>
                <td class="px-6 py-4">
                  <span
                    class="px-2 py-1 text-xs rounded-full"
                    :class="{
                      'bg-yellow-100 text-yellow-800': entry.paymentStatus === 'PENDING',
                      'bg-blue-100 text-blue-800': entry.paymentStatus === 'PROCESSING',
                      'bg-green-100 text-green-800': entry.paymentStatus === 'PAID',
                      'bg-red-100 text-red-800': entry.paymentStatus === 'CANCELLED',
                    }"
                  >
                    {{ entry.paymentStatus }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <button @click="openEditModal(entry)" class="text-gray-600 hover:text-gray-900">
                    <PencilIcon class="w-5 h-5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Add inside the manage view div -->
        <!-- Edit Modal -->
        <div
          v-if="showEditModal && editingEntry"
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        >
          <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-bold">Edit Time Entry</h2>
              <button @click="showEditModal = false" class="text-gray-500 hover:text-gray-700">
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>

            <form @submit.prevent="handleEditSave" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Regular Hours</label>
                <input
                  v-model="editingEntry.regularHours"
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Overtime Hours</label>
                <input
                  v-model="editingEntry.overtimeHours"
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  @click="showEditModal = false"
                  class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Local Employee Payments -->

      <div v-if="manageViewTab === 'local'" class="space-y-6">
        <!-- Week Selection -->
        <div class="bg-white rounded-lg p-6 shadow-sm">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Select Week</label>
              <input
                type="week"
                :value="
                  selectedWeek
                    ? `${selectedWeek.yearNumber}-W${String(selectedWeek.weekNumber).padStart(2, '0')}`
                    : ''
                "
                @input="
                  (e) => {
                    const [year, week] = e.target.value.split('-W')
                    selectedWeek = {
                      weekNumber: parseInt(week),
                      yearNumber: parseInt(year),
                    }
                  }
                "
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-between items-center">
          <div>
            <span class="text-gray-700"> {{ selectedPayments.size }} payments selected </span>
          </div>
          <div class="flex space-x-3" v-if="selectedPayments.size > 0">
            <button
              @click="updatePaymentStatus('PROCESSING')"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Mark Processing
            </button>
            <button
              @click="updatePaymentStatus('PAID')"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Mark Paid
            </button>
          </div>
        </div>

        <!-- Payments Table -->
        <div class="bg-white rounded-lg shadow-sm">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr class="bg-gray-50">
                <th class="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    :checked="selectedPayments.size === weeklyPayments.length"
                    @change="
                      (e) => {
                        if (e.target.checked) {
                          weeklyPayments.forEach((payment) => {
                            selectedPayments.add(
                              `${payment.employee.id}-${payment.weekNumber}-${payment.yearNumber}`,
                            )
                          })
                        } else {
                          selectedPayments.clear()
                        }
                      }
                    "
                    class="rounded border-gray-300"
                  />
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Employee
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Regular Hours
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  OT Hours
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Regular Pay
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  OT Pay
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="payment in weeklyPayments"
                :key="`${payment.employee.id}-${payment.weekNumber}-${payment.yearNumber}`"
              >
                <td class="px-6 py-4">
                  <input
                    type="checkbox"
                    :checked="
                      selectedPayments.has(
                        `${payment.employee.id}-${payment.weekNumber}-${payment.yearNumber}`,
                      )
                    "
                    @change="
                      (e) => {
                        const key = `${payment.employee.id}-${payment.weekNumber}-${payment.yearNumber}`
                        if (e.target.checked) {
                          selectedPayments.add(key)
                        } else {
                          selectedPayments.delete(key)
                        }
                      }
                    "
                    class="rounded border-gray-300"
                  />
                </td>
                <td class="px-6 py-4">
                  {{ payment.employee.firstName }} {{ payment.employee.lastName }}
                  <div class="text-sm text-gray-500">${{ payment.employee.hourlyRate }}/hr</div>
                </td>
                <td class="px-6 py-4 text-right">{{ payment.regularHours }}</td>
                <td class="px-6 py-4 text-right">{{ payment.overtimeHours }}</td>
                <td class="px-6 py-4 text-right">{{ formatCurrency(payment.regularPay) }}</td>
                <td class="px-6 py-4 text-right">{{ formatCurrency(payment.overtimePay) }}</td>
                <td class="px-6 py-4 text-right font-medium">
                  {{ formatCurrency(payment.totalPay) }}
                </td>
                <td class="px-6 py-4">
                  <span
                    class="px-2 py-1 text-xs rounded-full"
                    :class="{
                      'bg-yellow-100 text-yellow-800': payment.status === 'PENDING',
                      'bg-blue-100 text-blue-800': payment.status === 'PROCESSING',
                      'bg-green-100 text-green-800': payment.status === 'PAID',
                      'bg-red-100 text-red-800': payment.status === 'CANCELLED',
                    }"
                  >
                    {{ payment.status }}
                  </span>
                  <button
                    @click="openPaymentHistory(payment.employee.id)"
                    class="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                  >
                    View History
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-gray-50">
              <tr>
                <td colspan="2" class="px-6 py-4 font-medium">Totals</td>
                <td class="px-6 py-4 text-right font-medium">
                  {{ weeklyPayments.reduce((sum, p) => sum + p.regularHours, 0) }}
                </td>
                <td class="px-6 py-4 text-right font-medium">
                  {{ weeklyPayments.reduce((sum, p) => sum + p.overtimeHours, 0) }}
                </td>
                <td class="px-6 py-4 text-right font-medium">
                  {{ formatCurrency(weeklyPayments.reduce((sum, p) => sum + p.regularPay, 0)) }}
                </td>
                <td class="px-6 py-4 text-right font-medium">
                  {{ formatCurrency(weeklyPayments.reduce((sum, p) => sum + p.overtimePay, 0)) }}
                </td>
                <td class="px-6 py-4 text-right font-medium">
                  {{ formatCurrency(weeklyPayments.reduce((sum, p) => sum + p.totalPay, 0)) }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Payment History Modal -->
        <div
          v-if="showPaymentHistory"
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        >
          <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-bold">Payment History</h2>
              <button @click="showPaymentHistory = false" class="text-gray-500 hover:text-gray-700">
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>

            <div class="space-y-4">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr class="bg-gray-50">
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Week
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date Paid
                      </th>
                      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr v-for="payment in paymentHistory" :key="payment.id">
                      <td class="px-6 py-4">
                        Week {{ payment.weekNumber }}, {{ payment.yearNumber }}
                      </td>
                      <td class="px-6 py-4">{{ formatDate(payment.date) }}</td>
                      <td class="px-6 py-4 text-right">{{ formatCurrency(payment.amount) }}</td>
                      <td class="px-6 py-4">
                        <span
                          class="px-2 py-1 text-xs rounded-full"
                          :class="{
                            'bg-yellow-100 text-yellow-800': payment.status === 'PENDING',
                            'bg-blue-100 text-blue-800': payment.status === 'PROCESSING',
                            'bg-green-100 text-green-800': payment.status === 'PAID',
                            'bg-red-100 text-red-800': payment.status === 'CANCELLED',
                          }"
                        >
                          {{ payment.status }}
                        </span>
                      </td>
                      <td class="px-6 py-4">{{ payment.notes || '-' }}</td>
                    </tr>
                  </tbody>
                  <tfoot class="bg-gray-50">
                    <tr>
                      <td colspan="2" class="px-6 py-4 font-medium">Total</td>
                      <td class="px-6 py-4 text-right font-medium">
                        {{ formatCurrency(paymentHistory.reduce((sum, p) => sum + p.amount, 0)) }}
                      </td>
                      <td colspan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Union Employee Payments -->
      <div v-else-if="manageViewTab === 'union'" class="space-y-6">
        <div class="space-y-6">
          <!-- Week Selection & Class Filter -->
          <div class="bg-white rounded-lg p-6 shadow-sm">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Select Week</label>
                <input
                  type="week"
                  :value="
                    selectedWeek
                      ? `${selectedWeek.yearNumber}-W${String(selectedWeek.weekNumber).padStart(2, '0')}`
                      : ''
                  "
                  @input="
                    (e) => {
                      const [year, week] = e.target.value.split('-W')
                      selectedWeek = {
                        weekNumber: parseInt(week),
                        yearNumber: parseInt(year),
                      }
                    }
                  "
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Union Classification</label>
                <select
                  v-model="selectedUnionClass"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">All Classifications</option>
                  <option
                    v-for="unionClass in unionClasses"
                    :key="unionClass.id"
                    :value="unionClass.id"
                  >
                    {{ unionClass.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Summary Cards -->
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-white p-6 rounded-lg shadow-sm">
              <h3 class="text-sm font-medium text-gray-500">Total Hours</h3>
              <div class="mt-2 space-y-1">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-500">Regular:</span>
                  <span class="font-medium">{{ summaryStats.totalRegularHours.toFixed(1) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-500">Overtime:</span>
                  <span class="font-medium">{{ summaryStats.totalOvertimeHours.toFixed(1) }}</span>
                </div>
              </div>
            </div>

            <div class="bg-white p-6 rounded-lg shadow-sm">
              <h3 class="text-sm font-medium text-gray-500">Wages Due</h3>
              <div class="mt-2 space-y-1">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-500">Regular:</span>
                  <span class="font-medium">{{
                    formatCurrency(summaryStats.totalRegularPay)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-500">Overtime:</span>
                  <span class="font-medium">{{
                    formatCurrency(summaryStats.totalOvertimePay)
                  }}</span>
                </div>
              </div>
            </div>

            <div class="bg-white p-6 rounded-lg shadow-sm">
              <h3 class="text-sm font-medium text-gray-500">Benefits & Total</h3>
              <div class="mt-2 space-y-1">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-500">Benefits:</span>
                  <span class="font-medium">{{
                    formatCurrency(summaryStats.totalBenefitsPay)
                  }}</span>
                </div>
                <div class="flex justify-between font-medium text-lg">
                  <span>Total:</span>
                  <span>{{ formatCurrency(summaryStats.totalPay) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-between items-center">
            <div>
              <span class="text-gray-700">{{ selectedPayments.size }} payments selected</span>
            </div>
            <div class="flex space-x-3" v-if="selectedPayments.size > 0">
              <button
                @click="updatePaymentStatus('PROCESSING')"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Mark Processing
              </button>
              <button
                @click="updatePaymentStatus('PAID')"
                class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Mark Paid
              </button>
            </div>
          </div>

          <!-- Payments Table -->
          <div class="bg-white rounded-lg shadow-sm">
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr class="bg-gray-50">
                  <th class="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      :checked="selectedPayments.size === filteredPayments.length"
                      @change="
                        (e) => {
                          if (e.target.checked) {
                            filteredPayments.forEach((payment) =>
                              selectedPayments.add(
                                `${payment.employee.id}-${payment.weekNumber}-${payment.yearNumber}`,
                              ),
                            )
                          } else {
                            selectedPayments.clear()
                          }
                        }
                      "
                      class="rounded border-gray-300"
                    />
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employee
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Regular Hours
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    OT Hours
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Regular Pay
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    OT Pay
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Benefits
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="payment in filteredPayments"
                  :key="`${payment.employee.id}-${payment.weekNumber}-${payment.yearNumber}`"
                >
                  <td class="px-6 py-4">
                    <input
                      type="checkbox"
                      :checked="
                        selectedPayments.has(
                          `${payment.employee.id}-${payment.weekNumber}-${payment.yearNumber}`,
                        )
                      "
                      @change="
                        (e) => {
                          const key = `${payment.employee.id}-${payment.weekNumber}-${payment.yearNumber}`
                          if (e.target.checked) {
                            selectedPayments.add(key)
                          } else {
                            selectedPayments.delete(key)
                          }
                        }
                      "
                      class="rounded border-gray-300"
                    />
                  </td>
                  <td class="px-6 py-4">
                    {{ payment.employee.firstName }} {{ payment.employee.lastName }}
                    <div class="text-sm text-gray-500">{{ payment.employee.unionClass?.name }}</div>
                  </td>
                  <td class="px-6 py-4 text-right">{{ payment.regularHours.toFixed(1) }}</td>
                  <td class="px-6 py-4 text-right">{{ payment.overtimeHours.toFixed(1) }}</td>
                  <td class="px-6 py-4 text-right">{{ formatCurrency(payment.regularPay) }}</td>
                  <td class="px-6 py-4 text-right">{{ formatCurrency(payment.overtimePay) }}</td>
                  <td class="px-6 py-4 text-right">{{ formatCurrency(payment.benefitsPay) }}</td>
                  <td class="px-6 py-4 text-right font-medium">
                    {{ formatCurrency(payment.totalPay) }}
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="px-2 py-1 text-xs rounded-full"
                      :class="{
                        'bg-yellow-100 text-yellow-800': payment.status === 'PENDING',
                        'bg-blue-100 text-blue-800': payment.status === 'PROCESSING',
                        'bg-green-100 text-green-800': payment.status === 'PAID',
                        'bg-red-100 text-red-800': payment.status === 'CANCELLED',
                      }"
                    >
                      {{ payment.status }}
                    </span>
                    <button
                      @click="openPaymentHistory(payment.employee.id)"
                      class="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                    >
                      View History
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-gray-50">
                <tr>
                  <td colspan="2" class="px-6 py-4 font-medium">Totals</td>
                  <td class="px-6 py-4 text-right font-medium">
                    {{ summaryStats.totalRegularHours.toFixed(1) }}
                  </td>
                  <td class="px-6 py-4 text-right font-medium">
                    {{ summaryStats.totalOvertimeHours.toFixed(1) }}
                  </td>
                  <td class="px-6 py-4 text-right font-medium">
                    {{ formatCurrency(summaryStats.totalRegularPay) }}
                  </td>
                  <td class="px-6 py-4 text-right font-medium">
                    {{ formatCurrency(summaryStats.totalOvertimePay) }}
                  </td>
                  <td class="px-6 py-4 text-right font-medium">
                    {{ formatCurrency(summaryStats.totalBenefitsPay) }}
                  </td>
                  <td class="px-6 py-4 text-right font-medium">
                    {{ formatCurrency(summaryStats.totalPay) }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Payment History Modal -->
          <div
            v-if="showPaymentHistory"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          >
            <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold">Payment History</h2>
                <button
                  @click="showPaymentHistory = false"
                  class="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon class="w-6 h-6" />
                </button>
              </div>

              <div class="space-y-4">
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Week
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date Paid
                        </th>
                        <th
                          class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                        >
                          Amount
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                      <tr v-for="payment in paymentHistory" :key="payment.id">
                        <td class="px-6 py-4">
                          Week {{ payment.weekNumber }}, {{ payment.yearNumber }}
                        </td>
                        <td class="px-6 py-4">{{ formatDate(payment.date) }}</td>
                        <td class="px-6 py-4 text-right">{{ formatCurrency(payment.amount) }}</td>
                        <td class="px-6 py-4">
                          <span
                            class="px-2 py-1 text-xs rounded-full"
                            :class="{
                              'bg-yellow-100 text-yellow-800': payment.status === 'PENDING',
                              'bg-blue-100 text-blue-800': payment.status === 'PROCESSING',
                              'bg-green-100 text-green-800': payment.status === 'PAID',
                              'bg-red-100 text-red-800': payment.status === 'CANCELLED',
                            }"
                          >
                            {{ payment.status }}
                          </span>
                        </td>
                        <td class="px-6 py-4">{{ payment.notes || '-' }}</td>
                      </tr>
                    </tbody>
                    <tfoot class="bg-gray-50">
                      <tr>
                        <td colspan="2" class="px-6 py-4 font-medium">Total</td>
                        <td class="px-6 py-4 text-right font-medium">
                          {{ formatCurrency(paymentHistory.reduce((sum, p) => sum + p.amount, 0)) }}
                        </td>
                        <td colspan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="viewMode === 'entry'" class="space-y-6">
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
