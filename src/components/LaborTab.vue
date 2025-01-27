<!-- LaborTab.vue -->
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
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

const props = defineProps<{
  projectId: string
}>()

interface TimeEntry {
  id: number
  employeeId: number
  date: string
  regularHours: number
  overtimeHours: number
  employee: Employee
}

interface Employee {
  id: number
  firstName: string
  lastName: string
  employeeType: 'LOCAL' | 'UNION'
  unionClassId?: number
  unionClass?: UnionClass
}

interface UnionClass {
  id: number
  name: string
}

interface UnionStats {
  className: string
  regularHours: number
  overtimeHours: number
  workers: number
  regularPay: number
  overtimePay: number
  benefitsPay: number
  totalPay: number
}

interface ActiveWorkers {
  total: number
  local: {
    count: number
    regularHours: number
    overtimeHours: number
    totalPay: number
  }
  union: {
    count: number
    regularHours: number
    overtimeHours: number
    regularPay: number
    overtimePay: number
    benefitsPay: number
    totalPay: number
  }
}

interface LocalWorkerStats {
  employeeId: number
  name: string
  hourlyRate: number
  regularHours: number
  overtimeHours: number
  regularPay: number
  overtimePay: number
  totalPay: number
}

interface LocalLaborSummary {
  totalRegularHours: number
  totalOvertimeHours: number
  totalRegularPay: number
  totalOvertimePay: number
  totalPay: number
  workerStats: LocalWorkerStats[]
}

// Add ref for local labor data
const localLaborStats = ref<LocalLaborSummary>({
  totalRegularHours: 0,
  totalOvertimeHours: 0,
  totalRegularPay: 0,
  totalOvertimePay: 0,
  totalPay: 0,
  workerStats: [],
})

const timeEntries = ref<TimeEntry[]>([])
const unionStats = ref<UnionStats[]>([])
const activeWorkers = ref<ActiveWorkers>({ total: 0, local: 0, union: 0 })
const viewPeriod = ref<'week' | 'month' | 'total'>('week')
const selectedWeek = ref(formatWeekString(getLastWeekDate()))
const selectedMonth = ref(getCurrentMonth())
const projectStartDate = ref<string>('')

// Function to get project details including start date
const fetchProjectDetails = async () => {
  try {
    const response = await fetch(`/api/projects/${props.projectId}`)
    const project = await response.json()
    projectStartDate.value = project.startDate
  } catch (error) {
    console.error('Error fetching project details:', error)
  }
}

const laborStats = computed(() => {
  const stats = {
    regular: 0,
    overtime: 0,
    total: 0,
  }

  timeEntries.value.forEach((entry) => {
    stats.regular += entry.regularHours
    stats.overtime += entry.overtimeHours
  })
  stats.total = stats.regular + stats.overtime

  return stats
})

const paymentSummary = computed(() => {
  const summary = {
    totalRegularPay: 0,
    totalOvertimePay: 0,
    totalBenefitsPay: 0,
    totalPay: 0,
  }

  // Sum up all union stats
  unionStats.value.forEach((stat) => {
    summary.totalRegularPay += stat.regularPay
    summary.totalOvertimePay += stat.overtimePay
    summary.totalBenefitsPay += stat.benefitsPay
    summary.totalPay += stat.totalPay
  })

  // Add local worker pay
  summary.totalRegularPay += activeWorkers.value.local.totalPay
  summary.totalPay += activeWorkers.value.local.totalPay

  return summary
})

function getWeekNumber(d: Date): { year: number; week: number } {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

function formatWeekString(date: Date): string {
  const { year, week } = getWeekNumber(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function normalizeDate(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(12, 0, 0, 0)
  return d
}

function getLastWeekDate(): Date {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return normalizeDate(date)
}

function getCurrentWeek(): string {
  const lastWeek = getLastWeekDate()
  const start = new Date(lastWeek)
  start.setDate(start.getDate() - start.getDay())
  return normalizeDate(start).toISOString().split('T')[0]
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getDateFromWeek(year: number, week: number): Date {
  const date = new Date(year, 0, 1)
  date.setDate(date.getDate() + (week - 1) * 7)
  return date
}

function getDateRange(): { startDate: Date; endDate: Date } {
  if (viewPeriod.value === 'total') {
    return {
      startDate: normalizeDate(new Date(projectStartDate.value)),
      endDate: normalizeDate(new Date()),
    }
  } else if (viewPeriod.value === 'week') {
    const [year, week] = selectedWeek.value.split('-W')
    const weekStart = getDateFromWeek(parseInt(year), parseInt(week))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return {
      startDate: normalizeDate(weekStart),
      endDate: normalizeDate(weekEnd),
    }
  } else {
    const [year, month] = selectedMonth.value.split('-')
    return {
      startDate: normalizeDate(new Date(parseInt(year), parseInt(month) - 1, 1)),
      endDate: normalizeDate(new Date(parseInt(year), parseInt(month), 0)),
    }
  }
}

// Add to LaborTab.vue fetchProjectLabor function

async function fetchProjectLabor() {
  try {
    const { startDate, endDate } = getDateRange()

    // Format dates for API calls
    const formattedStartDate = startDate.toISOString().split('T')[0]
    const formattedEndDate = endDate.toISOString().split('T')[0]

    const [entriesRes, statsRes, workersRes, localStatsRes] = await Promise.all([
      fetch(
        `/api/projects/${props.projectId}/labor?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
      ),
      fetch(
        `/api/projects/${props.projectId}/labor/union-stats?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
      ),
      fetch(
        `/api/projects/${props.projectId}/labor/active-workers?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
      ),
      fetch(
        `/api/projects/${props.projectId}/labor/local-stats?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
      ),
    ])

    timeEntries.value = await entriesRes.json()
    unionStats.value = await statsRes.json()
    activeWorkers.value = await workersRes.json()
    localLaborStats.value = await localStatsRes.json()
  } catch (error) {
    console.error('Error fetching labor data:', error)
  }
}

function getDateFromISOWeek(isoWeekString: string): { startDate: Date; endDate: Date } {
  const [yearStr, weekStr] = isoWeekString.split('-W')
  const year = parseInt(yearStr)
  const weekNumber = parseInt(weekStr)

  // Get January 1st of the year
  const yearStart = new Date(year, 0, 1)

  // Get to the Monday of week 1
  // If Jan 1 is not a Monday, move to the next Monday
  const mondayWeek1 = new Date(yearStart)
  const dayOffset = (8 - mondayWeek1.getDay()) % 7
  mondayWeek1.setDate(mondayWeek1.getDate() + dayOffset)

  // Get to the Sunday before the first Monday (start of week 1)
  const week1Start = new Date(mondayWeek1)
  week1Start.setDate(week1Start.getDate() - 7)

  // Calculate start date (Sunday) of target week
  const targetStart = new Date(week1Start)
  targetStart.setDate(week1Start.getDate() + (weekNumber - 1) * 7)

  // Calculate end date (Saturday)
  const targetEnd = new Date(targetStart)
  targetEnd.setDate(targetStart.getDate() + 6)

  return {
    startDate: normalizeDate(targetStart),
    endDate: normalizeDate(targetEnd),
  }
}

const displayDateRange = computed(() => {
  if (viewPeriod.value === 'total') {
    const start = new Date(projectStartDate.value)
    const end = new Date()
    return `${start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} - ${end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`
  } else if (viewPeriod.value === 'week') {
    const { startDate, endDate } = getDateFromISOWeek(selectedWeek.value)
    return `${startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })}`
  } else {
    const [year, month] = selectedMonth.value.split('-')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0)
    return `${startDate.toLocaleDateString('en-US', {
      month: 'long',
    })} ${year}`
  }
})

const unionClassDistribution = computed(() => {
  if (!timeEntries.value.length) return []

  const unionEntries = timeEntries.value.filter(
    (entry) => entry.employee.employeeType === 'UNION' && entry.employee.unionClass,
  )

  const totalHours = unionEntries.reduce(
    (sum, entry) => sum + entry.regularHours + entry.overtimeHours,
    0,
  )

  const distribution = {}
  unionEntries.forEach((entry) => {
    const className = entry.employee.unionClass?.name || 'Unknown'
    if (!distribution[className]) {
      distribution[className] = 0
    }
    distribution[className] += entry.regularHours + entry.overtimeHours
  })

  return Object.entries(distribution).map(([className, hours]) => ({
    className,
    hours,
    percentage: totalHours ? ((hours / totalHours) * 100).toFixed(1) : 0,
  }))
})

const formatHours = (hours: number) => {
  return hours.toFixed(1)
}

const formatPercentage = (value: number, total: number) => {
  return total === 0 ? '0%' : `${((value / total) * 100).toFixed(1)}%`
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

watch([() => viewPeriod.value, () => selectedWeek.value, () => selectedMonth.value], async () => {
  if (viewPeriod.value === 'total' && !projectStartDate.value) {
    await fetchProjectDetails()
  }
  fetchProjectLabor()
})

onMounted(() => {
  fetchProjectLabor()
  fetchProjectDetails()
})
</script>

<template>
  <!-- Period Selection -->
  <div class="space-y-6 p-6">
    <div class="flex justify-between items-center">
      <div class="flex space-x-4">
        <button
          v-for="period in ['week', 'month', 'total']"
          :key="period"
          @click="viewPeriod = period"
          :class="[
            'px-4 py-2 rounded-md',
            viewPeriod === period ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          {{
            period === 'total'
              ? 'Total View'
              : period.charAt(0).toUpperCase() + period.slice(1) + 'ly View'
          }}
        </button>
      </div>
      <div>
        <span class="text-gray-600 mr-6">{{ displayDateRange }}</span>
        <template v-if="viewPeriod === 'week'">
          <input
            type="week"
            v-model="selectedWeek"
            class="rounded-md border border-gray-300 px-3 py-2"
          />
        </template>
        <template v-else-if="viewPeriod === 'month'">
          <input
            type="month"
            v-model="selectedMonth"
            class="rounded-md border border-gray-300 px-3 py-2"
          />
        </template>
      </div>
    </div>

    <!-- First Row - Worker Stats -->
    <div class="grid grid-cols-4 gap-4">
      <!-- Active Workers -->
      <div
        class="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg shadow-sm border border-indigo-200"
      >
        <h3 class="text-sm font-medium text-indigo-700">Active Workers</h3>
        <p class="mt-2 text-3xl font-bold text-indigo-900">{{ activeWorkers.total }}</p>
        <div class="mt-2 space-y-1">
          <div class="flex justify-between text-indigo-600">
            <span>Local:</span>
            <span>{{ activeWorkers.local.count }}</span>
          </div>
          <div class="flex justify-between text-indigo-600">
            <span>Union:</span>
            <span>{{ activeWorkers.union.count }}</span>
          </div>
        </div>
      </div>

      <!-- Total Local Hours -->
      <div
        class="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-lg shadow-sm border border-emerald-200"
      >
        <h3 class="text-sm font-medium text-emerald-700">Total Local Hours</h3>
        <p class="mt-2 text-3xl font-bold text-emerald-900">
          {{ formatHours(activeWorkers.local.regularHours + activeWorkers.local.overtimeHours) }}
        </p>
      </div>

      <!-- Total Union Hours -->
      <div
        class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow-sm border border-blue-200"
      >
        <h3 class="text-sm font-medium text-blue-700">Total Union Hours</h3>
        <p class="mt-2 text-3xl font-bold text-blue-900">
          {{ formatHours(activeWorkers.union.regularHours + activeWorkers.union.overtimeHours) }}
        </p>
      </div>

      <!-- Regular vs Overtime -->
      <div
        class="bg-gradient-to-br from-violet-50 to-violet-100 p-6 rounded-lg shadow-sm border border-violet-200"
      >
        <h3 class="text-sm font-medium text-violet-700">Regular vs Overtime</h3>
        <div class="mt-2 space-y-2">
          <div class="flex justify-between text-violet-900">
            <span class="text-sm">Regular:</span>
            <span class="font-bold">{{ formatHours(laborStats.regular) }}</span>
          </div>
          <div class="flex justify-between text-violet-900">
            <span class="text-sm">Overtime:</span>
            <span class="font-bold">{{ formatHours(laborStats.overtime) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Second Row - Cost Summary -->
    <div class="grid grid-cols-4 gap-4">
      <div
        class="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-lg shadow-sm border border-amber-200"
      >
        <h3 class="text-sm font-medium text-amber-700">Total Labor Cost</h3>
        <p class="mt-2 text-3xl font-bold text-amber-900">
          {{ formatCurrency(paymentSummary.totalPay) }}
        </p>
      </div>

      <div
        class="bg-gradient-to-br from-rose-50 to-rose-100 p-6 rounded-lg shadow-sm border border-rose-200"
      >
        <h3 class="text-sm font-medium text-rose-700">Total Union Base Pay</h3>
        <p class="mt-2 text-3xl font-bold text-rose-900">
          {{ formatCurrency(activeWorkers.union.regularPay + activeWorkers.union.overtimePay) }}
        </p>
      </div>

      <div
        class="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-lg shadow-sm border border-teal-200"
      >
        <h3 class="text-sm font-medium text-teal-700">Total Union Benefits Pay</h3>
        <p class="mt-2 text-3xl font-bold text-teal-900">
          {{ formatCurrency(paymentSummary.totalBenefitsPay) }}
        </p>
      </div>

      <div
        class="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-lg shadow-sm border border-cyan-200"
      >
        <h3 class="text-sm font-medium text-cyan-700">Total Local Pay</h3>
        <p class="mt-2 text-3xl font-bold text-cyan-900">
          {{ formatCurrency(activeWorkers.local.totalPay) }}
        </p>
      </div>
    </div>

    <!-- Local Labor Cost Breakdown -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h2 class="text-lg font-medium mb-4">Local Labor Cost Breakdown</h2>
      <div class="grid grid-cols-2 gap-4">
        <!-- Hours Summary -->
        <div
          class="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-200"
        >
          <h3 class="font-medium text-gray-900 mb-4">Hours Summary</h3>
          <div class="space-y-3">
            <div class="flex justify-between text-gray-600">
              <span>Regular Hours:</span>
              <span class="font-medium">{{ formatHours(localLaborStats.totalRegularHours) }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Overtime Hours:</span>
              <span class="font-medium">{{ formatHours(localLaborStats.totalOvertimeHours) }}</span>
            </div>
            <div class="flex justify-between text-gray-900 font-medium">
              <span>Total Hours:</span>
              <span>{{
                formatHours(localLaborStats.totalRegularHours + localLaborStats.totalOvertimeHours)
              }}</span>
            </div>
          </div>
        </div>

        <!-- Pay Cost Summary -->
        <div
          class="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-200"
        >
          <h3 class="font-medium text-gray-900 mb-4">Pay Cost Summary</h3>
          <div class="space-y-3">
            <div class="flex justify-between text-gray-600">
              <span>Regular Pay:</span>
              <span class="font-medium">{{ formatCurrency(localLaborStats.totalRegularPay) }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Overtime Pay:</span>
              <span class="font-medium">{{
                formatCurrency(localLaborStats.totalOvertimePay)
              }}</span>
            </div>
            <div class="flex justify-between text-gray-900 font-medium">
              <span>Total Pay:</span>
              <span>{{ formatCurrency(localLaborStats.totalPay) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Union Labor Cost Breakdown -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h2 class="text-lg font-medium mb-4">Union Labor Cost Breakdown</h2>
      <div class="grid grid-cols-3 gap-4">
        <div
          v-for="stat in unionStats"
          :key="stat.className"
          class="bg-gradient-to-br from-sky-50 to-sky-100 p-6 rounded-lg border border-sky-200"
        >
          <h3 class="font-medium text-sky-900 mb-4">{{ stat.className }}</h3>
          <div class="space-y-2">
            <div class="flex justify-between text-sky-700">
              <span>Workers:</span>
              <span class="font-medium">{{ stat.workers }}</span>
            </div>
            <div class="flex justify-between text-sky-700">
              <span>Regular Hours:</span>
              <span class="font-medium">{{ formatHours(stat.regularHours) }}</span>
            </div>
            <div class="flex justify-between text-sky-700">
              <span>Overtime Hours:</span>
              <span class="font-medium">{{ formatHours(stat.overtimeHours) }}</span>
            </div>
            <div class="flex justify-between text-sky-700">
              <span>Regular Pay:</span>
              <span class="font-medium">{{ formatCurrency(stat.regularPay) }}</span>
            </div>
            <div class="flex justify-between text-sky-700">
              <span>Overtime Pay:</span>
              <span class="font-medium">{{ formatCurrency(stat.overtimePay) }}</span>
            </div>
            <div class="flex justify-between text-sky-700">
              <span>Benefits Pay:</span>
              <span class="font-medium">{{ formatCurrency(stat.benefitsPay) }}</span>
            </div>
            <div class="flex justify-between text-sky-900 font-medium pt-2 border-t border-sky-200">
              <span>Total Pay:</span>
              <span>{{ formatCurrency(stat.totalPay) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
