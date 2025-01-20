import { defineStore } from 'pinia'

interface Project {
  id: string
  name: string
  contractValue: number
  client: string
  contractType: 'DIRECT' | 'SUBCONTRACT'
  startDate: Date
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'
  address: string
}

export const useProjectStore = defineStore('project', {
  state: () => ({
    projects: [] as Project[],
    currentProject: null as Project | null,
    loading: false,
    error: null as string | null
  }),
  
  actions: {
    async fetchProjects() {
      this.loading = true
      try {
        const response = await fetch('/api/projects')
        this.projects = await response.json()
      } catch (err) {
        this.error = 'Failed to fetch projects'
      } finally {
        this.loading = false
      }
    },

    async fetchProject(id: string) {
      this.loading = true
      try {
        const response = await fetch(`/api/projects/${id}`)
        this.currentProject = await response.json()
      } catch (err) {
        this.error = 'Failed to fetch project'
      } finally {
        this.loading = false
      }
    }
  }
})
