<!-- MaterialsPage.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'

// Register the necessary chart components
ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale)

// Data model interfaces
interface Material {
  id: string
  name: string
  description?: string
  unit: string
  category: 'MATERIAL' | 'TOOL'
  type: string
}

interface Vendor {
  id: string
  name: string
  contactInfo?: string
  address?: string
}

interface VendorPrice {
  id: string
  materialId: string
  vendorId: string
  price: number
  date: string
  vendor: Vendor
}

interface MaterialWithPrices extends Material {
  priceHistory: VendorPrice[]
  showPrices?: boolean
}

// Reactive state variables
const activeTab = ref('materials')
const materials = ref<MaterialWithPrices[]>([])
const vendors = ref<Vendor[]>([])
const showMaterialModal = ref(false)
const showVendorModal = ref(false)
const showPriceModal = ref(false)
const showDeleteModal = ref(false)
const showTrendModal = ref(false)
const selectedMaterial = ref<Material | null>(null)
const selectedVendor = ref<Vendor | null>(null)
const selectedTrendMaterial = ref<MaterialWithPrices | null>(null)
const searchQuery = ref('')
const categoryFilter = ref<'ALL' | 'MATERIAL' | 'TOOL'>('ALL')

const tabs = [
  { id: 'materials', name: 'Materials & Tools' },
  { id: 'vendors', name: 'Vendors' },
]

const newMaterial = ref({
  name: '',
  description: '',
  unit: '',
  category: 'MATERIAL',
  type: '',
})

const newVendor = ref({
  name: '',
  contactInfo: '',
  address: '',
})

const newPrice = ref({
  materialId: '',
  vendorId: '',
  price: 0,
})

// Computed: Filtered materials based on search query and category
const filteredMaterials = computed(() => {
  return materials.value.filter((material) => {
    const matchesSearch =
      material.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      material.type.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory =
      categoryFilter.value === 'ALL' || material.category === categoryFilter.value
    return matchesSearch && matchesCategory
  })
})

// Helper to get the best (lowest) price from a material's priceHistory
const getBestPrice = (material: MaterialWithPrices) => {
  if (!material.priceHistory.length) return null
  return material.priceHistory.reduce((best, current) =>
    current.price < best.price ? current : best,
  )
}

// --- Price Trend Chart Data ---
// Compute the chart data based on the selected material's price history.
// Sorting the history by date ensures the chart displays data in chronological order.
const trendChartData = computed(() => {
  if (!selectedTrendMaterial.value) {
    return {
      labels: [],
      datasets: [],
    }
  }
  const sortedHistory = [...selectedTrendMaterial.value.priceHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  return {
    labels: sortedHistory.map((price) => new Date(price.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Price Trend',
        data: sortedHistory.map((price) => price.price),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true,
      },
    ],
  }
})

// Chart options for the trend chart
const trendChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
    },
    title: {
      display: false,
      text: 'Price Trend',
    },
  },
}

// --- API Functions ---
const fetchMaterials = async () => {
  try {
    const response = await fetch('/api/materials')
    const data = await response.json()
    materials.value = data.map((m: any) => ({ ...m, showPrices: false }))
  } catch (error) {
    console.error('Error fetching materials:', error)
  }
}

const fetchVendors = async () => {
  try {
    const response = await fetch('/api/vendors')
    vendors.value = await response.json()
  } catch (error) {
    console.error('Error fetching vendors:', error)
  }
}

const createMaterial = async () => {
  try {
    const response = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMaterial.value),
    })
    if (response.ok) {
      showMaterialModal.value = false
      await fetchMaterials()
      resetMaterialForm()
    }
  } catch (error) {
    console.error('Error creating material:', error)
  }
}

const createVendor = async () => {
  try {
    const response = await fetch('/api/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVendor.value),
    })
    if (response.ok) {
      showVendorModal.value = false
      await fetchVendors()
      resetVendorForm()
    }
  } catch (error) {
    console.error('Error creating vendor:', error)
  }
}

const editVendor = async () => {
  if (!selectedVendor.value) return
  try {
    const response = await fetch(`/api/vendors/${selectedVendor.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVendor.value),
    })
    if (response.ok) {
      showVendorModal.value = false
      await fetchVendors()
      resetVendorForm()
    }
  } catch (error) {
    console.error('Error updating vendor:', error)
  }
}

const deleteVendor = async () => {
  if (!selectedVendor.value) return
  try {
    const response = await fetch(`/api/vendors/${selectedVendor.value.id}`, {
      method: 'DELETE',
    })
    if (response.ok) {
      showDeleteModal.value = false
      await fetchVendors()
      selectedVendor.value = null
    }
  } catch (error) {
    console.error('Error deleting vendor:', error)
  }
}

const addPrice = async () => {
  if (!selectedMaterial.value) return
  try {
    const response = await fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newPrice.value,
        materialId: selectedMaterial.value.id,
      }),
    })
    if (response.ok) {
      showPriceModal.value = false
      await fetchMaterials()
      resetPriceForm()
    }
  } catch (error) {
    console.error('Error adding price:', error)
  }
}

// --- Helper Functions ---
const openEditVendorModal = (vendor: Vendor) => {
  selectedVendor.value = vendor
  newVendor.value = { ...vendor }
  showVendorModal.value = true
}

const openAddVendorModal = () => {
  resetVendorForm()
  showVendorModal.value = true
}

// Open the price trend modal and set the selected material for charting
const openTrendModal = (material: MaterialWithPrices) => {
  selectedTrendMaterial.value = material
  showTrendModal.value = true
}

const resetMaterialForm = () => {
  newMaterial.value = {
    name: '',
    description: '',
    unit: '',
    category: 'MATERIAL',
    type: '',
  }
  selectedMaterial.value = null
}

const resetVendorForm = () => {
  newVendor.value = {
    name: '',
    contactInfo: '',
    address: '',
  }
  selectedVendor.value = null
}

const resetPriceForm = () => {
  newPrice.value = {
    materialId: '',
    vendorId: '',
    price: 0,
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US')
}

onMounted(() => {
  fetchMaterials()
  fetchVendors()
})
</script>

<template>
  <div class="space-y-6 p-4">
    <!-- Tab Navigation -->
    <div class="border-b border-gray-200">
      <nav class="flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm transition-colors',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- Materials Tab -->
    <div v-if="activeTab === 'materials'" class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 class="text-2xl font-bold">Materials & Tools</h1>
          <p class="text-gray-600">Compare prices across vendors</p>
        </div>
        <button
          @click="showMaterialModal = true"
          class="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Add Item
        </button>
      </div>

      <!-- Filters -->
      <div
        class="bg-white rounded-lg p-6 shadow-sm space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4"
      >
        <div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search materials or tools..."
            class="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div class="flex justify-end space-x-4">
          <button
            v-for="category in ['ALL', 'MATERIAL', 'TOOL']"
            :key="category"
            @click="categoryFilter = category"
            :class="[
              'px-4 py-2 rounded-md transition-colors',
              categoryFilter === category
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100',
            ]"
          >
            {{ category === 'ALL' ? 'All Items' : `${category}s` }}
          </button>
        </div>
      </div>

      <!-- Materials Table -->
      <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr class="bg-gray-50">
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Best Price
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Vendor
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Last Updated
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="material in filteredMaterials"
              :key="material.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-6 py-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium text-gray-900">{{ material.name }}</div>
                    <div v-if="material.description" class="text-sm text-gray-500">
                      {{ material.description }}
                    </div>
                  </div>
                  <button
                    @click="material.showPrices = !material.showPrices"
                    class="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                  >
                    {{ material.showPrices ? 'Hide Prices' : 'Prices' }}
                  </button>
                </div>
                <div v-if="material.showPrices" class="mt-2">
                  <div class="bg-gray-50 rounded-lg p-2 space-y-2">
                    <div
                      v-for="price in material.priceHistory"
                      :key="price.id"
                      class="flex justify-between text-sm border-b border-gray-200 pb-1 last:border-0"
                    >
                      <span class="text-gray-600">{{ price.vendor.name }}</span>
                      <div class="flex space-x-4">
                        <span class="font-medium">{{ formatCurrency(price.price) }}</span>
                        <span class="text-gray-500">{{ formatDate(price.date) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">{{ material.unit }}</td>
              <td class="px-6 py-4">
                {{ getBestPrice(material) ? formatCurrency(getBestPrice(material)!.price) : '-' }}
              </td>
              <td class="px-6 py-4">
                {{ getBestPrice(material)?.vendor.name || '-' }}
              </td>
              <td class="px-6 py-4">
                {{ getBestPrice(material) ? formatDate(getBestPrice(material)!.date) : '-' }}
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-end space-x-3">
                  <button
                    @click="
                      (() => {
                        selectedMaterial = material
                        showPriceModal = true
                      })()
                    "
                    class="text-blue-600 hover:text-blue-900 transition-colors"
                  >
                    Add Price
                  </button>
                  <button
                    @click="openTrendModal(material)"
                    class="text-green-600 hover:text-green-800 transition-colors"
                  >
                    View Trend
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Vendors Tab -->
    <div v-if="activeTab === 'vendors'" class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 class="text-2xl font-bold">Vendors</h1>
          <p class="text-gray-600">Manage vendor information</p>
        </div>
        <button
          @click="openAddVendorModal"
          class="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Add Vendor
        </button>
      </div>

      <!-- Vendors Table -->
      <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr class="bg-gray-50">
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contact
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Address
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="vendor in vendors"
              :key="vendor.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-6 py-4 font-medium text-gray-900">{{ vendor.name }}</td>
              <td class="px-6 py-4">{{ vendor.contactInfo || '-' }}</td>
              <td class="px-6 py-4">{{ vendor.address || '-' }}</td>
              <td class="px-6 py-4">
                <div class="flex justify-end space-x-3">
                  <button
                    @click="openEditVendorModal(vendor)"
                    class="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <PencilIcon class="h-5 w-5" />
                  </button>
                  <button
                    @click="
                      (() => {
                        selectedVendor = vendor
                        showDeleteModal = true
                      })()
                    "
                    class="text-red-600 hover:text-red-900 transition-colors"
                  >
                    <TrashIcon class="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Material Modal -->
    <transition name="fade">
      <div
        v-if="showMaterialModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-lg p-6 shadow-2xl w-full max-w-lg mx-4">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Add New Item</h2>
            <button
              @click="showMaterialModal = false"
              class="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>
          <form @submit.prevent="createMaterial" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Name</label>
              <input
                v-model="newMaterial.name"
                type="text"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                v-model="newMaterial.description"
                rows="2"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              ></textarea>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Category</label>
                <select
                  v-model="newMaterial.category"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="MATERIAL">Material</option>
                  <option value="TOOL">Tool</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Type</label>
                <input
                  v-model="newMaterial.type"
                  type="text"
                  required
                  placeholder="e.g. Paint Brush, Cement"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700">Unit</label>
                <input
                  v-model="newMaterial.unit"
                  type="text"
                  required
                  placeholder="e.g. Each, Box, Kg"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="showMaterialModal = false"
                class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 text-white rounded-md transition-colors"
              >
                Add Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Vendor Modal -->
    <transition name="fade">
      <div
        v-if="showVendorModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-lg p-6 shadow-2xl w-full max-w-lg mx-4">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">{{ selectedVendor ? 'Edit' : 'Add New' }} Vendor</h2>
            <button
              @click="showVendorModal = false"
              class="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>
          <form @submit.prevent="selectedVendor ? editVendor() : createVendor()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Vendor Name</label>
              <input
                v-model="newVendor.name"
                type="text"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Contact Information</label>
              <input
                v-model="newVendor.contactInfo"
                type="text"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                v-model="newVendor.address"
                rows="2"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              ></textarea>
            </div>
            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="showVendorModal = false"
                class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 text-white rounded-md transition-colors"
              >
                {{ selectedVendor ? 'Save Changes' : 'Add Vendor' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Price Modal -->
    <transition name="fade">
      <div
        v-if="showPriceModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-lg p-6 shadow-2xl w-full max-w-lg mx-4">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Add Price</h2>
            <button
              @click="showPriceModal = false"
              class="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>
          <form @submit.prevent="addPrice" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Material</label>
              <input
                :value="selectedMaterial?.name"
                type="text"
                disabled
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Vendor</label>
              <select
                v-model="newPrice.vendorId"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Vendor</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Price</label>
              <input
                v-model="newPrice.price"
                type="number"
                step="0.01"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="showPriceModal = false"
                class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 text-white rounded-md transition-colors"
              >
                Add Price
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Price Trend Modal -->
    <transition name="fade">
      <div
        v-if="showTrendModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trendModalTitle"
      >
        <div class="bg-white rounded-lg p-6 shadow-2xl w-full max-w-lg mx-4">
          <div class="flex justify-between items-center mb-6">
            <h2 id="trendModalTitle" class="text-2xl font-bold">
              Price Trend - {{ selectedTrendMaterial?.name }}
            </h2>
            <button
              @click="showTrendModal = false"
              class="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>
          <div class="w-full h-64">
            <!-- The Line chart is rendered here using the computed chart data and options -->
            <Line :data="trendChartData" :options="trendChartOptions" />
          </div>
        </div>
      </div>
    </transition>

    <!-- Delete Confirmation Modal -->
    <transition name="fade">
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-lg p-6 shadow-2xl w-full max-w-md mx-4">
          <h2 class="text-2xl font-bold mb-4">Delete Vendor</h2>
          <p class="text-gray-600 mb-6">
            Are you sure you want to delete {{ selectedVendor?.name }}? This will also delete all
            associated price history.
          </p>
          <div class="flex justify-end space-x-3">
            <button
              @click="showDeleteModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="deleteVendor"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-400 text-white rounded-md transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
