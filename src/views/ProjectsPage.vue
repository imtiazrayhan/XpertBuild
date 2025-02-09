<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { EyeIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/vue/24/outline'

interface Project {
  id: string
  name: string
  contractValue: number
  clientId: string
  client: {
    id: string // Add this
    name: string
    code: string
  }
  contractType: 'DIRECT' | 'SUBCONTRACT'
  generalContractor?: string
  startDate: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'
  address: string
}

interface Client {
  id: string
  name: string
  code: string
}

const projects = ref<Project[]>([])
const clients = ref<Client[]>([])
const searchQuery = ref('')
const selectedClient = ref('')
const selectedStatus = ref('')
const showNewProjectModal = ref(false)
const showClientModal = ref(false)
const showEditProjectModal = ref(false)
const showDeleteConfirmation = ref(false)
const selectedProject = ref<Project | null>(null)
const statuses = ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']

const editProject = ref<Project>({
  id: '',
  name: '',
  contractValue: 0,
  clientId: '',
  client: {
    id: '',
    name: '',
    code: '',
  },
  contractType: 'DIRECT',
  generalContractor: '',
  startDate: '',
  status: 'PLANNING',
  address: '',
})

const newProject = ref({
  name: '',
  contractValue: 0,
  clientId: '',
  client: {
    id: '',
    name: '',
    code: '',
  },
  contractType: 'DIRECT',
  generalContractor: '',
  startDate: '',
  status: 'PLANNING',
  address: '',
})

const newClient = ref({
  name: '',
  code: '',
})

const fetchProjects = async () => {
  try {
    const response = await fetch('/api/projects')
    const data = await response.json()
    projects.value = data.map((p) => ({
      ...p,
      client: {
        id: p.clientId, // Ensure client.id is set
        name: p.client?.name,
        code: p.client?.code,
      },
    }))
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
    clientId: '',
    client: {
      id: '',
      name: '',
      code: '',
    },
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

const fetchClients = async () => {
  try {
    const response = await fetch('/api/clients?active=true')
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
      const client = await response.json()
      clients.value.push(client)
      newProject.value.clientId = client.id
      editProject.value.clientId = client.id
      showClientModal.value = false
      resetClientForm()
    }
  } catch (error) {
    console.error('Error creating client:', error)
  }
}

const resetClientForm = () => {
  newClient.value = {
    name: '',
    code: '',
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US')
}

const openEditModal = (project: Project) => {
  selectedProject.value = project
  editProject.value = {
    id: project.id,
    name: project.name,
    contractValue: project.contractValue,
    clientId: project.clientId,
    contractType: project.contractType,
    generalContractor: project.generalContractor ?? '',
    startDate: project.startDate.split('T')[0],
    status: project.status,
    address: project.address,
  }
  showEditProjectModal.value = true
}

const openDeleteConfirmation = (project: Project) => {
  selectedProject.value = project
  showDeleteConfirmation.value = true
}

const updateProject = async () => {
  try {
    const projectData = { ...editProject.value }
    if (projectData.contractType === 'DIRECT') {
      delete projectData.generalContractor
    }

    const response = await fetch(`/api/projects/${projectData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    })

    if (response.ok) {
      showEditProjectModal.value = false
      await fetchProjects()
    }
  } catch (error) {
    console.error('Error updating project:', error)
  }
}

const deleteProject = async () => {
  if (!selectedProject.value) return

  try {
    const response = await fetch(`/api/projects/${selectedProject.value.id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      showDeleteConfirmation.value = false
      selectedProject.value = null
      await fetchProjects()
    }
  } catch (error) {
    console.error('Error deleting project:', error)
  }
}

onMounted(() => {
  fetchProjects()
  fetchClients()
})
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

    <!-- Replace the existing grid div with this table -->
    <div class="bg-white rounded-lg shadow-sm overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr class="bg-gray-50">
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Project Name
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Location
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Contract Type
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Contractor
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Contract Value
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="project in filteredProjects"
            :key="project.id"
            :class="['hover:bg-gray-50', project.contractType === 'DIRECT' ? 'bg-blue-50' : '']"
          >
            <td class="px-6 py-4">
              <div class="font-medium text-gray-900">{{ project.name }}</div>
              <span
                class="mt-1 inline-flex px-2 py-1 text-xs rounded-full"
                :class="{
                  'bg-blue-100 text-blue-800': project.status === 'IN_PROGRESS',
                  'bg-green-100 text-green-800': project.status === 'COMPLETED',
                  'bg-yellow-100 text-yellow-800': project.status === 'PLANNING',
                  'bg-gray-100 text-gray-800': project.status === 'ON_HOLD',
                }"
              >
                {{ project.status.toLowerCase() }}
              </span>
            </td>
            <td class="px-6 py-4">{{ project.address }}</td>
            <td class="px-6 py-4">{{ project.client?.code }}</td>
            <td class="px-6 py-4">
              {{ project.contractType === 'DIRECT' ? 'Direct' : 'Subcontract' }}
            </td>
            <td class="px-6 py-4">
              {{ project.contractType === 'DIRECT' ? 'Self' : project.generalContractor }}
            </td>
            <td class="px-6 py-4 text-right font-medium">
              {{ formatCurrency(project.contractValue) }}
            </td>
            <td class="px-6 py-4">{{ formatDate(project.startDate) }}</td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-4">
                <router-link
                  :to="{ name: 'project-details', params: { id: project.id } }"
                  class="text-green-600 hover:text-green-800 relative group"
                >
                  <EyeIcon class="w-5 h-5" />
                  <span
                    class="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                  >
                    View Details
                  </span>
                </router-link>
                <button
                  @click="openEditModal(project)"
                  class="text-blue-600 hover:text-blue-800 relative group"
                >
                  <PencilIcon class="w-5 h-5" />
                  <span
                    class="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                  >
                    Edit Project
                  </span>
                </button>
                <button
                  @click="openDeleteConfirmation(project)"
                  class="text-red-600 hover:text-red-800 relative group"
                >
                  <TrashIcon class="w-5 h-5" />
                  <span
                    class="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap right-5"
                  >
                    Delete Project
                  </span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Previous template code remains the same until the form -->

    <!-- Edit Project Modal -->
    <div
      v-if="showEditProjectModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
        <!-- At the start of edit modal -->
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">Edit Project</h2>
          <button @click="showEditProjectModal = false" class="text-gray-500 hover:text-gray-700">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="updateProject" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Project Name</label>
              <input
                v-model="editProject.name"
                type="text"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Contract Value</label>
              <input
                v-model="editProject.contractValue"
                type="number"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div class="flex space-x-2">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700">Client</label>
                <select
                  v-model="newProject.clientId"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Select Client</option>
                  <option v-for="client in clients" :key="client.id" :value="client.id">
                    {{ client.name }}
                  </option>
                </select>
              </div>
              <div class="flex items-end">
                <button
                  type="button"
                  @click="showClientModal = true"
                  class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
                >
                  <PlusIcon class="w-5 h-5 mr-1" />
                  New Client
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Contract Type</label>
              <select
                v-model="editProject.contractType"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="DIRECT">Direct</option>
                <option value="SUBCONTRACT">Subcontract</option>
              </select>
            </div>
            <div v-if="editProject.contractType === 'SUBCONTRACT'">
              <label class="block text-sm font-medium text-gray-700">General Contractor</label>
              <input
                v-model="editProject.generalContractor"
                type="text"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                v-model="editProject.startDate"
                type="date"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Status</label>
              <select
                v-model="editProject.status"
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
                v-model="editProject.address"
                type="text"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="showEditProjectModal = false"
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

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirmation"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Delete Project</h2>
        <p class="text-gray-600 mb-6">
          Are you sure you want to delete "{{ selectedProject?.name }}"? This action cannot be
          undone.
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="showDeleteConfirmation = false"
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="deleteProject"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

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
            <div class="flex space-x-2">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700">Client</label>
                <select
                  v-model="newProject.clientId"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Select Client</option>
                  <option v-for="client in clients" :key="client.id" :value="client.id">
                    {{ client.name }}
                  </option>
                </select>
              </div>
              <div class="flex items-end">
                <button
                  type="button"
                  @click="showClientModal = true"
                  class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
                >
                  <PlusIcon class="w-5 h-5 mr-1" />
                  New Client
                </button>
              </div>
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

    <!-- Quick Client Creation Modal -->
    <div
      v-if="showClientModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-medium">New Client</h3>
          <button @click="showClientModal = false" class="text-gray-500 hover:text-gray-700">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="createClient" class="space-y-4">
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

          <div class="flex justify-end space-x-3">
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
              Create Client
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
