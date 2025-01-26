<!-- WorkItemsTab.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/vue/24/outline'

interface WorkItem {
  id: string
  code: string
  description: string
  unit: string
  unitPrice: number
  isTemplate: boolean
  projectId: string
  createdAt: string
  updatedAt: string
}

interface NewWorkItem {
  code: string
  description: string
  unit: string
  unitPrice: number
  isTemplate: boolean
}

const props = defineProps<{
  projectId: string
}>()

const workItems = ref<WorkItem[]>([])
const showNewItemModal = ref(false)
const showEditModal = ref(false)
const editingItem = ref<WorkItem | null>(null)
const searchQuery = ref('')

const newItem = ref<NewWorkItem>({
  code: '',
  unit: '',
  description: '',
  unitPrice: 0,
  isTemplate: false,
})

const filteredItems = computed(() => {
  return workItems.value.filter(
    (item) =>
      item.code.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

const validateWorkItem = (item: NewWorkItem | WorkItem) => {
  const errors: string[] = []

  if (!item.code) errors.push('Code is required')
  if (!item.description) errors.push('Description is required')
  if (!item.unit) errors.push('Unit is required')
  if (item.unitPrice <= 0) errors.push('Unit price must be greater than 0')

  return errors
}

const fetchWorkItems = async () => {
  try {
    const response = await fetch(`/api/projects/${props.projectId}/work-items`)
    workItems.value = await response.json()
  } catch (error) {
    console.error('Error fetching work items:', error)
  }
}

const createWorkItem = async () => {
  const errors = validateWorkItem(newItem.value)
  if (errors.length > 0) {
    alert(errors.join('\n'))
    return
  }

  try {
    const response = await fetch(`/api/projects/${props.projectId}/work-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem.value),
    })

    if (response.ok) {
      await fetchWorkItems()
      showNewItemModal.value = false
      newItem.value = {
        code: '',
        unit: '',
        description: '',
        unitPrice: 0,
        isTemplate: false,
      }
    }
  } catch (error) {
    console.error('Error creating work item:', error)
  }
}

const updateWorkItem = async () => {
  if (!editingItem.value) return

  const errors = validateWorkItem(editingItem.value)
  if (errors.length > 0) {
    alert(errors.join('\n'))
    return
  }

  try {
    const response = await fetch(
      `/api/projects/${props.projectId}/work-items/${editingItem.value.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem.value),
      },
    )

    if (response.ok) {
      await fetchWorkItems()
      showEditModal.value = false
      editingItem.value = null
    }
  } catch (error) {
    console.error('Error updating work item:', error)
  }
}

const deleteWorkItem = async (id: string) => {
  if (!confirm('Are you sure you want to delete this work item?')) return

  try {
    const response = await fetch(`/api/projects/${props.projectId}/work-items/${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      await fetchWorkItems()
    }
  } catch (error) {
    console.error('Error deleting work item:', error)
  }
}

const openEditModal = (item: WorkItem) => {
  editingItem.value = { ...item }
  showEditModal.value = true
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

fetchWorkItems()
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div class="flex-1 mt-4 ml-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search work items..."
          class="w-96 rounded-md border border-gray-300 px-4 py-2"
        />
      </div>
      <button
        @click="showNewItemModal = true"
        class="mt-4 mr-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
      >
        <PlusIcon class="w-5 h-5 mr-2" />
        Add Work Item
      </button>
    </div>

    <!-- Work Items Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Description
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Unit Price
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in filteredItems" :key="item.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {{ item.code }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ item.description }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ item.unit }}</td>
            <td class="px-6 py-4 text-sm text-gray-900 text-right font-medium">
              {{ formatCurrency(item.unitPrice) }}
            </td>
            <td class="px-6 py-4 text-right text-sm font-medium space-x-3">
              <button @click="openEditModal(item)" class="text-blue-600 hover:text-blue-900">
                <PencilIcon class="w-5 h-5" />
              </button>
              <button @click="deleteWorkItem(item.id)" class="text-red-600 hover:text-red-900">
                <TrashIcon class="w-5 h-5" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- New Item Modal -->
    <div
      v-if="showNewItemModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 class="text-lg font-medium mb-4">Add New Work Item</h2>
        <form @submit.prevent="createWorkItem" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Code</label>
            <input
              v-model="newItem.code"
              type="text"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              v-model="newItem.description"
              required
              rows="3"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Unit</label>
            <input
              v-model="newItem.unit"
              type="text"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Unit Price</label>
            <input
              v-model="newItem.unitPrice"
              type="number"
              step="0.01"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showNewItemModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 class="text-lg font-medium mb-4">Edit Work Item</h2>
        <form @submit.prevent="updateWorkItem" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Code</label>
            <input
              v-model="editingItem.code"
              type="text"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              v-model="editingItem.description"
              required
              rows="3"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Unit</label>
            <input
              v-model="editingItem.unit"
              type="text"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Unit Price</label>
            <input
              v-model="editingItem.unitPrice"
              type="number"
              step="0.01"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showEditModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
