<!-- BuildingsTab.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'

interface Building {
  id: string
  name: string
  projectId: string
  elevations: {
    id: string
    name: string
    quantities: {
      quantity: number
      workItem: {
        unitPrice: number
      }
    }[]
  }[]
}

const props = defineProps<{
  projectId: string
}>()

const buildings = ref<Building[]>([])
const showBuildingModal = ref(false)
const isEditing = ref(false)
const selectedBuilding = ref<Building | null>(null)
const showDeleteConfirmation = ref(false)

const newBuilding = ref({
  name: '',
})

const resetForm = () => {
  newBuilding.value = {
    name: '',
  }
  isEditing.value = false
  selectedBuilding.value = null
}

const getBuildingValue = (building: Building) => {
  return building.elevations.reduce((buildingTotal, elevation) => {
    const elevationTotal = elevation.quantities.reduce((total, qty) => {
      return total + qty.quantity * qty.workItem.unitPrice
    }, 0)
    return buildingTotal + elevationTotal
  }, 0)
}

const fetchBuildings = async () => {
  try {
    const response = await fetch(`/api/buildings?projectId=${props.projectId}`)
    buildings.value = await response.json()
  } catch (error) {
    console.error('Error fetching buildings:', error)
  }
}

const createBuilding = async () => {
  try {
    const response = await fetch('/api/buildings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newBuilding.value,
        projectId: props.projectId,
      }),
    })

    if (response.ok) {
      showBuildingModal.value = false
      await fetchBuildings()
      resetForm()
    }
  } catch (error) {
    console.error('Error creating building:', error)
  }
}

const updateBuilding = async () => {
  if (!selectedBuilding.value) return

  try {
    const response = await fetch(`/api/buildings/${selectedBuilding.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBuilding.value),
    })

    if (response.ok) {
      showBuildingModal.value = false
      await fetchBuildings()
      resetForm()
    }
  } catch (error) {
    console.error('Error updating building:', error)
  }
}

const deleteBuilding = async () => {
  if (!selectedBuilding.value) return

  try {
    const response = await fetch(`/api/buildings/${selectedBuilding.value.id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      showDeleteConfirmation.value = false
      await fetchBuildings()
      selectedBuilding.value = null
    }
  } catch (error) {
    console.error('Error deleting building:', error)
  }
}

const openEditModal = (building: Building) => {
  selectedBuilding.value = building
  newBuilding.value = {
    name: building.name,
  }
  isEditing.value = true
  showBuildingModal.value = true
}

const openDeleteModal = (building: Building) => {
  selectedBuilding.value = building
  showDeleteConfirmation.value = true
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

onMounted(fetchBuildings)
</script>

<template>
  <div class="px-6 py-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-lg font-medium text-gray-900">Buildings</h2>
      <button
        @click="showBuildingModal = true"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        + Add Building
      </button>
    </div>

    <!-- Buildings Table -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Elevations
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Total Value
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="building in buildings" :key="building.id">
            <td class="px-6 py-4">
              <div class="font-medium text-gray-900">{{ building.name }}</div>
              <div v-if="building.description" class="text-sm text-gray-500">
                {{ building.description }}
              </div>
            </td>
            <td class="px-6 py-4">{{ building.elevations.length }}</td>
            <td class="px-6 py-4 text-right font-medium">
              {{ formatCurrency(getBuildingValue(building)) }}
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end space-x-3">
                <button @click="openEditModal(building)" class="text-blue-600 hover:text-blue-900">
                  <PencilIcon class="h-5 w-5" />
                </button>
                <button @click="openDeleteModal(building)" class="text-red-600 hover:text-red-900">
                  <TrashIcon class="h-5 w-5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Building Modal -->
    <div
      v-if="showBuildingModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-medium text-gray-900">
            {{ isEditing ? 'Edit' : 'New' }} Building
          </h3>
          <button @click="showBuildingModal = false" class="text-gray-400 hover:text-gray-500">
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>

        <form @submit.prevent="isEditing ? updateBuilding() : createBuilding()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <input
              v-model="newBuilding.name"
              type="text"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showBuildingModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {{ isEditing ? 'Save Changes' : 'Create Building' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirmation"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Delete Building</h3>
        <p class="text-gray-500">
          Are you sure you want to delete {{ selectedBuilding?.name }}? This action cannot be
          undone.
        </p>

        <div class="flex justify-end space-x-3 mt-6">
          <button
            @click="showDeleteConfirmation = false"
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="deleteBuilding"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
