<!-- ScopesTab.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { XMarkIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/vue/24/outline'

interface Scope {
  id: string
  name: string
  projectId: string
  subScopes: {
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

const scopes = ref<Scope[]>([])
const showScopeModal = ref(false)
const isEditing = ref(false)
const selectedScope = ref<Scope | null>(null)
const showDeleteConfirmation = ref(false)

const newScope = ref({
  name: '',
})

const resetForm = () => {
  newScope.value = {
    name: '',
  }
  isEditing.value = false
  selectedScope.value = null
}

const getScopeValue = (scope: Scope) => {
  return scope.subScopes.reduce((scopeTotal, subScope) => {
    const subScopeTotal = subScope.quantities.reduce((total, qty) => {
      return total + qty.quantity * qty.workItem.unitPrice
    }, 0)
    return scopeTotal + subScopeTotal
  }, 0)
}

const fetchScopes = async () => {
  try {
    const response = await fetch(`/api/scopes?projectId=${props.projectId}`)
    scopes.value = await response.json()
  } catch (error) {
    console.error('Error fetching scopes:', error)
  }
}

const createScope = async () => {
  try {
    const response = await fetch('/api/scopes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newScope.value,
        projectId: props.projectId,
      }),
    })

    if (response.ok) {
      showScopeModal.value = false
      await fetchScopes()
      resetForm()
    }
  } catch (error) {
    console.error('Error creating scope:', error)
  }
}

const updateScope = async () => {
  if (!selectedScope.value) return

  try {
    const response = await fetch(`/api/scopes/${selectedScope.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newScope.value),
    })

    if (response.ok) {
      showScopeModal.value = false
      await fetchScopes()
      resetForm()
    }
  } catch (error) {
    console.error('Error updating scope:', error)
  }
}

const deleteScope = async () => {
  if (!selectedScope.value) return

  try {
    const response = await fetch(`/api/scopes/${selectedScope.value.id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      showDeleteConfirmation.value = false
      await fetchScopes()
      selectedScope.value = null
    }
  } catch (error) {
    console.error('Error deleting scope:', error)
  }
}

const openEditModal = (scope: Scope) => {
  selectedScope.value = scope
  newScope.value = {
    name: scope.name,
  }
  isEditing.value = true
  showScopeModal.value = true
}

const openDeleteModal = (scope: Scope) => {
  selectedScope.value = scope
  showDeleteConfirmation.value = true
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

onMounted(fetchScopes)
</script>

<template>
  <div class="px-6 py-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-lg font-medium text-gray-900">Scopes</h2>
      <button
        @click="showScopeModal = true"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        + Add Scope
      </button>
    </div>

    <!-- Scopes Table -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              SubScopes
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
          <tr v-for="scope in scopes" :key="scope.id">
            <td class="px-6 py-4">
              <div class="font-medium text-gray-900">{{ scope.name }}</div>
              <div v-if="scope.description" class="text-sm text-gray-500">
                {{ scope.description }}
              </div>
            </td>
            <td class="px-6 py-4">{{ scope.subScopes.length }}</td>
            <td class="px-6 py-4 text-right font-medium">
              {{ formatCurrency(getScopeValue(scope)) }}
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end space-x-3">
                <router-link
                  :to="`/scopes/${scope.id}`"
                  class="text-green-600 hover:text-green-900"
                >
                  <EyeIcon class="h-5 w-5" />
                </router-link>
                <button @click="openEditModal(scope)" class="text-blue-600 hover:text-blue-900">
                  <PencilIcon class="h-5 w-5" />
                </button>
                <button @click="openDeleteModal(scope)" class="text-red-600 hover:text-red-900">
                  <TrashIcon class="h-5 w-5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Scope Modal -->
    <div
      v-if="showScopeModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-medium text-gray-900">{{ isEditing ? 'Edit' : 'New' }} Scope</h3>
          <button @click="showScopeModal = false" class="text-gray-400 hover:text-gray-500">
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>

        <form @submit.prevent="isEditing ? updateScope() : createScope()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <input
              v-model="newScope.name"
              type="text"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showScopeModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {{ isEditing ? 'Save Changes' : 'Create Scope' }}
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
        <h3 class="text-lg font-medium text-gray-900 mb-4">Delete Scope</h3>
        <p class="text-gray-500">
          Are you sure you want to delete {{ selectedScope?.name }}? This action cannot be undone.
        </p>

        <div class="flex justify-end space-x-3 mt-6">
          <button
            @click="showDeleteConfirmation = false"
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="deleteScope"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
