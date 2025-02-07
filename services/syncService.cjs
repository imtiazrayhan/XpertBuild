// services/syncService.js
const { PrismaClient } = require('@prisma/client')
const sheetsService = require('./sheetsService.cjs')
const sheetsConfig = require('../config/sheets.cjs')

const prisma = new PrismaClient()

class SyncService {
  async syncTimesheet(syncLogId) {
    try {
      console.log('Starting sync process...')

      // Initialize sheets service
      const initialized = await sheetsService.initialize()
      if (!initialized) {
        throw new Error('Failed to initialize sheets service')
      }

      console.log('Fetching data from sheet...')
      const data = await sheetsService.readTimesheet(sheetsConfig.spreadsheetId, sheetsConfig.range)

      let rowsRead = 0
      let rowsSuccess = 0
      let errors = []

      // Process in batches
      for (let i = 0; i < data.length; i += sheetsConfig.batchSize) {
        const batch = data.slice(i, i + sheetsConfig.batchSize)
        const results = await this.processBatch(batch)

        rowsRead += batch.length
        rowsSuccess += results.successful
        errors.push(...results.errors)

        // Update sync log progress
        await this.updateSyncLog(syncLogId, {
          rowsRead,
          rowsSuccess,
          rowsError: errors.length,
          errors: errors,
        })
      }

      // Mark sync as complete
      await this.updateSyncLog(syncLogId, {
        status: 'SUCCESS',
        endTime: new Date(),
      })
    } catch (error) {
      console.error('Sync error:', error)
      await this.updateSyncLog(syncLogId, {
        status: 'ERROR',
        endTime: new Date(),
        errors: [{ row: 0, message: error.message }],
      })
      throw error
    }
  }

  async processBatch(rows) {
    const results = {
      successful: 0,
      errors: [],
    }

    for (let [index, row] of rows.entries()) {
      try {
        const entry = sheetsService.parseTimesheetRow(row)

        // Validate date
        if (isNaN(entry.date.getTime())) {
          throw new Error('Invalid date format')
        }

        // Find or create employee
        const employee = await this.findOrCreateEmployee(entry)
        if (!employee) {
          throw new Error('Failed to find or create employee')
        }

        // Create time entry
        await prisma.timeEntry.create({
          data: {
            employeeId: employee.id,
            date: entry.date,
            regularHours: entry.regularHours,
            overtimeHours: entry.overtimeHours,
            source: 'SHEET',
            type: employee.employeeType === 'UNION' ? 'OVERTIME' : 'REGULAR',
            weekNumber: this.getWeekNumber(entry.date),
            yearNumber: entry.date.getFullYear(),
            paymentStatus: 'PENDING',
          },
        })

        results.successful++
      } catch (error) {
        results.errors.push({
          row: index + 1,
          message: error.message,
        })
      }
    }

    return results
  }

  parseTimesheetRow(row) {
    const [dateStr, name, regularHours, overtimeHours, ssn, unionClass] = row

    // Parse date in MM/DD/YYYY format
    const [month, day, year] = dateStr.split('/').map((num) => parseInt(num, 10))
    const date = new Date(year, month - 1, day)

    return {
      date,
      name: name.trim(),
      regularHours: parseFloat(regularHours) || 0,
      overtimeHours: parseFloat(overtimeHours) || 0,
      ssn: ssn.replace(/\D/g, ''),
      unionClass: unionClass?.trim(),
    }
  }

  async findOrCreateEmployee(entry) {
    // Try to find by SSN for union employees
    if (entry.unionClass) {
      const employee = await prisma.employee.findFirst({
        where: { ssn: entry.ssn },
      })

      if (employee) return employee

      // Create new union employee
      const [firstName, ...lastNameParts] = entry.name.split(' ')
      const lastName = lastNameParts.join(' ')

      // Find union class
      const unionClass = await prisma.unionClass.findFirst({
        where: { name: entry.unionClass },
      })

      if (!unionClass) {
        throw new Error(`Union class not found: ${entry.unionClass}`)
      }

      return prisma.employee.create({
        data: {
          firstName,
          lastName,
          employeeType: 'UNION',
          ssn: entry.ssn,
          unionClassId: unionClass.id,
        },
      })
    }

    throw new Error('Non-union employees must be created manually')
  }

  async updateSyncLog(id, data) {
    return prisma.syncLog.update({
      where: { id },
      data,
    })
  }

  getWeekNumber(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  }
}

module.exports = new SyncService()
