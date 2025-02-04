<!-- FinancialTab.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Line, Pie } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
)

const props = defineProps<{
  projectId: string
}>()

interface ExpenseSummary {
  material: number
  tools: number
  rentals: number
  operational: number
}

interface LaborCost {
  unionBase: number
  unionBenefits: number
  unionCustomRates: {
    name: string
    amount: number
  }[]
  local: number
}

const contractValue = ref(0)
const completedValue = ref(0)
const expenses = ref<ExpenseSummary>({
  material: 0,
  tools: 0,
  rentals: 0,
  operational: 0,
})

const laborCosts = ref<LaborCost>({
  unionBase: 0,
  unionBenefits: 0,
  unionCustomRates: [],
  local: 0,
})

const monthlyData = ref([])

const totalExpenses = computed(
  () =>
    expenses.value.material +
    expenses.value.tools +
    expenses.value.rentals +
    expenses.value.operational,
)

const totalLaborCost = computed(() => {
  const totalCustomRates = Array.isArray(laborCosts.value.unionCustomRates)
    ? laborCosts.value.unionCustomRates.reduce((sum, rate) => sum + (Number(rate.amount) || 0), 0)
    : 0

  return (
    Number(laborCosts.value.unionBase || 0) +
    Number(laborCosts.value.unionBenefits || 0) +
    Number(laborCosts.value.local || 0) +
    totalCustomRates +
    payrollBurden.value
  )
})

const totalBenefitsPay = computed(() => {
  const customRatesTotal = Array.isArray(laborCosts.value.unionCustomRates)
    ? laborCosts.value.unionCustomRates.reduce((sum, rate) => sum + (Number(rate.amount) || 0), 0)
    : 0

  return Number(laborCosts.value.unionBenefits || 0) + customRatesTotal
})

const payrollBurden = computed(() => laborCosts.value.unionBase * 0.2)

const totalCost = computed(() => totalExpenses.value + totalLaborCost.value)

const costPerDollarOfWork = computed(() => totalCost.value / completedValue.value)

// Current performance
const currentProfit = computed(() => completedValue.value - totalCost.value)

const currentProfitMargin = computed(() =>
  completedValue.value > 0 ? (currentProfit.value / completedValue.value) * 100 : 0,
)

// Project total based on current performance
const totalProjectedCost = computed(() => contractValue.value * costPerDollarOfWork.value)

const projectedProfit = computed(() => contractValue.value - totalProjectedCost.value)

const projectedProfitMargin = computed(() =>
  contractValue.value > 0 ? (projectedProfit.value / contractValue.value) * 100 : 0,
)

const pieChartData = computed(() => {
  const baseData = [
    Number(laborCosts.value.unionBase) || 0,
    totalBenefitsPay.value,
    Number(laborCosts.value.local) || 0,
  ]

  return {
    labels: ['Union Base Labor', 'Union Benefits & Custom Rates', 'Local Labor'],
    datasets: [
      {
        data: baseData,
        backgroundColor: ['#4F46E5', '#60A5FA', '#34D399'],
      },
    ],
  }
})

const fetchProjectFinancials = async () => {
  try {
    const [projectRes, completedValueRes, expensesRes, laborRes] = await Promise.all([
      fetch(`/api/projects/${props.projectId}`),
      fetch(`/api/projects/${props.projectId}/completed-value`),
      fetch(`/api/projects/${props.projectId}/expenses/summary`),
      fetch(`/api/projects/${props.projectId}/labor/summary`),
    ])

    const project = await projectRes.json()
    const completedData = await completedValueRes.json()
    const expenseData = await expensesRes.json()
    const laborData = await laborRes.json()

    contractValue.value = project.contractValue
    completedValue.value = completedData.completedValue
    expenses.value = expenseData

    const customRatesArray = Object.entries(laborData.unionCustomRates || {}).map(
      ([name, amount]) => ({
        name,
        amount: Number(amount) || 0,
      }),
    )

    laborCosts.value = {
      unionBase: Number(laborData.unionBase) || 0,
      unionBenefits: Number(laborData.unionBenefits) || 0,
      unionCustomRates: customRatesArray,
      local: Number(laborData.local) || 0,
    }
  } catch (error) {
    console.error('Error fetching financial data:', error)
  }
}

const fetchMonthlyData = async () => {
  try {
    const response = await fetch(`/api/projects/${props.projectId}/financials/monthly`)
    monthlyData.value = await response.json()
  } catch (error) {
    console.error('Error fetching monthly data:', error)
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

onMounted(() => {
  fetchProjectFinancials()
  fetchMonthlyData()
})
</script>

<template>
  <div class="space-y-6 p-6">
    <!-- Overview Cards -->
    <div class="grid grid-cols-4 gap-4">
      <!-- Contract Value -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Contract Value</h3>
        <p class="mt-2 text-2xl font-bold">{{ formatCurrency(contractValue) }}</p>
        <div class="mt-2 text-sm text-gray-500">
          <div class="flex justify-between">
            <span>Completed:</span>
            <span>{{ formatCurrency(completedValue) }}</span>
          </div>
          <div class="flex justify-between">
            <span>Remaining:</span>
            <span>{{ formatCurrency(contractValue - completedValue) }}</span>
          </div>
          <div class="flex justify-between mt-1">
            <span>% Complete:</span>
            <span>{{ ((completedValue / contractValue) * 100).toFixed(1) }}%</span>
          </div>
        </div>
      </div>

      <!-- Total Expenses -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Total Expenses</h3>
        <p class="mt-2 text-2xl font-bold">{{ formatCurrency(totalExpenses) }}</p>
        <div class="mt-2 space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Material:</span>
            <span>{{ formatCurrency(expenses.material) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Tools:</span>
            <span>{{ formatCurrency(expenses.tools) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Rentals:</span>
            <span>{{ formatCurrency(expenses.rentals) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Operational:</span>
            <span>{{ formatCurrency(expenses.operational) }}</span>
          </div>
        </div>
      </div>

      <!-- Labor Costs -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Total Labor Costs</h3>
        <p class="mt-2 text-2xl font-bold">{{ formatCurrency(totalLaborCost) }}</p>
        <div class="mt-2 space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Union Base Pay:</span>
            <span>{{ formatCurrency(laborCosts.unionBase) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Union Benefits Pay:</span>
            <span>{{ formatCurrency(laborCosts.unionBenefits) }}</span>
          </div>
          <template v-if="laborCosts.unionCustomRates.length">
            <div
              v-for="rate in laborCosts.unionCustomRates"
              :key="rate.name"
              class="flex justify-between"
            >
              <span class="text-gray-500">{{ rate.name }}:</span>
              <span>{{ formatCurrency(rate.amount) }}</span>
            </div>
          </template>
          <div class="flex justify-between">
            <span class="text-gray-500">Local Labor Pay:</span>
            <span>{{ formatCurrency(laborCosts.local) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Burden & Overhead:</span>
            <span>{{ formatCurrency(payrollBurden) }}</span>
          </div>
        </div>
      </div>

      <!-- Profit Analysis -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500">Current Profit Analysis</h3>
        <p
          class="mt-2 text-2xl font-bold"
          :class="{
            'text-green-600': currentProfit > 0,
            'text-red-600': currentProfit < 0,
          }"
        >
          {{ formatCurrency(currentProfit) }}
        </p>
        <div class="mt-2 space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Current Completed Value:</span>
            <span>{{ formatCurrency(completedValue) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Current Total Expenses:</span>
            <span>{{ formatCurrency(totalCost) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Current Margin:</span>
            <span>{{ currentProfitMargin.toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Cost Distribution -->
      <div class="bg-white p-6 rounded-lg shadow-sm">
        <h3 class="text-lg font-medium mb-4">Cost Distribution</h3>
        <Pie
          :data="pieChartData"
          :options="{
            responsive: true,
            plugins: {
              legend: {
                position: 'right',
              },
            },
          }"
        />
      </div>

      <!-- Monthly Trend -->
      <div class="bg-white p-6 rounded-lg shadow-sm">
        <h3 class="text-lg font-medium mb-4">Monthly Cost Trend</h3>
        <Line
          :data="{
            labels: monthlyData.map((d) => d.month),
            datasets: [
              {
                label: 'Expenses',
                data: monthlyData.map((d) => d.expenses),
                borderColor: '#F87171',
                fill: false,
              },
              {
                label: 'Labor',
                data: monthlyData.map((d) => d.labor.total),
                borderColor: '#60A5FA',
                fill: false,
              },
            ],
          }"
          :options="{
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
            },
          }"
        />
      </div>
    </div>
  </div>
</template>
