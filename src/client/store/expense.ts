import { defineStore } from 'pinia'

interface Expense {
  id: string
  amount: number
  date: Date
  description: string
  category: string
  type: 'GENERAL' | 'PROJECT'
  vendor?: string
  projectId?: string
}

export const useExpenseStore = defineStore('expense', {
  state: () => ({
    expenses: [] as Expense[],
    loading: false,
    error: null as string | null
  }),
  
  actions: {
    async fetchExpenses() {
      this.loading = true
      try {
        const response = await fetch('/api/expenses')
        this.expenses = await response.json()
      } catch (err) {
        this.error = 'Failed to fetch expenses'
      } finally {
        this.loading = false
      }
    }
  }
})