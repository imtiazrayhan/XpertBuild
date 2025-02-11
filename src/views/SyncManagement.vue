<!-- SyncManagement.vue -->
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
  projectId: string
  project?: {
    name: string
  }
}

interface ProjectConnection {
  id: string
  projectId: string
  sheetId: string
  range: string
  lastSync?: string
  project: {
    name: string
  }
}

const connections = ref<ProjectConnection[]>([])
const syncHistories = ref<Record<string, SyncLog[]>>({})
const selectedProjectId = ref<string>('')
const showErrorDetails = ref<Record<string, boolean>>({})
const isSyncing = ref<Record<string, boolean>>({})

const fetchConnections = async () => {
  try {
    const response = await fetch('/api/settings/sheets')
    connections.value = await response.json()

    connections.value.forEach((conn) => {
      showErrorDetails.value[conn.projectId] = false
      isSyncing.value[conn.projectId] = false
    })

    await Promise.all(connections.value.map((conn) => fetchSyncHistory(conn.projectId)))
  } catch (error) {
    console.error('Error fetching connections:', error)
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

const triggerSync = async (projectId: string) => {
  try {
    isSyncing.value[projectId] = true
    const response = await fetch('/api/sync/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })

    const interval = setInterval(async () => {
      await fetchSyncHistory(projectId)
      const latest = syncHistories.value[projectId]?.[0]
      if (latest?.status !== 'IN_PROGRESS') {
        clearInterval(interval)
        isSyncing.value[projectId] = false
      }
    }, 2000)
  } catch (error) {
    console.error('Error triggering sync:', error)
    isSyncing.value[projectId] = false
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  date.setUTCHours(12, 0, 0, 0)
  return date.toLocaleString()
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

const testConnection = async (projectId: string) => {
  try {
    const response = await fetch(`/api/settings/sheets/${projectId}/test`)
    const result = await response.json()
    alert(result.success ? 'Connection successful!' : 'Connection failed!')
  } catch (error) {
    console.error('Error testing connection:', error)
    alert('Connection test failed')
  }
}

onMounted(fetchConnections)
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Timesheet Sync Management</h1>
        <p class="text-gray-600">Manage and monitor timesheet imports</p>
      </div>
      <select v-model="selectedProjectId" class="rounded-md border border-gray-300 px-3 py-2">
        <option value="">All Projects</option>
        <option v-for="conn in connections" :key="conn.projectId" :value="conn.projectId">
          {{ conn.project.name }}
        </option>
      </select>
    </div>

    <div v-if="connections.length === 0" class="bg-white rounded-lg shadow-sm p-6 text-center">
      <p class="text-gray-500">No sheet connections configured. Add connections in Settings.</p>
    </div>

    <div class="space-y-8">
      <div
        v-for="conn in connections"
        :key="conn.projectId"
        v-show="!selectedProjectId || selectedProjectId === conn.projectId"
        class="bg-white rounded-lg shadow-sm p-6"
      >
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-lg font-medium">{{ conn.project.name }}</h2>
            <div class="mt-2 text-sm text-gray-500 space-y-1">
              <div class="flex items-center space-x-2">
                <span class="font-medium">Sheet ID:</span>
                <span>{{ conn.sheetId }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="font-medium">Range:</span>
                <span>{{ conn.range }}</span>
              </div>
            </div>

            <div v-if="syncHistories[conn.projectId]?.[0]" class="mt-4">
              <div class="flex items-center space-x-2">
                <span
                  :class="[
                    'px-2 py-1 rounded-full text-sm',
                    getStatusColor(syncHistories[conn.projectId][0].status),
                  ]"
                >
                  {{ syncHistories[conn.projectId][0].status }}
                </span>
                <span class="text-sm text-gray-500">
                  Last sync: {{ formatDate(syncHistories[conn.projectId][0].startTime) }}
                </span>
              </div>

              <div class="mt-4 grid grid-cols-3 gap-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                  <span class="text-sm text-gray-500">Rows Read</span>
                  <p class="text-2xl font-semibold">
                    {{ syncHistories[conn.projectId][0].rowsRead }}
                  </p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                  <span class="text-sm text-gray-500">Successful</span>
                  <p class="text-2xl font-semibold text-green-600">
                    {{ syncHistories[conn.projectId][0].rowsSuccess }}
                  </p>
                </div>
                <div class="bg-red-50 p-4 rounded-lg">
                  <span class="text-sm text-gray-500">Errors</span>
                  <p class="text-2xl font-semibold text-red-600">
                    {{ syncHistories[conn.projectId][0].rowsError }}
                  </p>
                </div>
              </div>

              <!-- Error Details -->
              <div v-if="syncHistories[conn.projectId][0].errors?.length" class="mt-6">
                <button
                  @click="showErrorDetails[conn.projectId] = !showErrorDetails[conn.projectId]"
                  class="text-red-600 hover:text-red-800 flex items-center"
                >
                  <ExclamationCircleIcon class="w-5 h-5 mr-2" />
                  {{ showErrorDetails[conn.projectId] ? 'Hide' : 'Show' }}
                  {{ syncHistories[conn.projectId][0].errors.length }} Errors
                </button>
                <div v-if="showErrorDetails[conn.projectId]" class="mt-4 bg-red-50 p-4 rounded-lg">
                  <div
                    v-for="error in syncHistories[conn.projectId][0].errors"
                    :key="error.row"
                    class="mb-2 last:mb-0"
                  >
                    <span class="font-medium">Row {{ error.row }}:</span>
                    <span class="text-red-700">{{ error.message }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex space-x-3">
            <button
              @click="triggerSync(conn.projectId)"
              :disabled="isSyncing[conn.projectId]"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              <ArrowPathIcon
                class="w-5 h-5 mr-2"
                :class="{ 'animate-spin': isSyncing[conn.projectId] }"
              />
              {{ isSyncing[conn.projectId] ? 'Syncing...' : 'Sync Now' }}
            </button>
          </div>
        </div>

        <!-- Sync History -->
        <div class="mt-8">
          <h3 class="text-lg font-medium mb-4">Sync History</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Read
                  </th>
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
                <tr v-for="sync in syncHistories[conn.projectId]" :key="sync.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    {{ formatDate(sync.startTime) }}
                  </td>
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
                        ? `${Math.round(
                            (new Date(sync.endTime) - new Date(sync.startTime)) / 1000,
                          )}s`
                        : '-'
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
