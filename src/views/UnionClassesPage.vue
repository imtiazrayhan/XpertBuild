<!-- UnionClassesPage.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { XMarkIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'

interface UnionClassBaseRate {
  id: number
  regularRate: number
  overtimeRate: number
  benefitsRate: number
  effectiveDate: string
  endDate: string | null
}

interface UnionClassCustomRate {
  id: number
  name: string
  description?: string
  rate: number
  effectiveDate: string
  endDate: string | null
}

interface UnionClass {
  id: number
  name: string
  baseRates: UnionClassBaseRate[]
  customRates: UnionClassCustomRate[]
}

const unionClasses = ref<UnionClass[]>([])
const showClassModal = ref(false)
const showRateModal = ref(false)
const selectedClass = ref<UnionClass | null>(null)

const newClass = ref({
  name: '',
})

const newBaseRate = ref({
  regularRate: 0,
  overtimeRate: 0,
  benefitsRate: 0,
  effectiveDate: '',
  endDate: '',
})

const customRates = ref<{ name: string; description?: string; rate: number }[]>([])

const fetchUnionClasses = async () => {
  try {
    const response = await fetch('/api/union-classes')
    unionClasses.value = await response.json()
  } catch (error) {
    console.error('Error fetching union classes:', error)
  }
}

const createUnionClass = async () => {
  try {
    const response = await fetch('/api/union-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClass.value),
    })

    if (response.ok) {
      showClassModal.value = false
      await fetchUnionClasses()
      newClass.value.name = ''
    }
  } catch (error) {
    console.error('Error creating union class:', error)
  }
}

const addRate = async () => {
  if (!selectedClass.value) return

  try {
    const response = await fetch(`/api/union-classes/${selectedClass.value.id}/rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseRate: newBaseRate.value,
        customRates: customRates.value,
      }),
    })

    if (response.ok) {
      showRateModal.value = false
      await fetchUnionClasses()
      resetRateForm()
    }
  } catch (error) {
    console.error('Error adding rate:', error)
  }
}

const resetRateForm = () => {
  newBaseRate.value = {
    regularRate: 0,
    overtimeRate: 0,
    benefitsRate: 0,
    effectiveDate: '',
    endDate: '',
  }
  customRates.value = []
  selectedClass.value = null
}

const addCustomRate = () => {
  customRates.value.push({
    name: '',
    description: '',
    rate: 0,
  })
}

const removeCustomRate = (index: number) => {
  customRates.value.splice(index, 1)
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  date.setUTCHours(12, 0, 0, 0)
  return date.toLocaleDateString('en-US')
}

onMounted(fetchUnionClasses)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Union Classifications</h1>
        <p class="text-gray-600">Manage union classifications and rates</p>
      </div>
      <button
        @click="showClassModal = true"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        + New Classification
      </button>
    </div>

    <!-- Classifications Table -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="bg-gray-50 border-b">
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Current Rates
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="unionClass in unionClasses" :key="unionClass.id">
              <td class="px-6 py-4">{{ unionClass.name }}</td>
              <td class="px-6 py-4">
                <div v-if="unionClass.baseRates.length > 0" class="space-y-1">
                  <div class="text-sm">
                    Regular: {{ formatCurrency(unionClass.baseRates[0].regularRate) }}/hr
                  </div>
                  <div class="text-sm">
                    Overtime: {{ formatCurrency(unionClass.baseRates[0].overtimeRate) }}/hr
                  </div>
                  <div class="text-sm">
                    Benefits: {{ formatCurrency(unionClass.baseRates[0].benefitsRate) }}/hr
                  </div>
                  <div v-if="unionClass.customRates.length > 0" class="mt-2 pt-2 border-t">
                    <div
                      v-for="customRate in unionClass.customRates"
                      :key="customRate.id"
                      class="text-sm"
                    >
                      {{ customRate.name }}: {{ formatCurrency(customRate.rate) }}/hr
                    </div>
                  </div>
                </div>
                <div v-else class="text-gray-500">No rates set</div>
              </td>
              <td class="px-6 py-4">
                <button
                  @click="((selectedClass = unionClass), (showRateModal = true))"
                  class="text-blue-600 hover:text-blue-800"
                >
                  Add Rate
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Rate History -->
    <div
      v-for="unionClass in unionClasses"
      :key="unionClass.id"
      class="bg-white rounded-lg shadow-sm p-6"
    >
      <h3 class="text-lg font-medium mb-4">{{ unionClass.name }} - Rate History</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="bg-gray-50">
              <th class="px-4 py-2 text-left">Effective Date</th>
              <th class="px-4 py-2 text-left">End Date</th>
              <th class="px-4 py-2 text-left">Regular Rate</th>
              <th class="px-4 py-2 text-left">Overtime Rate</th>
              <th class="px-4 py-2 text-left">Benefits Rate</th>
              <th class="px-4 py-2 text-left">Custom Rates</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rate in unionClass.baseRates" :key="rate.id" class="border-t">
              <td class="px-4 py-2">{{ formatDate(rate.effectiveDate) }}</td>
              <td class="px-4 py-2">{{ rate.endDate ? formatDate(rate.endDate) : 'Current' }}</td>
              <td class="px-4 py-2">{{ formatCurrency(rate.regularRate) }}/hr</td>
              <td class="px-4 py-2">{{ formatCurrency(rate.overtimeRate) }}/hr</td>
              <td class="px-4 py-2">{{ formatCurrency(rate.benefitsRate) }}/hr</td>
              <td class="px-4 py-2">
                <div class="space-y-1">
                  <div
                    v-for="customRate in unionClass.customRates.filter(
                      (cr) =>
                        new Date(cr.effectiveDate) <= new Date(rate.effectiveDate) &&
                        (!cr.endDate || new Date(cr.endDate) >= new Date(rate.effectiveDate)),
                    )"
                    :key="customRate.id"
                  >
                    {{ customRate.name }}: {{ formatCurrency(customRate.rate) }}/hr
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- New Classification Modal -->
    <div
      v-if="showClassModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">New Union Classification</h2>
          <button @click="showClassModal = false" class="text-gray-500 hover:text-gray-700">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="createUnionClass" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Classification Name</label>
            <input
              v-model="newClass.name"
              type="text"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="showClassModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Classification
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- New Rate Modal -->
    <div
      v-if="showRateModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">Add Rate - {{ selectedClass?.name }}</h2>
          <button @click="showRateModal = false" class="text-gray-500 hover:text-gray-700">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="addRate" class="space-y-4">
          <!-- Base Rates -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-medium mb-4">Base Rates</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Regular Rate ($/hr)</label>
                <input
                  v-model="newBaseRate.regularRate"
                  type="number"
                  step="0.01"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Overtime Rate ($/hr)</label>
                <input
                  v-model="newBaseRate.overtimeRate"
                  type="number"
                  step="0.01"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Benefits Rate ($/hr)</label>
                <input
                  v-model="newBaseRate.benefitsRate"
                  type="number"
                  step="0.01"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
          </div>

          <!-- Date Range -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Effective Date</label>
              <input
                v-model="newBaseRate.effectiveDate"
                type="date"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">End Date (Optional)</label>
              <input
                v-model="newBaseRate.endDate"
                type="date"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <!-- Custom Rates -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-medium">Custom Rates</h3>
              <button
                type="button"
                @click="addCustomRate"
                class="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <PlusIcon class="w-5 h-5 mr-1" />
                Add Custom Rate
              </button>
            </div>

            <div
              v-for="(rate, index) in customRates"
              :key="index"
              class="border-t pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0"
            >
              <div class="flex justify-between items-start mb-2">
                <h4 class="text-sm font-medium">Custom Rate {{ index + 1 }}</h4>
                <button
                  type="button"
                  @click="removeCustomRate(index)"
                  class="text-red-600 hover:text-red-800"
                >
                  <TrashIcon class="w-5 h-5" />
                </button>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Rate Name</label>
                  <input
                    v-model="rate.name"
                    type="text"
                    required
                    class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="e.g. Health Fund"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Rate ($/hr)</label>
                  <input
                    v-model="rate.rate"
                    type="number"
                    step="0.01"
                    required
                    class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700"
                    >Description (Optional)</label
                  >
                  <input
                    v-model="rate.description"
                    type="text"
                    class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="Brief description of this rate"
                  />
                </div>
              </div>
            </div>

            <div v-if="customRates.length === 0" class="text-gray-500 text-sm text-center py-4">
              No custom rates added
            </div>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="showRateModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Rate
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
