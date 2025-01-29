<!-- ClientsPage.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { XMarkIcon, PencilIcon } from '@heroicons/vue/24/outline'

interface Client {
  id: string
  name: string
  code: string
  description?: string
  address?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  active: boolean
}

const clients = ref<Client[]>([])
const showClientModal = ref(false)
const isEditing = ref(false)
const searchQuery = ref('')
const selectedClient = ref<Client | null>(null)
const showActiveOnly = ref(true)

const newClient = ref<Client>({
  id: '',
  name: '',
  code: '',
  description: '',
  address: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  active: true,
})

const filteredClients = computed(() => {
  return clients.value.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      client.code.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = !showActiveOnly.value || client.active
    return matchesSearch && matchesStatus
  })
})

const fetchClients = async () => {
  try {
    const response = await fetch('/api/clients')
    clients.value = await response.json()
  } catch (error) {
    console.error('Error fetching clients:', error)
  }
}

const createClient = async () => {
  try {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClient.value),
    })
    if (response.ok) {
      showClientModal.value = false
      await fetchClients()
      resetForm()
    }
  } catch (error) {
    console.error('Error creating client:', error)
  }
}

const updateClient = async () => {
  if (!selectedClient.value) return

  try {
    const response = await fetch(`/api/clients/${selectedClient.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClient.value),
    })
    if (response.ok) {
      showClientModal.value = false
      await fetchClients()
      resetForm()
    }
  } catch (error) {
    console.error('Error updating client:', error)
  }
}

const toggleClientStatus = async (client: Client) => {
  try {
    const response = await fetch(`/api/clients/${client.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...client, active: !client.active }),
    })
    if (response.ok) {
      await fetchClients()
    }
  } catch (error) {
    console.error('Error toggling client status:', error)
  }
}

const openEditModal = (client: Client) => {
  selectedClient.value = client
  newClient.value = { ...client }
  isEditing.value = true
  showClientModal.value = true
}

const resetForm = () => {
  newClient.value = {
    id: '',
    name: '',
    code: '',
    description: '',
    address: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    active: true,
  }
  isEditing.value = false
  selectedClient.value = null
}

const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const validatePhone = (phone: string): boolean => {
  return /^\+?[\d-\s()]*$/.test(phone)
}

onMounted(fetchClients)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Clients</h1>
        <p class="text-gray-600">Manage your client list</p>
      </div>
      <button
        @click="showClientModal = true"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        + New Client
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg p-6 shadow-sm space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search clients..."
            class="w-full rounded-md border border-gray-300 px-4 py-2"
          />
        </div>
        <div class="flex items-center justify-end">
          <label class="flex items-center space-x-2">
            <input v-model="showActiveOnly" type="checkbox" class="rounded border-gray-300" />
            <span class="text-sm text-gray-700">Show active only</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Clients Table -->
    <div class="bg-white rounded-lg shadow-sm">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr class="bg-gray-50">
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="client in filteredClients" :key="client.id">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ client.code }}</td>
            <td class="px-6 py-4">
              <div class="font-medium text-gray-900">{{ client.name }}</div>
              <div v-if="client.description" class="text-sm text-gray-500">
                {{ client.description }}
              </div>
            </td>
            <td class="px-6 py-4">
              <div v-if="client.contactName" class="text-sm">{{ client.contactName }}</div>
              <div v-if="client.contactEmail" class="text-sm text-gray-500">
                {{ client.contactEmail }}
              </div>
              <div v-if="client.contactPhone" class="text-sm text-gray-500">
                {{ client.contactPhone }}
              </div>
            </td>
            <td class="px-6 py-4">
              <span
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="client.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              >
                {{ client.active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end space-x-3">
                <button @click="openEditModal(client)" class="text-blue-600 hover:text-blue-900">
                  <PencilIcon class="h-5 w-5" />
                </button>
                <button
                  @click="toggleClientStatus(client)"
                  :class="
                    client.active
                      ? 'text-red-600 hover:text-red-900'
                      : 'text-green-600 hover:text-green-900'
                  "
                >
                  {{ client.active ? 'Deactivate' : 'Activate' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Client Modal -->
    <div
      v-if="showClientModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">{{ isEditing ? 'Edit' : 'New' }} Client</h2>
          <button @click="showClientModal = false" class="text-gray-500 hover:text-gray-700">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="isEditing ? updateClient() : createClient()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Client Name</label>
              <input
                v-model="newClient.name"
                type="text"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Client Code</label>
              <input
                v-model="newClient.code"
                type="text"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                v-model="newClient.description"
                rows="2"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              ></textarea>
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                v-model="newClient.address"
                rows="2"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Contact Name</label>
              <input
                v-model="newClient.contactName"
                type="text"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Contact Email</label>
              <input
                v-model="newClient.contactEmail"
                type="email"
                :class="{
                  'border-red-300':
                    newClient.contactEmail && !validateEmail(newClient.contactEmail),
                }"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Contact Phone</label>
              <input
                v-model="newClient.contactPhone"
                type="tel"
                :class="{
                  'border-red-300':
                    newClient.contactPhone && !validatePhone(newClient.contactPhone),
                }"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showClientModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {{ isEditing ? 'Save Changes' : 'Create Client' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
