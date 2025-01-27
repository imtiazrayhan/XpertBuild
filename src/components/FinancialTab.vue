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
  local: number
}

const contractValue = ref(0)
const expenses = ref<ExpenseSummary>({
  material: 0,
  tools: 0,
  rentals: 0,
  operational: 0,
})
const laborCosts = ref<LaborCost>({
  unionBase: 0,
  unionBenefits: 0,
  local: 0,
})

const totalExpenses = computed(
  () =>
    expenses.value.material +
    expenses.value.tools +
    expenses.value.rentals +
    expenses.value.operational,
)

const totalLaborCost = computed(
  () =>
    laborCosts.value.unionBase +
    laborCosts.value.unionBenefits +
    laborCosts.value.local +
    payrollBurden.value,
)

const payrollBurden = computed(() => laborCosts.value.unionBase * 0.2)

const totalCost = computed(() => totalExpenses.value + totalLaborCost.value + payrollBurden.value)

const projectedProfit = computed(() => contractValue.value - totalCost.value)

const profitMargin = computed(() => (projectedProfit.value / contractValue.value) * 100)

const monthlyData = ref([])

const fetchProjectFinancials = async () => {
  try {
    const [projectRes, expensesRes, laborRes] = await Promise.all([
      fetch(`/api/projects/${props.projectId}`),
      fetch(`/api/projects/${props.projectId}/expenses/summary`),
      fetch(`/api/projects/${props.projectId}/labor/summary`),
    ])

    const project = await projectRes.json()
    const expenseData = await expensesRes.json()
    const laborData = await laborRes.json()

    contractValue.value = project.contractValue
    expenses.value = expenseData
    laborCosts.value = laborData
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

const pieChartData = computed(() => ({
  labels: ['Union Labor', 'Local Labor', 'Materials', 'Tools', 'Rentals', 'Operational', 'Burden'],
  datasets: [
    {
      data: [
        laborCosts.value.unionBase + laborCosts.value.unionBenefits,
        laborCosts.value.local,
        expenses.value.material,
        expenses.value.tools,
        expenses.value.rentals,
        expenses.value.operational,
        payrollBurden.value,
      ],
      backgroundColor: [
        '#4F46E5', // Union Labor
        '#60A5FA', // Local Labor
        '#34D399', // Materials
        '#FBBF24', // Tools
        '#F87171', // Rentals
        '#A78BFA', // Operational
        '#6B7280', // Burden
      ],
    },
  ],
}))

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
        <h3 class="text-sm font-medium text-gray-500">Labor Costs</h3>
        <p class="mt-2 text-2xl font-bold">{{ formatCurrency(totalLaborCost) }}</p>
        <div class="mt-2 space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Union Base:</span>
            <span>{{ formatCurrency(laborCosts.unionBase) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Union Benefits:</span>
            <span>{{ formatCurrency(laborCosts.unionBenefits) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Local Labor:</span>
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
        <h3 class="text-sm font-medium text-gray-500">Profit Analysis</h3>
        <p
          class="mt-2 text-2xl font-bold"
          :class="{
            'text-green-600': projectedProfit > 0,
            'text-red-600': projectedProfit < 0,
          }"
        >
          {{ formatCurrency(projectedProfit) }}
        </p>
        <div class="mt-2 space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Total Cost:</span>
            <span>{{ formatCurrency(totalCost) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Margin:</span>
            <span>{{ profitMargin.toFixed(1) }}%</span>
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
                data: monthlyData.map((d) => d.labor),
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
