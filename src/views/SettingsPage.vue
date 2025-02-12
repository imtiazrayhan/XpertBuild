<!-- SettingsPage.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { XMarkIcon, TrashIcon, PencilIcon } from '@heroicons/vue/24/outline'

interface BusinessHours {
  open: string
  close: string
}

interface Settings {
  companyName: string
  businessHours: {
    monday: BusinessHours | null
    tuesday: BusinessHours | null
    wednesday: BusinessHours | null
    thursday: BusinessHours | null
    friday: BusinessHours | null
    saturday: BusinessHours | null
    sunday: BusinessHours | null
  }
  defaultCurrency: string
  fiscalYearStart: string
  fiscalYearEnd: string
  defaultContractType: 'DIRECT' | 'SUBCONTRACT'
  defaultProjectStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'
  payrollBurden: number
}

const settings = ref<Settings>({
  companyName: '',
  businessHours: {
    monday: { open: '09:00', close: '17:00' },
    tuesday: { open: '09:00', close: '17:00' },
    wednesday: { open: '09:00', close: '17:00' },
    thursday: { open: '09:00', close: '17:00' },
    friday: { open: '09:00', close: '17:00' },
    saturday: null,
    sunday: null,
  },
  defaultCurrency: 'USD',
  fiscalYearStart: '',
  fiscalYearEnd: '',
  defaultContractType: 'DIRECT',
  defaultProjectStatus: 'PLANNING',
  payrollBurden: 20,
})

const activeTab = ref('general')
const showSuccessAlert = ref(false)
const isSaving = ref(false)

const currencies = ['USD', 'EUR', 'GBP', 'CAD']
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const contractTypes = ['DIRECT', 'SUBCONTRACT']
const projectStatuses = ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']

const tabs = [
  { id: 'general', name: 'General Settings' },
  { id: 'projects', name: 'Project Settings' },
  { id: 'sheets', name: 'Google Sheets Connection' },
]

const fetchSettings = async () => {
  try {
    const response = await fetch('/api/settings')
    const data = await response.json()

    // Format dates for ISO string conversion
    const start = new Date(data.fiscalYearStart)
    const end = new Date(data.fiscalYearEnd)
    start.setUTCHours(12, 0, 0, 0)
    end.setUTCHours(12, 0, 0, 0)

    settings.value = {
      ...data,
      fiscalYearStart: start.toISOString().split('T')[0],
      fiscalYearEnd: end.toISOString().split('T')[0],
    }
  } catch (error) {
    console.error('Error fetching settings:', error)
  }
}

// Inside <script setup>
const saveSettings = async () => {
  try {
    isSaving.value = true

    // Remove sheetConnections before sending
    const settingsData = { ...settings.value }

    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsData),
    })

    if (response.ok) {
      showSuccessAlert.value = true
      setTimeout(() => {
        showSuccessAlert.value = false
      }, 3000)
    }
  } catch (error) {
    console.error('Error saving settings:', error)
  } finally {
    isSaving.value = false
  }
}

const toggleDay = (day: string) => {
  const hours = settings.value.businessHours[day as keyof typeof settings.value.businessHours]
  if (hours) {
    settings.value.businessHours[day as keyof typeof settings.value.businessHours] = null
  } else {
    settings.value.businessHours[day as keyof typeof settings.value.businessHours] = {
      open: '09:00',
      close: '17:00',
    }
  }
}

const formatDay = (day: string) => {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

// Add these interfaces
interface Project {
  id: string
  name: string
}

interface SheetConnection {
  id: string
  projectId: string
  sheetId: string
  range: string
  lastSync?: string
  project?: {
    name: string
  }
}

// Add to existing refs
const showConnectionModal = ref(false)
const editingConnection = ref<SheetConnection | null>(null)
const projects = ref<Project[]>([])
const connections = ref<SheetConnection[]>([])
const syncHistories = ref<Record<string, SyncLog[]>>({})
const showErrorDetails = ref<Record<string, boolean>>({})
const isSyncing = ref<Record<string, boolean>>({})

const newConnection = ref({
  projectId: '',
  sheetId: '',
  range: '',
})

// Add these methods
const fetchProjects = async () => {
  try {
    const response = await fetch('/api/projects')
    projects.value = await response.json()
  } catch (error) {
    console.error('Error fetching projects:', error)
  }
}

const fetchSheetConnections = async () => {
  try {
    const response = await fetch('/api/settings/sheets')
    const data = await response.json()
    connections.value = data

    // Update states for each connection
    connections.value.forEach((conn) => {
      showErrorDetails.value[conn.projectId] = false
      isSyncing.value[conn.projectId] = false
    })

    // Fetch sync history for each connection
    await Promise.all(connections.value.map((conn) => fetchSyncHistory(conn.projectId)))
  } catch (error) {
    console.error('Error fetching sheet connections:', error)
  }
}

const fetchSyncHistory = async (projectId: string) => {
  try {
    const response = await fetch(`/api/sync/logs?projectId=${projectId}`)
    syncHistories.value[projectId] = await response.json()
  } catch (error) {
    console.error('Error fetching sync history:', error)
  }
}

const editConnection = (connection: SheetConnection) => {
  editingConnection.value = connection
  newConnection.value = {
    projectId: connection.projectId,
    sheetId: connection.sheetId,
    range: connection.range,
  }
  showConnectionModal.value = true
}

const saveConnection = async () => {
  try {
    const url = editingConnection.value
      ? `/api/settings/sheets/${editingConnection.value.id}`
      : '/api/settings/sheets'

    const method = editingConnection.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConnection.value),
    })

    if (response.ok) {
      showConnectionModal.value = false
      await fetchSettings()
      editingConnection.value = null
      newConnection.value = {
        projectId: '',
        sheetId: '',
        range: '',
      }
    }
  } catch (error) {
    console.error('Error saving sheet connection:', error)
  }
}

const deleteConnection = async (id: string) => {
  if (!confirm('Are you sure you want to delete this connection?')) return

  try {
    const response = await fetch(`/api/settings/sheets/${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      await fetchSettings()
    }
  } catch (error) {
    console.error('Error deleting connection:', error)
  }
}

const testConnection = async (id: string) => {
  try {
    const response = await fetch(`/api/settings/sheets/${id}/test`)
    const result = await response.json()
    alert(result.success ? 'Connection successful!' : 'Connection failed!')
  } catch (error) {
    console.error('Error testing connection:', error)
    alert('Connection test failed')
  }
}

const formatDate = (dateString: string) => {
  const d = new Date(dateString)
  d.setUTCHours(12, 0, 0, 0)
  return d.toLocaleDateString('en-US')
}

onMounted(() => {
  fetchSettings()
  fetchProjects()
  fetchSheetConnections()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Success Alert -->
    <div
      v-if="showSuccessAlert"
      class="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded"
      role="alert"
    >
      <span class="block sm:inline">Settings saved successfully!</span>
      <button @click="showSuccessAlert = false" class="absolute top-0 bottom-0 right-0 px-4 py-3">
        <XMarkIcon class="h-5 w-5" />
      </button>
    </div>

    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Settings</h1>
      <button
        @click="saveSettings"
        :disabled="isSaving"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {{ isSaving ? 'Saving...' : 'Save Changes' }}
      </button>
    </div>

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

    <!-- General Settings Tab -->
    <div v-if="activeTab === 'general'" class="bg-white rounded-lg shadow-sm p-6">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Company Name</label>
          <input
            v-model="settings.companyName"
            type="text"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Default Currency</label>
          <select
            v-model="settings.defaultCurrency"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option v-for="currency in currencies" :key="currency" :value="currency">
              {{ currency }}
            </option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Fiscal Year Start</label>
            <input
              v-model="settings.fiscalYearStart"
              type="date"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Fiscal Year End</label>
            <input
              v-model="settings.fiscalYearEnd"
              type="date"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Business Hours</label>
          <div class="space-y-2">
            <div v-for="day in days" :key="day" class="flex items-center space-x-4">
              <button
                @click="toggleDay(day)"
                :class="[
                  'px-3 py-1 rounded text-sm',
                  settings.businessHours[day]
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700',
                ]"
              >
                {{ formatDay(day) }}
              </button>
              <template v-if="settings.businessHours[day]">
                <input
                  v-model="settings.businessHours[day].open"
                  type="time"
                  class="rounded-md border border-gray-300 px-3 py-1"
                />
                <span class="text-gray-500">to</span>
                <input
                  v-model="settings.businessHours[day].close"
                  type="time"
                  class="rounded-md border border-gray-300 px-3 py-1"
                />
              </template>
              <span v-else class="text-gray-500">Closed</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Project Settings Tab -->
    <div v-if="activeTab === 'projects'" class="bg-white rounded-lg shadow-sm p-6">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Default Contract Type</label>
          <select
            v-model="settings.defaultContractType"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option v-for="type in contractTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Default Project Status</label>
          <select
            v-model="settings.defaultProjectStatus"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option v-for="status in projectStatuses" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Payroll Burden (%)</label>
          <input
            v-model.number="settings.payrollBurden"
            type="number"
            min="0"
            max="100"
            step="0.1"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>
    </div>

    <!-- Google Sheets Integration Tab -->
    <div v-if="activeTab === 'sheets'" class="bg-white rounded-lg shadow-sm p-6">
      <div class="space-y-6">
        <!-- Connection Status -->
        <div class="flex justify-between items-center p-6 border-b">
          <h3 class="text-lg font-medium">Sheet Connections</h3>
          <button
            @click="showConnectionModal = true"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add Connection
          </button>
        </div>

        <!-- Connections Table -->
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Project
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Sheet ID
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Range</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Last Sync
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="conn in connections" :key="conn.id">
              <td class="px-6 py-4">{{ conn.project.name }}</td>
              <td class="px-6 py-4">{{ conn.sheetId }}</td>
              <td class="px-6 py-4">{{ conn.range }}</td>
              <td class="px-6 py-4">{{ conn.lastSync ? formatDate(conn.lastSync) : 'Never' }}</td>
              <td class="px-6 py-4">
                <div class="flex justify-end space-x-3">
                  <button @click="editConnection(conn)" class="text-gray-600 hover:text-gray-900">
                    <PencilIcon class="w-5 h-5" />
                  </button>
                  <button
                    @click="deleteConnection(conn.id)"
                    class="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon class="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Connection Modal -->
    <div
      v-if="showConnectionModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">
            {{ editingConnection ? 'Edit' : 'New' }} Sheet Connection
          </h2>
          <button @click="showConnectionModal = false" class="text-gray-500 hover:text-gray-700">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="saveConnection" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Project</label>
            <select
              v-model="newConnection.projectId"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">Select Project</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Sheet ID</label>
            <input
              v-model="newConnection.sheetId"
              type="text"
              required
              placeholder="From sheet URL"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Range</label>
            <input
              v-model="newConnection.range"
              type="text"
              required
              placeholder="e.g. Sheet1!A2:F"
              class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="showConnectionModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {{ editingConnection ? 'Save Changes' : 'Add Connection' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
