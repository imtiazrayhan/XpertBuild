<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

interface Project {
  id: string
  name: string
  contractValue: number
  client: string
  contractType: 'DIRECT' | 'SUBCONTRACT'
  generalContractor?: string // New optional field
  startDate: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'
  address: string
}

const projects = ref<Project[]>([])
const searchQuery = ref('')
const selectedClient = ref('')
const selectedStatus = ref('')
const showNewProjectModal = ref(false)

const newProject = ref({
  name: '',
  contractValue: 0,
  client: '',
  contractType: 'DIRECT',
  generalContractor: '',
  startDate: '',
  status: 'PLANNING',
  address: '',
})

const clients = ['NYCHA', 'SCA']
const statuses = ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']

const fetchProjects = async () => {
  try {
    const response = await fetch('/api/projects')
    projects.value = await response.json()
  } catch (error) {
    console.error('Error fetching projects:', error)
  }
}

const createProject = async () => {
  try {
    // Remove generalContractor if contract type is DIRECT
    const projectData = { ...newProject.value }
    if (projectData.contractType === 'DIRECT') {
      delete projectData.generalContractor
    }

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    })

    if (response.ok) {
      showNewProjectModal.value = false
      await fetchProjects()
      resetNewProject()
    }
  } catch (error) {
    console.error('Error creating project:', error)
  }
}

const clearFilters = () => {
  selectedClient.value = ''
  selectedStatus.value = ''
  searchQuery.value = ''
}

const resetNewProject = () => {
  newProject.value = {
    name: '',
    contractValue: 0,
    client: '',
    contractType: 'DIRECT',
    generalContractor: '',
    startDate: '',
    status: 'PLANNING',
    address: '',
  }
}

const filteredProjects = computed(() => {
  return projects.value.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesClient = !selectedClient.value || project.client === selectedClient.value
    const matchesStatus = !selectedStatus.value || project.status === selectedStatus.value
    return matchesSearch && matchesClient && matchesStatus
  })
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US')
}

onMounted(fetchProjects)
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Projects</h1>
        <p class="text-gray-600">All Xpert Field Services Projects</p>
      </div>
      <button
        @click="showNewProjectModal = true"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        + New Project
      </button>
    </div>

    <div class="bg-white rounded-lg p-6 shadow-sm space-y-4">
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Search</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search projects..."
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Client</label>
          <select
            v-model="selectedClient"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">All Clients</option>
            <option v-for="client in clients" :key="client" :value="client">
              {{ client }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Status</label>
          <select
            v-model="selectedStatus"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option v-for="status in statuses" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex justify-end">
        <button @click="clearFilters" class="text-gray-600 hover:text-gray-900 flex items-center">
          <XMarkIcon class="w-4 h-4 mr-1" />
          Clear Filters
        </button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-sm">
      <div class="grid grid-cols-6 gap-4 p-4 font-medium text-gray-500 border-b">
        <div class="col-span-2">PROJECT INFO</div>
        <div>LOCATION</div>
        <div>STATUS</div>
        <div>CONTRACT VALUE</div>
        <div>STARTED</div>
      </div>

      <div class="divide-y">
        <div
          v-for="project in filteredProjects"
          :key="project.id"
          class="grid grid-cols-6 gap-4 p-4 hover:bg-gray-50"
        >
          <div class="col-span-2">
            <div class="font-medium">{{ project.name }}</div>
            <div class="text-sm text-gray-500">
              Client: <span class="text-purple-600">{{ project.client }}</span>
            </div>
          </div>
          <div>{{ project.address }}</div>
          <div>
            <span
              class="px-2 py-1 rounded-full text-sm"
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
          <div>{{ formatCurrency(project.contractValue) }}</div>
          <div>{{ formatDate(project.startDate) }}</div>
        </div>
      </div>
    </div>
    <!-- Previous template code remains the same until the form -->

    <!-- New Project Modal -->
    <div
      v-if="showNewProjectModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">New Project</h2>
          <button @click="showNewProjectModal = false" class="text-gray-500 hover:text-gray-700">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="createProject" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Project Name</label>
              <input
                v-model="newProject.name"
                type="text"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Contract Value</label>
              <input
                v-model="newProject.contractValue"
                type="number"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Client</label>
              <select
                v-model="newProject.client"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Select Client</option>
                <option v-for="client in clients" :key="client" :value="client">
                  {{ client }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Contract Type</label>
              <select
                v-model="newProject.contractType"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="DIRECT">Direct</option>
                <option value="SUBCONTRACT">Subcontract</option>
              </select>
            </div>
            <!-- New General Contractor field that appears conditionally -->
            <div v-if="newProject.contractType === 'SUBCONTRACT'">
              <label class="block text-sm font-medium text-gray-700">General Contractor</label>
              <input
                v-model="newProject.generalContractor"
                type="text"
                required
                placeholder="Enter general contractor name"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                v-model="newProject.startDate"
                type="date"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Status</label>
              <select
                v-model="newProject.status"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option v-for="status in statuses" :key="status" :value="status">
                  {{ status }}
                </option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700">Address</label>
              <input
                v-model="newProject.address"
                type="text"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showNewProjectModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
