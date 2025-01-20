import { defineStore } from 'pinia'

interface Employee {
  id: string
  name: string
  classification: 'OFFICE' | 'FIELD' | 'UNION'
  status: 'ACTIVE' | 'INACTIVE'
  hourlyRate?: number
}

export const useEmployeeStore = defineStore('employee', {
  state: () => ({
    employees: [] as Employee[],
    loading: false,
    error: null as string | null
  }),
  
  actions: {
    async fetchEmployees() {
      this.loading = true
      try {
        const response = await fetch('/api/employees')
        this.employees = await response.json()
      } catch (err) {
        this.error = 'Failed to fetch employees'
      } finally {
        this.loading = false
      }
    }
  }
})