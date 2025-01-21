<!-- EmployeesPage.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { XMarkIcon, PencilIcon } from '@heroicons/vue/24/outline'

interface UnionClass {
  id: number
  name: string
}

interface Employee {
  id: number
  firstName: string
  lastName: string
  employeeType: 'LOCAL' | 'UNION'
  hourlyRate?: number
  isFieldWorker?: boolean
  ssn?: string
  dob?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  unionClassId?: number
  unionClass?: UnionClass
}

const employees = ref<Employee[]>([])
const unionClasses = ref<UnionClass[]>([])
const showEmployeeModal = ref(false)
const viewType = ref<'LOCAL' | 'UNION'>('UNION')
const isEditing = ref(false)
const editingEmployeeId = ref<number | null>(null)

const newEmployee = ref<Employee>({
  id: 0,
  firstName: '',
  lastName: '',
  employeeType: 'LOCAL',
  hourlyRate: undefined,
  isFieldWorker: false,
  ssn: undefined,
  dob: undefined,
  address: undefined,
  city: undefined,
  state: undefined,
  zip: undefined,
  unionClassId: undefined,
})

const validateSSN = (ssn: string) => {
  const regex = /^\d{3}-?\d{2}-?\d{4}$/
  return regex.test(ssn)
}

const fetchEmployees = async () => {
  try {
    const response = await fetch('/api/employees')
    employees.value = await response.json()
  } catch (error) {
    console.error('Error fetching employees:', error)
  }
}

const fetchUnionClasses = async () => {
  try {
    const response = await fetch('/api/union-classes')
    unionClasses.value = await response.json()
  } catch (error) {
    console.error('Error fetching union classes:', error)
  }
}

const openEditModal = (employee: Employee) => {
  isEditing.value = true
  editingEmployeeId.value = employee.id
  newEmployee.value = {
    ...employee,
    dob: employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : undefined,
  }
  showEmployeeModal.value = true
}

const saveEmployee = async () => {
  // Format SSN if provided
  if (newEmployee.value.ssn) {
    newEmployee.value.ssn = newEmployee.value.ssn
      .replace(/\D/g, '')
      .replace(/^(\d{3})(\d{2})(\d{4})$/, '$1-$2-$3')
  }

  // Validate SSN for union employees
  if (newEmployee.value.employeeType === 'UNION') {
    if (!newEmployee.value.ssn || !validateSSN(newEmployee.value.ssn)) {
      alert('Please enter a valid SSN (XXX-XX-XXXX)')
      return
    }
  }

  try {
    const url = isEditing.value ? `/api/employees/${editingEmployeeId.value}` : '/api/employees'

    const response = await fetch(url, {
      method: isEditing.value ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmployee.value),
    })

    if (response.ok) {
      showEmployeeModal.value = false
      await fetchEmployees()
      resetEmployeeForm()
    }
  } catch (error) {
    console.error('Error saving employee:', error)
  }
}

const resetEmployeeForm = () => {
  isEditing.value = false
  editingEmployeeId.value = null
  newEmployee.value = {
    id: 0,
    firstName: '',
    lastName: '',
    employeeType: 'LOCAL',
    hourlyRate: undefined,
    isFieldWorker: false,
    ssn: undefined,
    dob: undefined,
    address: undefined,
    city: undefined,
    state: undefined,
    zip: undefined,
    unionClassId: undefined,
  }
}

const filteredEmployees = computed(() => {
  return employees.value.filter((emp) => emp.employeeType === viewType.value)
})

onMounted(() => {
  fetchEmployees()
  fetchUnionClasses()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Employees</h1>
        <p class="text-gray-600">Manage local and union employees</p>
      </div>
      <button
        @click="showEmployeeModal = true"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        + New Employee
      </button>
    </div>

    <!-- View Toggle -->
    <div class="flex space-x-4 bg-white p-4 rounded-lg shadow-sm">
      <button
        @click="viewType = 'UNION'"
        :class="[
          'px-4 py-2 rounded-md',
          viewType === 'UNION' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100',
        ]"
      >
        Union Employees
      </button>
      <button
        @click="viewType = 'LOCAL'"
        :class="[
          'px-4 py-2 rounded-md',
          viewType === 'LOCAL' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100',
        ]"
      >
        Local Employees
      </button>
    </div>

    <!-- Union Employees Table -->
    <div v-if="viewType === 'UNION'" class="bg-white rounded-lg shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="bg-gray-50 border-b">
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SSN</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Classification
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Location
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="employee in filteredEmployees" :key="employee.id">
              <td class="px-6 py-4">{{ employee.firstName }} {{ employee.lastName }}</td>
              <td class="px-6 py-4">{{ employee.ssn }}</td>
              <td class="px-6 py-4">{{ employee.unionClass?.name }}</td>
              <td class="px-6 py-4">{{ employee.city }}, {{ employee.state }}</td>
              <td class="px-6 py-4">
                <button @click="openEditModal(employee)" class="text-gray-600 hover:text-gray-900">
                  <PencilIcon class="w-5 h-5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Local Employees Table -->
    <div v-if="viewType === 'LOCAL'" class="bg-white rounded-lg shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="bg-gray-50 border-b">
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Hourly Rate
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="employee in filteredEmployees" :key="employee.id">
              <td class="px-6 py-4">{{ employee.firstName }} {{ employee.lastName }}</td>
              <td class="px-6 py-4">${{ employee.hourlyRate?.toFixed(2) }}/hr</td>
              <td class="px-6 py-4">{{ employee.isFieldWorker ? 'Field' : 'Office' }}</td>
              <td class="px-6 py-4">
                <button @click="openEditModal(employee)" class="text-gray-600 hover:text-gray-900">
                  <PencilIcon class="w-5 h-5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Employee Modal -->
    <div
      v-if="showEmployeeModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">{{ isEditing ? 'Edit' : 'New' }} Employee</h2>
          <button @click="showEmployeeModal = false" class="text-gray-500 hover:text-gray-700">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="saveEmployee" class="space-y-4">
          <!-- Employee Type Selection -->
          <div class="flex space-x-4 mb-4">
            <label class="flex items-center">
              <input type="radio" v-model="newEmployee.employeeType" value="LOCAL" class="mr-2" />
              Local Employee
            </label>
            <label class="flex items-center">
              <input type="radio" v-model="newEmployee.employeeType" value="UNION" class="mr-2" />
              Union Employee
            </label>
          </div>

          <!-- Common Fields -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">First Name</label>
              <input
                v-model="newEmployee.firstName"
                type="text"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                v-model="newEmployee.lastName"
                type="text"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <!-- Local Employee Fields -->
          <div v-if="newEmployee.employeeType === 'LOCAL'" class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Hourly Rate</label>
              <input
                v-model="newEmployee.hourlyRate"
                type="number"
                step="0.01"
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div class="flex items-center">
              <label class="flex items-center space-x-2">
                <input
                  v-model="newEmployee.isFieldWorker"
                  type="checkbox"
                  class="rounded border-gray-300"
                />
                <span class="text-sm font-medium text-gray-700">Field Worker</span>
              </label>
            </div>
          </div>

          <!-- Union Employee Fields -->
          <div v-if="newEmployee.employeeType === 'UNION'" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">SSN</label>
                <input
                  v-model="newEmployee.ssn"
                  type="text"
                  required
                  placeholder="XXX-XX-XXXX"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  v-model="newEmployee.dob"
                  type="date"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Classification</label>
                <select
                  v-model="newEmployee.unionClassId"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Select Classification</option>
                  <option
                    v-for="unionClass in unionClasses"
                    :key="unionClass.id"
                    :value="unionClass.id"
                  >
                    {{ unionClass.name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700">Address</label>
                <input
                  v-model="newEmployee.address"
                  type="text"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">City</label>
                <input
                  v-model="newEmployee.city"
                  type="text"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">State</label>
                <input
                  v-model="newEmployee.state"
                  type="text"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">ZIP Code</label>
                <input
                  v-model="newEmployee.zip"
                  type="text"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="showEmployeeModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {{ isEditing ? 'Update' : 'Create' }} Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
