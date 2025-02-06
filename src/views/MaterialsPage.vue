<!-- MaterialsPage.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'

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

const materials = ref<MaterialWithPrices[]>([])
const vendors = ref<Vendor[]>([])
const showMaterialModal = ref(false)
const showVendorModal = ref(false)
const showPriceModal = ref(false)
const selectedMaterial = ref<Material | null>(null)
const searchQuery = ref('')
const categoryFilter = ref<'ALL' | 'MATERIAL' | 'TOOL'>('ALL')

const fetchMaterials = async () => {
  try {
    const response = await fetch('/api/materials')
    const data = await response.json()
    materials.value = data.map((m) => ({ ...m, showPrices: false }))
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
      resetForm()
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
      newVendor.value = {
        name: '',
        contactInfo: '',
        address: '',
      }
    }
  } catch (error) {
    console.error('Error creating vendor:', error)
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
      newPrice.value = {
        materialId: '',
        vendorId: '',
        price: 0,
      }
    }
  } catch (error) {
    console.error('Error adding price:', error)
  }
}

onMounted(() => {
  fetchMaterials()
  fetchVendors()
})

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

const getBestPrice = (material: MaterialWithPrices) => {
  if (!material.priceHistory.length) return null
  return material.priceHistory.reduce((best, current) =>
    current.price < best.price ? current : best,
  )
}

const resetForm = () => {
  newMaterial.value = {
    name: '',
    description: '',
    unit: '',
    category: 'MATERIAL',
    type: '',
  }
  selectedMaterial.value = null
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
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Materials & Tools</h1>
        <p class="text-gray-600">Compare prices across vendors</p>
      </div>
      <div class="flex space-x-3">
        <button
          @click="showVendorModal = true"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          + Add Vendor
        </button>
        <button
          @click="showMaterialModal = true"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Item
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg p-6 shadow-sm space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search materials or tools..."
            class="w-full rounded-md border border-gray-300 px-4 py-2"
          />
        </div>
        <div class="flex justify-end space-x-4">
          <button
            v-for="category in ['ALL', 'MATERIAL', 'TOOL']"
            :key="category"
            @click="categoryFilter = category"
            :class="[
              'px-4 py-2 rounded-md',
              categoryFilter === category
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100',
            ]"
          >
            {{ category === 'ALL' ? 'All Items' : `${category}s` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Materials Table -->
    <div class="bg-white rounded-lg shadow-sm">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr class="bg-gray-50">
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Best Price
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Last Updated
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="material in filteredMaterials" :key="material.id">
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
                  class="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {{ material.showPrices ? 'Hide Prices' : 'Show Prices' }}
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
            <td class="px-6 py-4">
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="{
                  'bg-blue-100 text-blue-800': material.category === 'MATERIAL',
                  'bg-green-100 text-green-800': material.category === 'TOOL',
                }"
              >
                {{ material.type }}
              </span>
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
                  @click="((showPriceModal = true), (selectedMaterial = material))"
                  class="text-blue-600 hover:text-blue-900"
                >
                  Add Price
                </button>
                <button class="text-gray-600 hover:text-gray-900">
                  <PencilIcon class="h-5 w-5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Material Modal -->
    <div
      v-if="showMaterialModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">Add New Item</h2>
          <button @click="showMaterialModal = false" class="text-gray-500 hover:text-gray-700">
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
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              v-model="newMaterial.description"
              rows="2"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Category</label>
              <select
                v-model="newMaterial.category"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
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
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Unit</label>
              <input
                v-model="newMaterial.unit"
                type="text"
                required
                placeholder="e.g. Each, Box, Kg"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showMaterialModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Vendor Modal -->
    <div
      v-if="showVendorModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">Add New Vendor</h2>
          <button @click="showVendorModal = false" class="text-gray-500 hover:text-gray-700">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="createVendor" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Vendor Name</label>
            <input
              v-model="newVendor.name"
              type="text"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Contact Information</label>
            <input
              v-model="newVendor.contactInfo"
              type="text"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              v-model="newVendor.address"
              rows="2"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            ></textarea>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showVendorModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Vendor
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Price Modal -->
    <div
      v-if="showPriceModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">Add Price</h2>
          <button @click="showPriceModal = false" class="text-gray-500 hover:text-gray-700">
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
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
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
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showPriceModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Price
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
