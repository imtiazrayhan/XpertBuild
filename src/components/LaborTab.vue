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
}

interface ActiveWorkers {
  total: number
  local: number
  union: number
}

const timeEntries = ref<TimeEntry[]>([])
const unionStats = ref<UnionStats[]>([])
const activeWorkers = ref<ActiveWorkers>({ total: 0, local: 0, union: 0 })
const viewPeriod = ref<'week' | 'month'>('week')
const selectedWeek = ref(formatWeekString(getLastWeekDate()))
const selectedMonth = ref(getCurrentMonth())

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
  if (viewPeriod.value === 'week') {
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

async function fetchProjectLabor() {
  try {
    const { startDate, endDate } = getDateRange()

    // Format dates for API calls
    const formattedStartDate = startDate.toISOString().split('T')[0]
    const formattedEndDate = endDate.toISOString().split('T')[0]

    const [entriesRes, statsRes, workersRes] = await Promise.all([
      fetch(
        `/api/projects/${props.projectId}/labor?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
      ),
      fetch(
        `/api/projects/${props.projectId}/labor/union-stats?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
      ),
      fetch(
        `/api/projects/${props.projectId}/labor/active-workers?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
      ),
    ])

    timeEntries.value = await entriesRes.json()
    unionStats.value = await statsRes.json()
    activeWorkers.value = await workersRes.json()
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
  if (viewPeriod.value === 'week') {
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

const formatHours = (hours: number) => {
  return hours.toFixed(1)
}

const formatPercentage = (value: number, total: number) => {
  return total === 0 ? '0%' : `${((value / total) * 100).toFixed(1)}%`
}

watch([() => viewPeriod.value, () => selectedWeek.value, () => selectedMonth.value], () => {
  fetchProjectLabor()
})

onMounted(() => {
  fetchProjectLabor()
})
</script>

<template>
  <div class="space-y-6 p-6">
    <!-- Period Selection -->
    <div class="flex justify-between items-center">
      <div class="flex space-x-4">
        <button
          v-for="period in ['week', 'month']"
          :key="period"
          @click="viewPeriod = period"
          :class="[
            'px-4 py-2 rounded-md',
            viewPeriod === period ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          {{ period.charAt(0).toUpperCase() + period.slice(1) }}ly View
        </button>
      </div>
      <div>
        <span class="text-gray-600 mr-6">{{ displayDateRange }}</span>
        <input
          v-if="viewPeriod === 'week'"
          type="week"
          v-model="selectedWeek"
          class="rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          v-else
          type="month"
          v-model="selectedMonth"
          class="rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
    </div>

    <!-- Overview Cards -->
    <div class="grid grid-cols-4 gap-4">
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Active Workers</h3>
        <p class="mt-2 text-3xl font-bold">{{ activeWorkers.total }}</p>
        <div class="mt-2 text-sm">
          <div class="flex justify-between text-gray-500">
            <span>Local:</span>
            <span>{{ activeWorkers.local }}</span>
          </div>
          <div class="flex justify-between text-gray-500">
            <span>Union:</span>
            <span>{{ activeWorkers.union }}</span>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Total Hours</h3>
        <p class="mt-2 text-3xl font-bold">
          {{ formatHours(laborStats.total) }}
        </p>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Regular vs Overtime</h3>
        <div class="mt-2 space-y-2">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Regular:</span>
            <span class="font-bold">{{ formatHours(laborStats.regular) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Overtime:</span>
            <span class="font-bold">{{ formatHours(laborStats.overtime) }}</span>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Workforce Split</h3>
        <div class="mt-2 space-y-2">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Local:</span>
            <span class="font-bold">
              {{ formatPercentage(activeWorkers.local, activeWorkers.total) }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Union:</span>
            <span class="font-bold">
              {{ formatPercentage(activeWorkers.union, activeWorkers.total) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Union Classification Breakdown -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b">
        <h3 class="text-lg font-medium">Union Classification Distribution</h3>
      </div>
      <div class="p-6">
        <div class="grid grid-cols-3 gap-4">
          <div v-for="stat in unionStats" :key="stat.className" class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium">{{ stat.className }}</h4>
            <div class="mt-2 space-y-1">
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">Regular:</span>
                <span class="font-medium">{{ formatHours(stat.regularHours) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">Overtime:</span>
                <span class="font-medium">{{ formatHours(stat.overtimeHours) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">Workers:</span>
                <span class="font-medium">{{ stat.workers }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
