<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ClockIcon, ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'

interface SyncLog {
  id: number
  startTime: string
  endTime: string | null
  status: 'IN_PROGRESS' | 'SUCCESS' | 'ERROR'
  rowsRead: number
  rowsSuccess: number
  rowsError: number
  errors: Array<{ row: number; message: string }>
}

const latestSync = ref<SyncLog | null>(null)
const syncHistory = ref<SyncLog[]>([])
const showErrorDetails = ref(false)
const isSyncing = ref(false)

const fetchSyncStatus = async () => {
  try {
    const response = await fetch('/api/sync/status')
    latestSync.value = await response.json()
  } catch (error) {
    console.error('Error fetching sync status:', error)
  }
}

const fetchSyncHistory = async () => {
  try {
    const response = await fetch('/api/sync/logs')
    syncHistory.value = await response.json()
  } catch (error) {
    console.error('Error fetching sync history:', error)
  }
}

const triggerSync = async () => {
  try {
    isSyncing.value = true
    const response = await fetch('/api/sync/trigger', { method: 'POST' })
    const result = await response.json()

    // Poll for status updates
    const interval = setInterval(async () => {
      await fetchSyncStatus()
      if (latestSync.value?.status !== 'IN_PROGRESS') {
        clearInterval(interval)
        isSyncing.value = false
      }
    }, 2000)
  } catch (error) {
    console.error('Error triggering sync:', error)
    isSyncing.value = false
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SUCCESS':
      return 'text-green-700 bg-green-100'
    case 'ERROR':
      return 'text-red-700 bg-red-100'
    case 'IN_PROGRESS':
      return 'text-blue-700 bg-blue-100'
    default:
      return 'text-gray-700 bg-gray-100'
  }
}

onMounted(() => {
  fetchSyncStatus()
  fetchSyncHistory()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Status Card -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex justify-between items-start">
        <div>
          <h2 class="text-lg font-medium">Timesheet Sync Status</h2>
          <div v-if="latestSync" class="mt-2">
            <div class="flex items-center space-x-2">
              <span :class="['px-2 py-1 rounded-full text-sm', getStatusColor(latestSync.status)]">
                {{ latestSync.status }}
              </span>
              <span class="text-sm text-gray-500">
                Last sync: {{ formatDate(latestSync.startTime) }}
              </span>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-4">
              <div>
                <span class="text-sm text-gray-500">Rows Read</span>
                <p class="text-2xl font-semibold">{{ latestSync.rowsRead }}</p>
              </div>
              <div>
                <span class="text-sm text-gray-500">Successful</span>
                <p class="text-2xl font-semibold text-green-600">{{ latestSync.rowsSuccess }}</p>
              </div>
              <div>
                <span class="text-sm text-gray-500">Errors</span>
                <p class="text-2xl font-semibold text-red-600">{{ latestSync.rowsError }}</p>
              </div>
            </div>
          </div>
        </div>
        <button
          @click="triggerSync"
          :disabled="isSyncing"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          <ArrowPathIcon class="w-5 h-5 mr-2" :class="{ 'animate-spin': isSyncing }" />
          {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
        </button>
      </div>

      <!-- Error Details -->
      <div v-if="latestSync?.errors?.length" class="mt-6">
        <button
          @click="showErrorDetails = !showErrorDetails"
          class="text-red-600 hover:text-red-800 flex items-center"
        >
          <ExclamationCircleIcon class="w-5 h-5 mr-2" />
          {{ showErrorDetails ? 'Hide' : 'Show' }} {{ latestSync.errors.length }} Errors
        </button>
        <div v-if="showErrorDetails" class="mt-4 bg-red-50 p-4 rounded-lg">
          <div v-for="error in latestSync.errors" :key="error.row" class="mb-2 last:mb-0">
            <span class="font-medium">Row {{ error.row }}:</span>
            <span class="text-red-700">{{ error.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Sync History -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium">Sync History</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Read</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Success
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Errors
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Duration
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="sync in syncHistory" :key="sync.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm">{{ formatDate(sync.startTime) }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="['px-2 py-1 rounded-full text-xs', getStatusColor(sync.status)]">
                  {{ sync.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">{{ sync.rowsRead }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">{{ sync.rowsSuccess }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">{{ sync.rowsError }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                {{
                  sync.endTime
                    ? `${Math.round((new Date(sync.endTime) - new Date(sync.startTime)) / 1000)}s`
                    : '-'
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
