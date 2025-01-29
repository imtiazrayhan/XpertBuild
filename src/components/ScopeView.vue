<!-- ScopeView.vue -->
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

interface SubScope {
  id: string
  name: string
  scopeId: string
  isCompleted: boolean
  completedAt?: string
  quantities: WorkItemQuantity[]
}

interface Scope {
  id: string
  name: string
  projectId: string
  subScopes: SubScope[]
}

const route = useRoute()
const scope = ref<Scope | null>(null)
const showSubScopeModal = ref(false)
const isEditing = ref(false)
const selectedSubScope = ref<SubScope | null>(null)
const showDeleteConfirmation = ref(false)
const projectWorkItems = ref<WorkItem[]>([])

const newSubScope = ref({
  name: '',
  quantities: [] as { workItemId: string; quantity: number }[],
})

const getSubScopeValue = (subScope: SubScope) => {
  return subScope.quantities.reduce((total, qty) => {
    return total + qty.quantity * qty.workItem.unitPrice
  }, 0)
}

const getCompletedValue = (subScope: SubScope) => {
  if (subScope.isCompleted) {
    return getSubScopeValue(subScope)
  }
  return subScope.quantities.reduce((total, qty) => {
    return total + (qty.completed / qty.quantity) * qty.quantity * qty.workItem.unitPrice
  }, 0)
}

const scopeValue = computed(() => {
  if (!scope.value) return 0
  return scope.value.subScopes.reduce((total, subScope) => {
    return total + getSubScopeValue(subScope)
  }, 0)
})

const scopeCompletedValue = computed(() => {
  if (!scope.value) return 0
  return scope.value.subScopes.reduce((total, subScope) => {
    return total + getCompletedValue(subScope)
  }, 0)
})

const fetchScope = async () => {
  try {
    const response = await fetch(`/api/scopes/${route.params.id}`)
    scope.value = await response.json()
  } catch (error) {
    console.error('Error fetching scope:', error)
  }
}

const fetchProjectWorkItems = async () => {
  if (!scope.value) return
  try {
    const response = await fetch(`/api/projects/${scope.value.projectId}/work-items`)
    projectWorkItems.value = await response.json()
  } catch (error) {
    console.error('Error fetching work items:', error)
  }
}

const createSubScope = async () => {
  if (!scope.value) return

  try {
    const response = await fetch('/api/sub-scopes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newSubScope.value.name,
        scopeId: scope.value.id,
        quantities: newSubScope.value.quantities,
      }),
    })

    if (response.ok) {
      showSubScopeModal.value = false
      await fetchScope()
      resetForm()
    }
  } catch (error) {
    console.error('Error creating subScope:', error)
  }
}

const updateSubScope = async () => {
  if (!selectedSubScope.value) return

  try {
    const response = await fetch(`/api/sub-scopes/${selectedSubScope.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newSubScope.value.name,
        quantities: newSubScope.value.quantities,
      }),
    })

    if (response.ok) {
      showSubScopeModal.value = false
      await fetchScope()
      resetForm()
    }
  } catch (error) {
    console.error('Error updating subScope:', error)
  }
}

const deleteSubScope = async () => {
  if (!selectedSubScope.value) return

  try {
    const response = await fetch(`/api/sub-scopes/${selectedSubScope.value.id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      showDeleteConfirmation.value = false
      await fetchScope()
      selectedSubScope.value = null
    }
  } catch (error) {
    console.error('Error deleting subScope:', error)
  }
}

const openSubScopeModal = (subScope?: SubScope) => {
  if (subScope) {
    selectedSubScope.value = subScope
    newSubScope.value = {
      name: subScope.name,
      quantities: subScope.quantities.map((q) => ({
        workItemId: q.workItemId,
        quantity: q.quantity,
      })),
    }
    isEditing.value = true
  } else {
    newSubScope.value = {
      name: '',
      quantities: projectWorkItems.value.map((item) => ({
        workItemId: item.id,
        quantity: 0,
      })),
    }
    isEditing.value = false
  }
  showSubScopeModal.value = true
}

const resetForm = () => {
  newSubScope.value = {
    name: '',
    quantities: [],
  }
  isEditing.value = false
  selectedSubScope.value = null
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

// Add to existing data refs
const showCompletionModal = ref(false)
const selectedSubScopeForCompletion = ref<SubScope | null>(null)

// Add completion methods
const openCompletionModal = (subScope: SubScope) => {
  selectedSubScopeForCompletion.value = subScope
  showCompletionModal.value = true
}

const markSubScopeComplete = async () => {
  if (!selectedSubScopeForCompletion.value) return

  try {
    const response = await fetch(
      `/api/sub-scopes/${selectedSubScopeForCompletion.value.id}/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    )

    if (response.ok) {
      showCompletionModal.value = false
      await fetchScope()
    }
  } catch (error) {
    console.error('Error marking subScope complete:', error)
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
  await fetchScope()
  if (scope.value) {
    await fetchProjectWorkItems()
  }
})
</script>

<template>
  <div v-if="scope" class="space-y-6">
    <!-- Scope Header -->
    <!-- Scope Header -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-2xl font-bold">{{ scope.name }}</h1>
        </div>
        <router-link
          :to="{ name: 'project-details', params: { id: scope.projectId } }"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Back to Project
        </router-link>
      </div>

      <!-- Scope Metrics -->
      <div class="mt-6 grid grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded-lg border border-gray-200">
          <h3 class="text-sm font-medium text-gray-500">Total Value</h3>
          <p class="mt-1 text-xl font-semibold">{{ formatCurrency(scopeValue) }}</p>
        </div>
        <div class="bg-white p-4 rounded-lg border border-gray-200">
          <h3 class="text-sm font-medium text-gray-500">Completed Value</h3>
          <p class="mt-1 text-xl font-semibold">{{ formatCurrency(scopeCompletedValue) }}</p>
        </div>
      </div>
    </div>

    <!-- SubScopes Section -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="p-6 flex justify-between items-center">
        <h2 class="text-lg font-medium">SubScopes</h2>
        <button
          @click="openSubScopeModal()"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add SubScope
        </button>
      </div>

      <!-- SubScopes Table -->
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
          <tr v-for="subScope in scope.subScopes" :key="subScope.id">
            <td class="px-6 py-4 font-medium text-gray-900">{{ subScope.name }}</td>
            <td class="px-6 py-4 text-right">{{ formatCurrency(getSubScopeValue(subScope)) }}</td>
            <td class="px-6 py-4 text-right">
              {{ formatCurrency(getCompletedValue(subScope)) }}
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end">
                <div class="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-[100px]">
                  <div
                    class="bg-blue-600 h-2.5 rounded-full"
                    :style="{
                      width: `${(getCompletedValue(subScope) / getSubScopeValue(subScope)) * 100}%`,
                    }"
                  ></div>
                </div>
                <span class="text-sm text-gray-500">
                  {{
                    Math.round((getCompletedValue(subScope) / getSubScopeValue(subScope)) * 100)
                  }}%
                </span>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="flex justify-end space-x-3">
                <button
                  v-if="!subScope.isCompleted"
                  @click="openCompletionModal(subScope)"
                  class="text-green-600 hover:text-green-800 ml-2 tooltip-trigger"
                  data-tooltip="Mark Complete"
                >
                  <CheckCircleIcon class="w-5 h-5" />
                </button>
                <span
                  v-else
                  class="text-green-600 ml-2 tooltip-trigger"
                  :data-tooltip="'Completed on ' + formatDate(subScope.completedAt)"
                >
                  <CheckCircleIcon class="w-5 h-5" />
                </span>
                <button
                  @click="openSubScopeModal(subScope)"
                  class="text-blue-600 hover:text-blue-900 tooltip-trigger"
                  data-tooltip="Edit SubScope"
                >
                  <PencilIcon class="h-5 w-5" />
                </button>
                <button
                  @click="
                    () => {
                      selectedSubScope = subScope
                      showDeleteConfirmation = true
                    }
                  "
                  class="text-red-600 hover:text-red-900 tooltip-trigger"
                  data-tooltip="Delete SubScope"
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
      v-if="showCompletionModal && selectedSubScopeForCompletion"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Mark SubScope Complete</h3>
        <p class="text-gray-500">
          Are you sure you want to mark {{ selectedSubScopeForCompletion.name }} as complete? This
          will lock all quantities and mark the subScope as finished.
        </p>

        <div class="flex justify-end space-x-3 mt-6">
          <button
            @click="showCompletionModal = false"
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="markSubScopeComplete"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Mark Complete
          </button>
        </div>
      </div>
    </div>

    <!-- SubScope Modal -->
    <div
      v-if="showSubScopeModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-medium text-gray-900">
            {{ isEditing ? 'Edit' : 'New' }} SubScope
          </h3>
          <button @click="showSubScopeModal = false" class="text-gray-400 hover:text-gray-500">
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>

        <form @submit.prevent="isEditing ? updateSubScope() : createSubScope()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <input
              v-model="newSubScope.name"
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
                        newSubScope.quantities.find((q) => q.workItemId === workItem.id)!.quantity
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
                          newSubScope.quantities.find((q) => q.workItemId === workItem.id)!
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
                        newSubScope.quantities.reduce((total, qty) => {
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
              @click="showSubScopeModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {{ isEditing ? 'Save Changes' : 'Create SubScope' }}
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
        <h3 class="text-lg font-medium text-gray-900 mb-4">Delete SubScope</h3>
        <p class="text-gray-500">
          Are you sure you want to delete {{ selectedSubScope?.name }}? This action cannot be
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
            @click="deleteSubScope"
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
