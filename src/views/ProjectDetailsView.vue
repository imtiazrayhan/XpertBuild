<!-- ProjectDetailsView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

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
  <div v-if="project" class="px-8 py-6 space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Project: {{ project.name }}</h1>
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

    <!-- Overview Cards -->
    <div class="grid grid-cols-3 gap-6">
      <!-- Contract Information -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          Contract Details
        </h3>
        <dl class="space-y-3">
          <div>
            <dt class="text-sm font-medium text-gray-500">Contract Value</dt>
            <dd class="mt-1 text-lg font-semibold text-gray-900">
              {{ formatCurrency(project.contractValue) }}
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Type</dt>
            <dd class="mt-1 text-gray-900">{{ project.contractType }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">General Contractor</dt>
            <dd class="mt-1 text-gray-900">
              {{ project.contractType === 'DIRECT' ? 'Self' : project.generalContractor }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- Client Information -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          Client Information
        </h3>
        <dl class="space-y-3">
          <div>
            <dt class="text-sm font-medium text-gray-500">Client Name</dt>
            <dd class="mt-1 text-gray-900">{{ project.client }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Project Location</dt>
            <dd class="mt-1 text-gray-900">{{ project.address }}</dd>
          </div>
        </dl>
      </div>

      <!-- Project Dates -->
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          Important Dates
        </h3>
        <dl class="space-y-3">
          <div>
            <dt class="text-sm font-medium text-gray-500">Start Date</dt>
            <dd class="mt-1 text-gray-900">{{ formatDate(project.startDate) }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Created</dt>
            <dd class="mt-1 text-gray-900">{{ formatDate(project.createdAt) }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd class="mt-1 text-gray-900">{{ formatDate(project.updatedAt) }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>
