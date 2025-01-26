<!-- BuildingView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { XMarkIcon, PencilIcon, TrashIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'

interface WorkItem {
  id: string
  code: string
  description: string
  unit: string
  unitPrice: number
}

interface WorkItemQuantity {
  id: string
  workItemId: string
  quantity: number
  completed: number
  workItem: WorkItem
}

interface Elevation {
  id: string
  name: string
  buildingId: string
  isCompleted: boolean
  completedAt?: string
  quantities: WorkItemQuantity[]
}

interface Building {
  id: string
  name: string
  projectId: string
  elevations: Elevation[]
}

const route = useRoute()
const building = ref<Building | null>(null)
const showElevationModal = ref(false)
const isEditing = ref(false)
const selectedElevation = ref<Elevation | null>(null)
const showDeleteConfirmation = ref(false)
const projectWorkItems = ref<WorkItem[]>([])

const newElevation = ref({
  name: '',
  quantities: [] as { workItemId: string; quantity: number }[],
})

const getElevationValue = (elevation: Elevation) => {
  return elevation.quantities.reduce((total, qty) => {
    return total + qty.quantity * qty.workItem.unitPrice
  }, 0)
}

const getCompletedValue = (elevation: Elevation) => {
  if (elevation.isCompleted) {
    return getElevationValue(elevation)
  }
  return elevation.quantities.reduce((total, qty) => {
    return total + (qty.completed / qty.quantity) * qty.quantity * qty.workItem.unitPrice
  }, 0)
}

const buildingValue = computed(() => {
  if (!building.value) return 0
  return building.value.elevations.reduce((total, elevation) => {
    return total + getElevationValue(elevation)
  }, 0)
})

const buildingCompletedValue = computed(() => {
  if (!building.value) return 0
  return building.value.elevations.reduce((total, elevation) => {
    return total + getCompletedValue(elevation)
  }, 0)
})

const fetchBuilding = async () => {
  try {
    const response = await fetch(`/api/buildings/${route.params.id}`)
    building.value = await response.json()
  } catch (error) {
    console.error('Error fetching building:', error)
  }
}

const fetchProjectWorkItems = async () => {
  if (!building.value) return
  try {
    const response = await fetch(`/api/projects/${building.value.projectId}/work-items`)
    projectWorkItems.value = await response.json()
  } catch (error) {
    console.error('Error fetching work items:', error)
  }
}

const createElevation = async () => {
  if (!building.value) return

  try {
    const response = await fetch('/api/elevations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newElevation.value.name,
        buildingId: building.value.id,
        quantities: newElevation.value.quantities,
      }),
    })

    if (response.ok) {
      showElevationModal.value = false
      await fetchBuilding()
      resetForm()
    }
  } catch (error) {
    console.error('Error creating elevation:', error)
  }
}

const updateElevation = async () => {
  if (!selectedElevation.value) return

  try {
    const response = await fetch(`/api/elevations/${selectedElevation.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newElevation.value.name,
        quantities: newElevation.value.quantities,
      }),
    })

    if (response.ok) {
      showElevationModal.value = false
      await fetchBuilding()
      resetForm()
    }
  } catch (error) {
    console.error('Error updating elevation:', error)
  }
}

const deleteElevation = async () => {
  if (!selectedElevation.value) return

  try {
    const response = await fetch(`/api/elevations/${selectedElevation.value.id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      showDeleteConfirmation.value = false
      await fetchBuilding()
      selectedElevation.value = null
    }
  } catch (error) {
    console.error('Error deleting elevation:', error)
  }
}

const openElevationModal = (elevation?: Elevation) => {
  if (elevation) {
    selectedElevation.value = elevation
    newElevation.value = {
      name: elevation.name,
      quantities: elevation.quantities.map((q) => ({
        workItemId: q.workItemId,
        quantity: q.quantity,
      })),
    }
    isEditing.value = true
  } else {
    newElevation.value = {
      name: '',
      quantities: projectWorkItems.value.map((item) => ({
        workItemId: item.id,
        quantity: 0,
      })),
    }
    isEditing.value = false
  }
  showElevationModal.value = true
}

const resetForm = () => {
  newElevation.value = {
    name: '',
    quantities: [],
  }
  isEditing.value = false
  selectedElevation.value = null
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

// Add to existing data refs
const showCompletionModal = ref(false)
const selectedElevationForCompletion = ref<Elevation | null>(null)

// Add completion methods
const openCompletionModal = (elevation: Elevation) => {
  selectedElevationForCompletion.value = elevation
  showCompletionModal.value = true
}

const markElevationComplete = async () => {
  if (!selectedElevationForCompletion.value) return

  try {
    const response = await fetch(
      `/api/elevations/${selectedElevationForCompletion.value.id}/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    )

    if (response.ok) {
      showCompletionModal.value = false
      await fetchBuilding()
    }
  } catch (error) {
    console.error('Error marking elevation complete:', error)
  }
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

onMounted(async () => {
  await fetchBuilding()
  if (building.value) {
    await fetchProjectWorkItems()
  }
})
</script>

<template>
  <div v-if="building" class="space-y-6">
    <!-- Building Header -->
    <!-- Building Header -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-2xl font-bold">{{ building.name }}</h1>
        </div>
        <router-link
          :to="{ name: 'project-details', params: { id: building.projectId } }"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Back to Project
        </router-link>
      </div>

      <!-- Building Metrics -->
      <div class="mt-6 grid grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded-lg border border-gray-200">
          <h3 class="text-sm font-medium text-gray-500">Total Value</h3>
          <p class="mt-1 text-xl font-semibold">{{ formatCurrency(buildingValue) }}</p>
        </div>
        <div class="bg-white p-4 rounded-lg border border-gray-200">
          <h3 class="text-sm font-medium text-gray-500">Completed Value</h3>
          <p class="mt-1 text-xl font-semibold">{{ formatCurrency(buildingCompletedValue) }}</p>
        </div>
      </div>
    </div>

    <!-- Elevations Section -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="p-6 flex justify-between items-center">
        <h2 class="text-lg font-medium">Elevations</h2>
        <button
          @click="openElevationModal()"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Elevation
        </button>
      </div>

      <!-- Elevations Table -->
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Completed
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Progress
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="elevation in building.elevations" :key="elevation.id">
            <td class="px-6 py-4 font-medium text-gray-900">{{ elevation.name }}</td>
            <td class="px-6 py-4 text-right">{{ formatCurrency(getElevationValue(elevation)) }}</td>
            <td class="px-6 py-4 text-right">
              {{ formatCurrency(getCompletedValue(elevation)) }}
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end">
                <div class="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-[100px]">
                  <div
                    class="bg-blue-600 h-2.5 rounded-full"
                    :style="{
                      width: `${(getCompletedValue(elevation) / getElevationValue(elevation)) * 100}%`,
                    }"
                  ></div>
                </div>
                <span class="text-sm text-gray-500">
                  {{
                    Math.round((getCompletedValue(elevation) / getElevationValue(elevation)) * 100)
                  }}%
                </span>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="flex justify-end space-x-3">
                <button
                  v-if="!elevation.isCompleted"
                  @click="openCompletionModal(elevation)"
                  class="text-green-600 hover:text-green-800 ml-2 tooltip-trigger"
                  data-tooltip="Mark Complete"
                >
                  <CheckCircleIcon class="w-5 h-5" />
                </button>
                <span
                  v-else
                  class="text-green-600 ml-2 tooltip-trigger"
                  :data-tooltip="'Completed on ' + formatDate(elevation.completedAt)"
                >
                  <CheckCircleIcon class="w-5 h-5" />
                </span>
                <button
                  @click="openElevationModal(elevation)"
                  class="text-blue-600 hover:text-blue-900 tooltip-trigger"
                  data-tooltip="Edit Elevation"
                >
                  <PencilIcon class="h-5 w-5" />
                </button>
                <button
                  @click="
                    () => {
                      selectedElevation = elevation
                      showDeleteConfirmation = true
                    }
                  "
                  class="text-red-600 hover:text-red-900 tooltip-trigger"
                  data-tooltip="Delete Elevation"
                >
                  <TrashIcon class="h-5 w-5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="showCompletionModal && selectedElevationForCompletion"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Mark Elevation Complete</h3>
        <p class="text-gray-500">
          Are you sure you want to mark {{ selectedElevationForCompletion.name }} as complete? This
          will lock all quantities and mark the elevation as finished.
        </p>

        <div class="flex justify-end space-x-3 mt-6">
          <button
            @click="showCompletionModal = false"
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="markElevationComplete"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Mark Complete
          </button>
        </div>
      </div>
    </div>

    <!-- Elevation Modal -->
    <div
      v-if="showElevationModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-medium text-gray-900">
            {{ isEditing ? 'Edit' : 'New' }} Elevation
          </h3>
          <button @click="showElevationModal = false" class="text-gray-400 hover:text-gray-500">
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>

        <form @submit.prevent="isEditing ? updateElevation() : createElevation()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <input
              v-model="newElevation.name"
              type="text"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <!-- Work Items Table -->
          <div class="mt-6">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Code
                  </th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Unit
                  </th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Unit Price
                  </th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="workItem in projectWorkItems" :key="workItem.id">
                  <td class="px-4 py-2 text-sm">{{ workItem.code }}</td>
                  <td class="px-4 py-2 text-sm">{{ workItem.description }}</td>
                  <td class="px-4 py-2 text-sm text-center">{{ workItem.unit }}</td>
                  <td class="px-4 py-2 text-sm text-right">
                    {{ formatCurrency(workItem.unitPrice) }}
                  </td>
                  <td class="px-4 py-2">
                    <input
                      v-model.number="
                        newElevation.quantities.find((q) => q.workItemId === workItem.id)!.quantity
                      "
                      type="number"
                      min="0"
                      step="0.01"
                      class="block w-full rounded-md border border-gray-300 px-3 py-1 text-right"
                    />
                  </td>
                  <td class="px-4 py-2 text-right">
                    {{
                      formatCurrency(
                        workItem.unitPrice *
                          newElevation.quantities.find((q) => q.workItemId === workItem.id)!
                            .quantity,
                      )
                    }}
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-gray-50">
                <tr>
                  <td colspan="5" class="px-4 py-2 text-right font-medium">Total Value</td>
                  <td class="px-4 py-2 text-right font-medium">
                    {{
                      formatCurrency(
                        newElevation.quantities.reduce((total, qty) => {
                          const workItem = projectWorkItems.find((w) => w.id === qty.workItemId)
                          return total + (workItem ? workItem.unitPrice * qty.quantity : 0)
                        }, 0),
                      )
                    }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showElevationModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {{ isEditing ? 'Save Changes' : 'Create Elevation' }}
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
        <h3 class="text-lg font-medium text-gray-900 mb-4">Delete Elevation</h3>
        <p class="text-gray-500">
          Are you sure you want to delete {{ selectedElevation?.name }}? This action cannot be
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
            @click="deleteElevation"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.tooltip-trigger {
  position: relative;
}

.tooltip-trigger:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: #1f2937;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
}
</style>
