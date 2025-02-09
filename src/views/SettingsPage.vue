<!-- SettingsPage.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

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
]

const fetchSettings = async () => {
  try {
    const response = await fetch('/api/settings')
    const data = await response.json()

    data.fiscalYearStart = new Date(data.fiscalYearStart).toISOString().split('T')[0]
    data.fiscalYearEnd = new Date(data.fiscalYearEnd).toISOString().split('T')[0]
    data.payrollBurden = data.payrollBurden * 100

    settings.value = data
  } catch (error) {
    console.error('Error fetching settings:', error)
  }
}

const saveSettings = async () => {
  try {
    isSaving.value = true

    const settingsData = {
      ...settings.value,
      payrollBurden: settings.value.payrollBurden / 100,
    }

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

onMounted(fetchSettings)
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
  </div>
</template>
