<!-- ProjectDetailsView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  CurrencyDollarIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  UsersIcon,
} from '@heroicons/vue/24/outline'
import WorkItemsTab from '../components/WorkItemsTab.vue'
import BuildingTab from '../components/BuildingTab.vue'

interface Project {
  id: string
  name: string
  contractValue: number
  client: string
  contractType: 'DIRECT' | 'SUBCONTRACT'
  generalContractor?: string
  startDate: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'
  address: string
  createdAt: string
  updatedAt: string
}

const route = useRoute()
const project = ref<Project | null>(null)
const activeTab = ref('financial')

const tabs = [
  { id: 'financial', name: 'Financial', icon: CurrencyDollarIcon },
  { id: 'workItems', name: 'Work Items', icon: ClipboardDocumentListIcon },
  { id: 'buildings', name: 'Buildings', icon: BuildingOffice2Icon },
  { id: 'expenses', name: 'Expenses', icon: BanknotesIcon },
  { id: 'labor', name: 'Labor', icon: UsersIcon },
]

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const fetchProject = async () => {
  try {
    const response = await fetch(`/api/projects/${route.params.id}`)
    project.value = await response.json()
  } catch (error) {
    console.error('Error fetching project:', error)
  }
}

onMounted(fetchProject)
</script>

<template>
  <div v-if="project" class="min-h-screen bg-gray-50">
    <!-- Project Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="px-8 py-6">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ project.name }}</h1>
            <p class="mt-1 text-sm text-gray-500">{{ project.client }}</p>
          </div>
          <span
            class="px-3 py-1 rounded-full text-sm font-medium"
            :class="{
              'bg-blue-100 text-blue-800': project.status === 'IN_PROGRESS',
              'bg-green-100 text-green-800': project.status === 'COMPLETED',
              'bg-yellow-100 text-yellow-800': project.status === 'PLANNING',
              'bg-gray-100 text-gray-800': project.status === 'ON_HOLD',
            }"
          >
            {{ project.status.toLowerCase() }}
          </span>
        </div>

        <!-- Project Overview Cards -->
        <div class="mt-6 grid grid-cols-4 gap-4">
          <div class="bg-white p-4 rounded-lg border border-gray-200">
            <h3 class="text-sm font-medium text-gray-500">Contract Value</h3>
            <p class="mt-1 text-xl font-semibold">{{ formatCurrency(project.contractValue) }}</p>
          </div>
          <div class="bg-white p-4 rounded-lg border border-gray-200">
            <h3 class="text-sm font-medium text-gray-500">Contract Type</h3>
            <p class="mt-1 text-xl font-semibold">{{ project.contractType }}</p>
          </div>
          <div class="bg-white p-4 rounded-lg border border-gray-200">
            <h3 class="text-sm font-medium text-gray-500">Start Date</h3>
            <p class="mt-1 text-xl font-semibold">{{ formatDate(project.startDate) }}</p>
          </div>
          <div class="bg-white p-4 rounded-lg border border-gray-200">
            <h3 class="text-sm font-medium text-gray-500">Location</h3>
            <p class="mt-1 text-xl font-semibold truncate">{{ project.address }}</p>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="px-8">
        <nav class="flex space-x-8" aria-label="Tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ]"
          >
            <component :is="tab.icon" class="h-5 w-5 mr-2" />
            {{ tab.name }}
          </button>
        </nav>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="py-6">
      <div v-if="activeTab === 'workItems'">
        <!-- Work Items Tab Content -->
        <div class="bg-white rounded-lg shadow">
          <WorkItemsTab :projectId="project.id" />
        </div>
      </div>

      <div v-if="activeTab === 'buildings'">
        <!-- Buildings Tab Content -->
        <div class="bg-white rounded-lg shadow">
          <BuildingTab :project-id="project.id" />
        </div>
      </div>

      <div v-if="activeTab === 'financial'">
        <!-- Financial Tab Content -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6">Financial Content</div>
        </div>
      </div>

      <div v-if="activeTab === 'expenses'">
        <!-- Expenses Tab Content -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6">Expenses Content</div>
        </div>
      </div>

      <div v-if="activeTab === 'labor'">
        <!-- Labor Tab Content -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6">Labor Content</div>
        </div>
      </div>
    </div>
  </div>
</template>
