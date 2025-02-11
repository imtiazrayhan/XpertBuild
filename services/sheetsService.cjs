// services/sheetsService.cjs
const { google } = require('googleapis')

class SheetsService {
  constructor() {
    this.auth = null
    this.sheets = null
  }

  async initialize() {
    try {
      if (!process.env.GOOGLE_CREDENTIALS) {
        throw new Error('Google credentials not found in environment variables')
      }

      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS)
      console.log('Initializing with credentials type:', credentials.type)

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      })

      this.auth = auth
      this.sheets = google.sheets({ version: 'v4', auth })

      console.log('Sheets service initialized:', !!this.sheets)
      return true
    } catch (error) {
      console.error('Failed to initialize Sheets service:', error)
      throw error // Re-throw to handle in sync service
    }
  }

  async testConnection(sheetId, range) {
    try {
      await this.initialize()

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      })

      return response.data.values && response.data.values.length > 0
    } catch (error) {
      console.error('Test connection failed:', error)
      return false
    }
  }

  async readTimesheet(spreadsheetId, range) {
    if (!this.sheets) {
      throw new Error('Sheets service not initialized')
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })

      return response.data.values
    } catch (error) {
      console.error('Failed to read timesheet:', error)
      throw error
    }
  }

  parseTimesheetRow(row) {
    const [date, name, regularHours, overtimeHours, ssn, unionClass] = row

    return {
      date: new Date(date),
      name: name.trim(),
      regularHours: parseFloat(regularHours) || 0,
      overtimeHours: parseFloat(overtimeHours) || 0,
      ssn: ssn.replace(/\D/g, ''),
      unionClass: unionClass.trim(),
    }
  }
}

module.exports = new SheetsService()
