const { PrismaClient } = require('@prisma/client')
const sheetsService = require('./sheetsService.cjs')

const prisma = new PrismaClient()
const batchSize = 50

class SyncService {
  async syncTimesheet(syncLogId, projectId) {
    try {
      console.log('Starting sync process for project:', projectId)

      const connection = await prisma.sheetConnection.findFirst({
        where: { projectId },
      })

      if (!connection) {
        throw new Error('No sheet connection configured for project')
      }

      const initialized = await sheetsService.initialize()
      if (!initialized) {
        throw new Error('Failed to initialize sheets service')
      }

      console.log('Fetching data from sheet...')
      const data = await sheetsService.readTimesheet(connection.sheetId, connection.range)

      let rowsRead = 0
      let rowsSuccess = 0
      let errors = []

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        const results = await this.processBatch(batch, projectId)

        rowsRead += batch.length
        rowsSuccess += results.successful
        errors.push(...results.errors)

        await this.updateSyncLog(syncLogId, {
          rowsRead,
          rowsSuccess,
          rowsError: errors.length,
          errors,
        })
      }

      // Update sheet connection last sync time
      await prisma.sheetConnection.update({
        where: { id: connection.id },
        data: { lastSync: new Date() },
      })

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

  async processBatch(rows, projectId) {
    const results = {
      successful: 0,
      errors: [],
    }

    for (let [index, row] of rows.entries()) {
      try {
        const entry = sheetsService.parseTimesheetRow(row)

        // Normalize date
        entry.date.setUTCHours(12, 0, 0, 0)

        // Calculate week info
        const weekDate = new Date(entry.date)
        weekDate.setDate(weekDate.getDate() + 4 - (weekDate.getDay() || 7))
        const yearStart = new Date(weekDate.getFullYear(), 0, 1)
        const weekNumber = Math.ceil(
          ((weekDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
        )
        const yearNumber = entry.date.getFullYear()

        // Find or create employee
        const employee = await this.findOrCreateEmployee(entry)
        if (!employee) {
          throw new Error('Failed to find or create employee')
        }

        // Create time entry with project ID
        await prisma.timeEntry.create({
          data: {
            employeeId: employee.id,
            projectId,
            date: entry.date,
            regularHours: entry.regularHours,
            overtimeHours: entry.overtimeHours,
            source: 'SHEET',
            type: employee.employeeType === 'UNION' ? 'OVERTIME' : 'REGULAR',
            weekNumber,
            yearNumber,
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

  async findOrCreateEmployee(entry) {
    if (!entry.unionClass) {
      throw new Error('Employee not found and missing union class')
    }

    // Try to find by SSN
    let employee = await prisma.employee.findFirst({
      where: { ssn: entry.ssn },
    })

    if (employee) return employee

    // Find union class
    const unionClass = await prisma.unionClass.findFirst({
      where: { name: entry.unionClass },
    })

    if (!unionClass) {
      throw new Error(`Union class not found: ${entry.unionClass}`)
    }

    // Create new union employee
    const [firstName, ...lastNameParts] = entry.name.split(' ')
    const lastName = lastNameParts.join(' ')

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

  async updateSyncLog(id, data) {
    return prisma.syncLog.update({
      where: { id },
      data,
    })
  }

  getWeekNumber(date) {
    const d = new Date(date)
    d.setUTCHours(12, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return {
      weekNumber: Math.ceil(((d - yearStart) / 86400000 + 1) / 7),
      yearNumber: d.getFullYear(),
    }
  }
}

module.exports = new SyncService()
