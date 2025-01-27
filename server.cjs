const express = require('express')
const { PrismaClient } = require('@prisma/client')

const app = express()
const prisma = new PrismaClient()
const port = 3000

app.use(express.json())

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

const normalizeDate = (date) => {
  const d = new Date(date)
  d.setUTCHours(12, 0, 0, 0)
  return d
}

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { startDate: 'desc' },
    })
    res.json(projects)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching projects' })
  }
})

// Create new project
app.post('/api/projects', async (req, res) => {
  try {
    const project = await prisma.project.create({
      data: {
        name: req.body.name,
        contractValue: req.body.contractValue,
        client: req.body.client,
        contractType: req.body.contractType,
        generalContractor: req.body.generalContractor, // New field
        startDate: new Date(req.body.startDate),
        status: req.body.status,
        address: req.body.address,
      },
    })
    res.json(project)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/projects/:id', async (req, res) => {
  try {
    const projectData = { ...req.body }
    if (projectData.contractType === 'DIRECT') {
      delete projectData.generalContractor
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        name: projectData.name,
        contractValue: projectData.contractValue,
        client: projectData.client,
        contractType: projectData.contractType,
        generalContractor: projectData.generalContractor,
        startDate: new Date(projectData.startDate),
        status: projectData.status,
        address: projectData.address,
      },
    })
    res.json(project)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/projects/:id', async (req, res) => {
  try {
    // Delete related records first
    await prisma.$transaction([
      prisma.workItemQuantity.deleteMany({
        where: {
          elevation: {
            building: {
              projectId: req.params.id,
            },
          },
        },
      }),
      prisma.elevation.deleteMany({
        where: {
          building: {
            projectId: req.params.id,
          },
        },
      }),
      prisma.building.deleteMany({
        where: { projectId: req.params.id },
      }),
      prisma.projectWorkItem.deleteMany({
        where: { projectId: req.params.id },
      }),
      prisma.expense.deleteMany({
        where: { projectId: req.params.id },
      }),
      prisma.timeEntry.deleteMany({
        where: { projectId: req.params.id },
      }),
      prisma.project.delete({
        where: { id: req.params.id },
      }),
    ])
    res.json({ message: 'Project deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// Get project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    })
    if (project) {
      res.json(project)
    } else {
      res.status(404).json({ error: 'Project not found' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching project' })
  }
})

app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })
    res.json(expenses)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

app.post('/api/expenses', async (req, res) => {
  try {
    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(req.body.amount),
        date: new Date(req.body.date),
        description: req.body.description,
        category: req.body.category,
        type: req.body.type,
        vendor: req.body.vendor || null,
        projectId: req.body.projectId || null,
        recurring: req.body.recurring,
      },
    })
    res.json(expense)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense' })
  }
})

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        amount: parseFloat(req.body.amount),
        date: new Date(req.body.date),
        description: req.body.description,
        category: req.body.category,
        type: req.body.type,
        vendor: req.body.vendor || null,
        projectId: req.body.projectId || null,
        recurring: req.body.recurring,
      },
    })
    res.json(expense)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense' })
  }
})

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await prisma.expense.delete({
      where: { id: req.params.id },
    })
    res.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' })
  }
})

// Add to server.cjs

// Union Classifications
app.get('/api/union-classes', async (req, res) => {
  try {
    const unionClasses = await prisma.unionClass.findMany({
      include: {
        rates: {
          orderBy: {
            effectiveDate: 'desc',
          },
        },
      },
    })
    res.json(unionClasses)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch union classes' })
  }
})

app.post('/api/union-classes', async (req, res) => {
  try {
    const unionClass = await prisma.unionClass.create({
      data: {
        name: req.body.name,
      },
    })
    res.json(unionClass)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create union class' })
  }
})

app.post('/api/union-classes/:id/rates', async (req, res) => {
  try {
    // If there's an active rate, set its endDate
    if (!req.body.endDate) {
      await prisma.unionClassRate.updateMany({
        where: {
          unionClassId: parseInt(req.params.id),
          endDate: null,
        },
        data: {
          endDate: new Date(req.body.effectiveDate),
        },
      })
    }

    const rate = await prisma.unionClassRate.create({
      data: {
        unionClassId: parseInt(req.params.id),
        regularRate: parseFloat(req.body.regularRate),
        overtimeRate: parseFloat(req.body.overtimeRate),
        benefitsRate: parseFloat(req.body.benefitsRate),
        effectiveDate: new Date(req.body.effectiveDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      },
    })
    res.json(rate)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create rate' })
  }
})

// Employees
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        unionClass: true,
      },
      orderBy: {
        lastName: 'asc',
      },
    })
    res.json(employees)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' })
  }
})

app.post('/api/employees', async (req, res) => {
  try {
    const employee = await prisma.employee.create({
      data: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        employeeType: req.body.employeeType,
        // Local employee fields
        hourlyRate: req.body.employeeType === 'LOCAL' ? parseFloat(req.body.hourlyRate) : null,
        isFieldWorker: req.body.employeeType === 'LOCAL' ? req.body.isFieldWorker : null,
        // Union employee fields
        ssn: req.body.employeeType === 'UNION' ? req.body.ssn : null,
        dob: req.body.employeeType === 'UNION' ? new Date(req.body.dob) : null,
        address: req.body.employeeType === 'UNION' ? req.body.address : null,
        city: req.body.employeeType === 'UNION' ? req.body.city : null,
        state: req.body.employeeType === 'UNION' ? req.body.state : null,
        zip: req.body.employeeType === 'UNION' ? req.body.zip : null,
        unionClassId: req.body.employeeType === 'UNION' ? parseInt(req.body.unionClassId) : null,
      },
    })
    res.json(employee)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create employee' })
  }
})

app.put('/api/employees/:id', async (req, res) => {
  try {
    const employee = await prisma.employee.update({
      where: { id: parseInt(req.params.id) },
      data: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        // Local employee fields
        hourlyRate: req.body.employeeType === 'LOCAL' ? parseFloat(req.body.hourlyRate) : null,
        isFieldWorker: req.body.employeeType === 'LOCAL' ? req.body.isFieldWorker : null,
        // Union employee fields
        ssn: req.body.employeeType === 'UNION' ? req.body.ssn : null,
        dob: req.body.employeeType === 'UNION' ? new Date(req.body.dob) : null,
        address: req.body.employeeType === 'UNION' ? req.body.address : null,
        city: req.body.employeeType === 'UNION' ? req.body.city : null,
        state: req.body.employeeType === 'UNION' ? req.body.state : null,
        zip: req.body.employeeType === 'UNION' ? req.body.zip : null,
        unionClassId: req.body.employeeType === 'UNION' ? parseInt(req.body.unionClassId) : null,
      },
    })
    res.json(employee)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' })
  }
})

app.delete('/api/employees/:id', async (req, res) => {
  try {
    await prisma.employee.delete({
      where: { id: parseInt(req.params.id) },
    })
    res.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' })
  }
})

// Add to server.cjs

// Bulk create time entries
app.post('/api/time-entries/bulk', async (req, res) => {
  try {
    const entries = req.body
    const createPromises = entries.map((entry) => {
      const date = new Date(entry.date)
      date.setUTCHours(12, 0, 0, 0)

      // Calculate week number
      const weekDate = new Date(date)
      weekDate.setDate(weekDate.getDate() + 4 - (weekDate.getDay() || 7))
      const yearStart = new Date(weekDate.getFullYear(), 0, 1)
      const weekNumber = Math.ceil(((weekDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
      const yearNumber = date.getFullYear()

      return prisma.timeEntry.create({
        data: {
          employeeId: entry.employeeId,
          projectId: entry.projectId,
          date,
          regularHours: entry.regularHours,
          overtimeHours: entry.overtimeHours,
          type: entry.overtimeHours > 0 ? 'OVERTIME' : 'REGULAR',
          weekNumber,
          yearNumber,
          paymentStatus: 'PENDING',
        },
      })
    })

    await prisma.$transaction(createPromises)
    res.json({ message: 'Time entries created successfully' })
  } catch (error) {
    console.error('Error creating time entries:', error)
    res.status(500).json({ error: 'Failed to create time entries' })
  }
})

// Get time entries by week
// Update the time entries endpoint in server.cjs
app.get('/api/time-entries', async (req, res) => {
  const { weekNumber, yearNumber } = req.query

  try {
    const entries = await prisma.timeEntry.findMany({
      where: {
        weekNumber: Number(weekNumber),
        yearNumber: Number(yearNumber),
      },
      include: {
        employee: {
          include: {
            unionClass: {
              include: {
                rates: {
                  orderBy: {
                    effectiveDate: 'desc',
                  },
                },
              },
            },
          },
        },
        project: true,
      },
      orderBy: {
        date: 'asc',
      },
    })
    res.json(entries)
  } catch (error) {
    console.error('Error fetching time entries:', error)
    res.status(500).json({ error: 'Failed to fetch time entries' })
  }
})

// Update time entry
app.put('/api/time-entries/:id', async (req, res) => {
  try {
    const entry = await prisma.timeEntry.update({
      where: { id: parseInt(req.params.id) },
      data: {
        regularHours: req.body.regularHours,
        overtimeHours: req.body.overtimeHours,
        type: req.body.overtimeHours > 0 ? 'OVERTIME' : 'REGULAR',
      },
    })
    res.json(entry)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update time entry' })
  }
})

// Delete time entry
app.delete('/api/time-entries/:id', async (req, res) => {
  try {
    await prisma.timeEntry.delete({
      where: { id: parseInt(req.params.id) },
    })
    res.json({ message: 'Time entry deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete time entry' })
  }
})

// Get time entries for a date range with full details
app.get('/api/time-entries/range', async (req, res) => {
  const { startDate, endDate } = req.query

  try {
    const entries = await prisma.timeEntry.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        employee: {
          include: {
            unionClass: true,
          },
        },
        project: true,
      },
      orderBy: {
        date: 'desc',
      },
    })
    res.json(entries)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch time entries' })
  }
})

// Add to server.cjs

// Get local employee payments by week
app.get('/api/time-entries/local-payments', async (req, res) => {
  const { weekNumber, yearNumber } = req.query

  try {
    // Get all local employees
    const localEmployees = await prisma.employee.findMany({
      where: {
        employeeType: 'LOCAL',
      },
    })

    // Get time entries for the week
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        weekNumber: parseInt(weekNumber),
        yearNumber: parseInt(yearNumber),
        employee: {
          employeeType: 'LOCAL',
        },
      },
      include: {
        employee: true,
      },
    })

    // Group entries by employee
    const groupedEntries = localEmployees
      .map((employee) => {
        const employeeEntries = timeEntries.filter((entry) => entry.employeeId === employee.id)

        if (employeeEntries.length === 0) return null

        const regularHours = employeeEntries.reduce((sum, entry) => sum + entry.regularHours, 0)
        const overtimeHours = employeeEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0)
        const hourlyRate = employee.hourlyRate || 0

        return {
          weekNumber: parseInt(weekNumber),
          yearNumber: parseInt(yearNumber),
          employee,
          regularHours,
          overtimeHours,
          regularPay: regularHours * hourlyRate,
          overtimePay: overtimeHours * (hourlyRate * 1.5),
          totalPay: regularHours * hourlyRate + overtimeHours * (hourlyRate * 1.5),
          timeEntries: employeeEntries,
          status: employeeEntries[0]?.paymentStatus || 'PENDING',
        }
      })
      .filter(Boolean) // Remove null entries

    res.json(groupedEntries)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch local payments' })
  }
})

// Update payment status for time entries
app.post('/api/time-entries/update-status', async (req, res) => {
  const { employeeId, weekNumber, yearNumber, status } = req.body

  try {
    // Update time entries
    await prisma.timeEntry.updateMany({
      where: {
        employeeId,
        weekNumber,
        yearNumber,
      },
      data: {
        paymentStatus: status,
      },
    })

    // Create payment record if status is PAID
    if (status === 'PAID') {
      // Get time entries with employee data
      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          employeeId,
          weekNumber,
          yearNumber,
        },
        include: {
          employee: true,
        },
      })

      // Calculate total amount
      const totalAmount = timeEntries.reduce((sum, entry) => {
        const hourlyRate = entry.employee.hourlyRate || 0
        const regularPay = entry.regularHours * hourlyRate
        const overtimePay = entry.overtimeHours * (hourlyRate * 1.5)
        return sum + regularPay + overtimePay
      }, 0)

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          employeeId,
          amount: totalAmount,
          date: new Date(),
          weekNumber,
          yearNumber,
          status: 'PAID',
        },
      })

      // Link time entries to payment
      await prisma.$transaction(
        timeEntries.map((entry) =>
          prisma.timeEntry.update({
            where: { id: entry.id },
            data: { paymentId: payment.id },
          }),
        ),
      )
    }

    res.json({ message: 'Payment status updated successfully' })
  } catch (error) {
    console.error('Error updating payment status:', error)
    res.status(500).json({ error: 'Failed to update payment status', details: error.message })
  }
})

// Add to server.cjs

// Update the /api/payments/employee/:id endpoint in server.cjs

app.get('/api/payments/employee/:id', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        employeeId: parseInt(req.params.id),
      },
      include: {
        employee: true,
      },
      orderBy: [{ yearNumber: 'desc' }, { weekNumber: 'desc' }],
    })

    // Add logging to debug
    console.log('Payments found:', payments)
    res.json(payments)
  } catch (error) {
    console.error('Error in /api/payments/employee/:id:', error)
    res.status(500).json({ error: 'Failed to fetch payment history', details: error.message })
  }
})

// Union Payment Endpoints
app.post('/api/union-payments/bulk', async (req, res) => {
  try {
    const { weekNumber, yearNumber, employeeIds, status } = req.body

    // Validate status transition
    const validTransitions = {
      PENDING: ['PROCESSING', 'PAID'],
      PROCESSING: ['PAID', 'CANCELLED'],
      PAID: [],
      CANCELLED: [],
    }

    // Get and validate time entries
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        weekNumber: parseInt(weekNumber),
        yearNumber: parseInt(yearNumber),
        employeeId: { in: employeeIds },
        employee: { employeeType: 'UNION' },
        paymentStatus: { in: Object.keys(validTransitions) },
      },
      include: {
        employee: {
          include: {
            unionClass: { include: { rates: true } },
          },
        },
      },
    })

    // Group and validate entries
    const groupedEntries = timeEntries.reduce((acc, entry) => {
      if (!validTransitions[entry.paymentStatus].includes(status)) {
        throw new Error(`Invalid status transition from ${entry.paymentStatus} to ${status}`)
      }
      if (!entry.employee?.unionClass) {
        throw new Error(`Employee ${entry.employeeId} has no union class`)
      }
      if (!acc[entry.employeeId]) acc[entry.employeeId] = []
      acc[entry.employeeId].push(entry)
      return acc
    }, {})

    const paymentPromises = Object.entries(groupedEntries).map(async ([employeeId, entries]) => {
      const employee = entries[0].employee
      const regularHours = entries.reduce((sum, entry) => sum + entry.regularHours, 0)
      const overtimeHours = entries.reduce((sum, entry) => sum + entry.overtimeHours, 0)

      // Find applicable rate with normalized dates
      const weekDate = normalizeDate(entries[0].date)
      const applicableRate = employee.unionClass.rates.find((rate) => {
        const effectiveDate = normalizeDate(rate.effectiveDate)
        const endDate = rate.endDate ? normalizeDate(rate.endDate) : new Date()
        return weekDate >= effectiveDate && weekDate <= endDate
      })

      if (!applicableRate) {
        throw new Error(`No applicable rate found for employee ${employeeId}`)
      }

      // Calculate payments with precision
      const regularPay = Number((regularHours * applicableRate.regularRate).toFixed(2))
      const overtimePay = Number((overtimeHours * applicableRate.overtimeRate).toFixed(2))
      const benefitsPay = Number(
        ((regularHours + overtimeHours) * applicableRate.benefitsRate).toFixed(2),
      )
      const totalPay = Number((regularPay + overtimePay + benefitsPay).toFixed(2))

      // Update within transaction
      const updates = [
        prisma.timeEntry.updateMany({
          where: { id: { in: entries.map((e) => e.id) } },
          data: { paymentStatus: status },
        }),
      ]

      if (status === 'PAID') {
        updates.push(
          prisma.payment.create({
            data: {
              employeeId: parseInt(employeeId),
              amount: totalPay,
              date: normalizeDate(new Date()),
              weekNumber: parseInt(weekNumber),
              yearNumber: parseInt(yearNumber),
              status,
              notes: `Regular: ${regularPay}, OT: ${overtimePay}, Benefits: ${benefitsPay}`,
            },
          }),
        )
      }

      return updates
    })

    // Flatten and execute all updates in single transaction
    await prisma.$transaction(paymentPromises.flat())
    res.json({ message: 'Union payments processed successfully' })
  } catch (error) {
    console.error('Error processing union payments:', error)
    res.status(500).json({ error: 'Failed to process union payments', details: error.message })
  }
})

// Get union rates for a specific date
app.get('/api/union-rates/:employeeId/:date', async (req, res) => {
  try {
    const { employeeId, date } = req.params
    const checkDate = new Date(date)

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) },
      include: {
        unionClass: {
          include: {
            rates: true,
          },
        },
      },
    })

    if (!employee || !employee.unionClass) {
      return res.status(404).json({ error: 'Employee or union class not found' })
    }

    const applicableRate = employee.unionClass.rates.find((rate) => {
      const effectiveDate = new Date(rate.effectiveDate)
      const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
      return checkDate >= effectiveDate && checkDate <= endDate
    })

    if (!applicableRate) {
      return res.status(404).json({ error: 'No applicable rate found for the date' })
    }

    res.json(applicableRate)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch union rates' })
  }
})

// Get union payments summary by classification
app.get('/api/union-payments/summary', async (req, res) => {
  const { weekNumber, yearNumber } = req.query

  try {
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        weekNumber: parseInt(String(weekNumber)),
        yearNumber: parseInt(String(yearNumber)),
        employee: {
          employeeType: 'UNION',
        },
      },
      include: {
        employee: {
          include: {
            unionClass: true,
          },
        },
      },
    })

    const summary = timeEntries.reduce((acc, entry) => {
      const classId = entry.employee.unionClassId
      if (!classId) return acc

      if (!acc[classId]) {
        acc[classId] = {
          className: entry.employee.unionClass?.name || 'Unknown',
          regularHours: 0,
          overtimeHours: 0,
          employeeCount: new Set(),
        }
      }

      acc[classId].regularHours += entry.regularHours
      acc[classId].overtimeHours += entry.overtimeHours
      acc[classId].employeeCount.add(entry.employeeId)
      return acc
    }, {})

    // Convert Sets to counts for JSON serialization
    Object.values(summary).forEach((s) => {
      s.employeeCount = s.employeeCount.size
    })

    res.json(summary)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch union payments summary' })
  }
})

// Add to server.cjs

// Get work items for a project
app.get('/api/projects/:projectId/work-items', async (req, res) => {
  try {
    const projectWorkItems = await prisma.projectWorkItem.findMany({
      where: {
        projectId: req.params.projectId,
      },
      include: {
        workItem: true,
      },
      orderBy: {
        workItem: {
          code: 'asc',
        },
      },
    })

    const workItems = projectWorkItems.map((pwi) => ({
      ...pwi.workItem,
      unitPrice: pwi.unitPrice, // Use project-specific price
    }))

    res.json(workItems)
  } catch (error) {
    console.error('Error fetching work items:', error)
    res.status(500).json({ error: 'Failed to fetch work items' })
  }
})

// Create work item for a project
app.post('/api/projects/:projectId/work-items', async (req, res) => {
  try {
    // First create the work item
    const workItem = await prisma.workItem.create({
      data: {
        code: req.body.code,
        description: req.body.description,
        unit: req.body.unit,
        unitPrice: parseFloat(req.body.unitPrice),
        isTemplate: req.body.isTemplate,
      },
    })

    // Then create the project association
    await prisma.projectWorkItem.create({
      data: {
        projectId: req.params.projectId,
        workItemId: workItem.id,
        unitPrice: parseFloat(req.body.unitPrice),
      },
    })

    res.json(workItem)
  } catch (error) {
    console.error('Error creating work item:', error)
    res.status(500).json({ error: 'Failed to create work item: ' + error.message })
  }
})

// Update work item
app.put('/api/projects/:projectId/work-items/:id', async (req, res) => {
  try {
    // Update the work item
    const workItem = await prisma.workItem.update({
      where: { id: req.params.id },
      data: {
        code: req.body.code,
        description: req.body.description,
        unit: req.body.unit,
        unitPrice: parseFloat(req.body.unitPrice),
        isTemplate: req.body.isTemplate,
      },
    })

    // Update the project-specific price
    await prisma.projectWorkItem.updateMany({
      where: {
        projectId: req.params.projectId,
        workItemId: req.params.id,
      },
      data: {
        unitPrice: parseFloat(req.body.unitPrice),
      },
    })

    res.json(workItem)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update work item' })
  }
})

// Delete work item from project
app.delete('/api/projects/:projectId/work-items/:id', async (req, res) => {
  try {
    // First remove project association
    await prisma.projectWorkItem.deleteMany({
      where: {
        projectId: req.params.projectId,
        workItemId: req.params.id,
      },
    })

    // Then delete the work item if it's not used in other projects
    const usageCount = await prisma.projectWorkItem.count({
      where: {
        workItemId: req.params.id,
      },
    })

    if (usageCount === 0) {
      await prisma.workItem.delete({
        where: { id: req.params.id },
      })
    }

    res.json({ message: 'Work item removed successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete work item' })
  }
})

// Get template work items
app.get('/api/work-items/templates', async (req, res) => {
  try {
    const templates = await prisma.workItem.findMany({
      where: {
        isTemplate: true,
      },
      orderBy: {
        code: 'asc',
      },
    })
    res.json(templates)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch template work items' })
  }
})
// Add to server.cjs

// Get buildings for a project
app.get('/api/buildings', async (req, res) => {
  try {
    const buildings = await prisma.building.findMany({
      where: { projectId: req.query.projectId },
      include: {
        elevations: {
          include: {
            quantities: {
              include: {
                workItem: true,
              },
            },
          },
        },
      },
    })
    res.json(buildings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch buildings' })
  }
})

// Create building
app.post('/api/buildings', async (req, res) => {
  try {
    const building = await prisma.building.create({
      data: {
        name: req.body.name,
        projectId: req.body.projectId,
      },
    })
    res.json(building)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create building' })
  }
})

// In server.cjs
app.get('/api/buildings/:id', async (req, res) => {
  try {
    console.log('Fetching building:', req.params.id)
    const building = await prisma.building.findUnique({
      where: { id: req.params.id },
      include: {
        elevations: {
          include: {
            quantities: {
              include: {
                workItem: true,
              },
            },
          },
        },
      },
    })
    console.log('Found building:', building)
    res.json(building)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Failed to fetch building' })
  }
})

// Update building
app.put('/api/buildings/:id', async (req, res) => {
  try {
    const building = await prisma.building.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
      },
    })
    res.json(building)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update building' })
  }
})

// Delete building
app.delete('/api/buildings/:id', async (req, res) => {
  try {
    await prisma.building.delete({
      where: { id: req.params.id },
    })
    res.json({ message: 'Building deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete building' })
  }
})

// Get project work items
app.get('/api/projects/:id/work-items', async (req, res) => {
  try {
    const workItems = await prisma.workItem.findMany({
      where: {
        projects: {
          some: {
            projectId: req.params.id,
          },
        },
      },
    })
    res.json(workItems)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch work items' })
  }
})

// Create elevation with quantities
app.post('/api/elevations', async (req, res) => {
  try {
    const elevation = await prisma.$transaction(async (prisma) => {
      const newElevation = await prisma.elevation.create({
        data: {
          name: req.body.name,
          buildingId: req.body.buildingId,
          quantities: {
            create: req.body.quantities.map((q) => ({
              workItemId: q.workItemId,
              quantity: q.quantity,
              completed: 0,
            })),
          },
        },
        include: {
          building: true,
          quantities: {
            include: { workItem: true },
          },
        },
      })

      const building = await prisma.building.findUnique({
        where: { id: req.body.buildingId },
        select: { projectId: true },
      })

      const buildings = await prisma.building.findMany({
        where: { projectId: building.projectId },
        include: {
          elevations: {
            include: {
              quantities: {
                include: { workItem: true },
              },
            },
          },
        },
      })

      const totalValue = buildings.reduce((projectTotal, building) => {
        return (
          projectTotal +
          building.elevations.reduce((buildingTotal, elevation) => {
            return (
              buildingTotal +
              elevation.quantities.reduce((elevationTotal, qty) => {
                return elevationTotal + qty.quantity * qty.workItem.unitPrice
              }, 0)
            )
          }, 0)
        )
      }, 0)

      await prisma.project.update({
        where: { id: building.projectId },
        data: { contractValue: totalValue },
      })

      return newElevation
    })

    res.json(elevation)
  } catch (error) {
    console.error('Error creating elevation:', error)
    res.status(500).json({ error: 'Failed to create elevation' })
  }
})

// Update elevation and quantities
app.put('/api/elevations/:id', async (req, res) => {
  try {
    const elevation = await prisma.$transaction(async (prisma) => {
      // Get building and project info first
      const currentElevation = await prisma.elevation.findUnique({
        where: { id: req.params.id },
        include: { building: true },
      })

      // Delete existing quantities
      await prisma.workItemQuantity.deleteMany({
        where: { elevationId: req.params.id },
      })

      // Update elevation with new quantities
      const updatedElevation = await prisma.elevation.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name,
          quantities: {
            create: req.body.quantities.map((q) => ({
              workItemId: q.workItemId,
              quantity: q.quantity,
              completed: 0,
            })),
          },
        },
        include: {
          building: true,
          quantities: {
            include: { workItem: true },
          },
        },
      })

      // Recalculate project value
      const buildings = await prisma.building.findMany({
        where: { projectId: currentElevation.building.projectId },
        include: {
          elevations: {
            include: {
              quantities: {
                include: { workItem: true },
              },
            },
          },
        },
      })

      const totalValue = buildings.reduce((projectTotal, building) => {
        return (
          projectTotal +
          building.elevations.reduce((buildingTotal, elevation) => {
            return (
              buildingTotal +
              elevation.quantities.reduce((elevationTotal, qty) => {
                return elevationTotal + qty.quantity * qty.workItem.unitPrice
              }, 0)
            )
          }, 0)
        )
      }, 0)

      await prisma.project.update({
        where: { id: currentElevation.building.projectId },
        data: { contractValue: totalValue },
      })

      return updatedElevation
    })

    res.json(elevation)
  } catch (error) {
    console.error('Error updating elevation:', error)
    res.status(500).json({ error: 'Failed to update elevation' })
  }
})

app.delete('/api/elevations/:id', async (req, res) => {
  try {
    await prisma.$transaction(async (prisma) => {
      // Get elevation info before deletion
      const elevation = await prisma.elevation.findUnique({
        where: { id: req.params.id },
        include: { building: true },
      })

      // Delete quantities first
      await prisma.workItemQuantity.deleteMany({
        where: { elevationId: req.params.id },
      })

      // Delete the elevation
      await prisma.elevation.delete({
        where: { id: req.params.id },
      })

      // Recalculate project value
      const buildings = await prisma.building.findMany({
        where: { projectId: elevation.building.projectId },
        include: {
          elevations: {
            include: {
              quantities: {
                include: { workItem: true },
              },
            },
          },
        },
      })

      const totalValue = buildings.reduce((projectTotal, building) => {
        return (
          projectTotal +
          building.elevations.reduce((buildingTotal, elevation) => {
            return (
              buildingTotal +
              elevation.quantities.reduce((elevationTotal, qty) => {
                return elevationTotal + qty.quantity * qty.workItem.unitPrice
              }, 0)
            )
          }, 0)
        )
      }, 0)

      await prisma.project.update({
        where: { id: elevation.building.projectId },
        data: { contractValue: totalValue },
      })
    })

    res.json({ message: 'Elevation deleted successfully' })
  } catch (error) {
    console.error('Error deleting elevation:', error)
    res.status(500).json({ error: 'Failed to delete elevation' })
  }
})

app.post('/api/elevations/:id/complete', async (req, res) => {
  try {
    console.log('Attempting to complete elevation:', req.params.id)

    // First get all quantities for this elevation
    const quantities = await prisma.workItemQuantity.findMany({
      where: { elevationId: req.params.id },
    })

    // Update each quantity individually
    const updatePromises = quantities.map((qty) =>
      prisma.workItemQuantity.update({
        where: { id: qty.id },
        data: { completed: qty.quantity },
      }),
    )

    await prisma.$transaction([
      ...updatePromises,
      prisma.elevation.update({
        where: { id: req.params.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        },
      }),
    ])

    res.json({ message: 'Elevation marked complete' })
  } catch (error) {
    console.error('Error completing elevation:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/projects/:projectId/expenses', async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: {
        projectId: req.params.projectId,
      },
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })
    res.json(expenses)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project expenses' })
  }
})

app.get('/api/projects/:projectId/labor', async (req, res) => {
  const { startDate, endDate } = req.query
  try {
    const entries = await prisma.timeEntry.findMany({
      where: {
        date: {
          gte: normalizeDate(new Date(startDate)),
          lte: normalizeDate(new Date(endDate)),
        },
        projectId: req.params.projectId,
      },
      include: {
        employee: {
          include: {
            unionClass: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })
    res.json(entries)
  } catch (error) {
    console.error('Error fetching labor data:', error)
    res.status(500).json({ error: 'Failed to fetch labor data' })
  }
})

// Modify the active workers endpoint
app.get('/api/projects/:projectId/labor/active-workers', async (req, res) => {
  const { startDate, endDate } = req.query
  try {
    const entries = await prisma.timeEntry.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        projectId: req.params.projectId,
      },
      include: {
        employee: {
          include: {
            unionClass: {
              include: {
                rates: true,
              },
            },
          },
        },
      },
    })

    const localEntries = entries.filter((e) => e.employee.employeeType === 'LOCAL')
    const unionEntries = entries.filter((e) => e.employee.employeeType === 'UNION')

    const localStats = {
      count: new Set(localEntries.map((e) => e.employeeId)).size,
      regularHours: localEntries.reduce((sum, e) => sum + e.regularHours, 0),
      overtimeHours: localEntries.reduce((sum, e) => sum + e.overtimeHours, 0),
      totalPay: localEntries.reduce((sum, e) => {
        const hourlyRate = e.employee.hourlyRate || 0
        return sum + e.regularHours * hourlyRate + e.overtimeHours * hourlyRate * 1.5
      }, 0),
    }

    const unionStats = {
      count: new Set(unionEntries.map((e) => e.employeeId)).size,
      regularHours: unionEntries.reduce((sum, e) => sum + e.regularHours, 0),
      overtimeHours: unionEntries.reduce((sum, e) => sum + e.overtimeHours, 0),
      regularPay: 0,
      overtimePay: 0,
      benefitsPay: 0,
      totalPay: 0,
    }

    // Calculate union pay with historical rates
    for (const entry of unionEntries) {
      const entryDate = normalizeDate(entry.date)
      const rates = entry.employee.unionClass?.rates || []
      const applicableRate = rates.find((rate) => {
        const effectiveDate = normalizeDate(rate.effectiveDate)
        const endDate = rate.endDate ? normalizeDate(rate.endDate) : new Date()
        return entryDate >= effectiveDate && entryDate <= endDate
      })

      if (applicableRate) {
        unionStats.regularPay += entry.regularHours * applicableRate.regularRate
        unionStats.overtimePay += entry.overtimeHours * applicableRate.overtimeRate
        unionStats.benefitsPay +=
          (entry.regularHours + entry.overtimeHours) * applicableRate.benefitsRate
      }
    }

    unionStats.totalPay = unionStats.regularPay + unionStats.overtimePay + unionStats.benefitsPay

    res.json({
      total: localStats.count + unionStats.count,
      local: localStats,
      union: unionStats,
    })
  } catch (error) {
    console.error('Error fetching active workers:', error)
    res.status(500).json({ error: 'Failed to fetch active workers' })
  }
})

// Modify the union stats endpoint
app.get('/api/projects/:projectId/labor/union-stats', async (req, res) => {
  const { startDate, endDate } = req.query
  try {
    const entries = await prisma.timeEntry.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        projectId: req.params.projectId,
        employee: {
          employeeType: 'UNION',
        },
      },
      include: {
        employee: {
          include: {
            unionClass: {
              include: {
                rates: true,
              },
            },
          },
        },
      },
    })

    const stats = {}

    for (const entry of entries) {
      const classId = entry.employee.unionClassId
      const className = entry.employee.unionClass?.name || 'Unknown'

      if (!stats[classId]) {
        stats[classId] = {
          className,
          regularHours: 0,
          overtimeHours: 0,
          workers: new Set(),
          regularPay: 0,
          overtimePay: 0,
          benefitsPay: 0,
          totalPay: 0,
        }
      }

      stats[classId].regularHours += entry.regularHours
      stats[classId].overtimeHours += entry.overtimeHours
      stats[classId].workers.add(entry.employeeId)

      // Calculate pay using historical rates
      const entryDate = normalizeDate(entry.date)
      const rates = entry.employee.unionClass?.rates || []
      const applicableRate = rates.find((rate) => {
        const effectiveDate = normalizeDate(rate.effectiveDate)
        const endDate = rate.endDate ? normalizeDate(rate.endDate) : new Date()
        return entryDate >= effectiveDate && entryDate <= endDate
      })

      if (applicableRate) {
        stats[classId].regularPay += entry.regularHours * applicableRate.regularRate
        stats[classId].overtimePay += entry.overtimeHours * applicableRate.overtimeRate
        stats[classId].benefitsPay +=
          (entry.regularHours + entry.overtimeHours) * applicableRate.benefitsRate
      }
    }

    // Calculate totals and format for response
    const formattedStats = Object.values(stats).map((stat) => ({
      ...stat,
      workers: stat.workers.size,
      totalPay: stat.regularPay + stat.overtimePay + stat.benefitsPay,
    }))

    res.json(formattedStats)
  } catch (error) {
    console.error('Error fetching union stats:', error)
    res.status(500).json({ error: 'Failed to fetch union stats' })
  }
})

// Add to server.cjs
app.get('/api/projects/:projectId/labor/local-stats', async (req, res) => {
  const { startDate, endDate } = req.query
  try {
    const entries = await prisma.timeEntry.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        projectId: req.params.projectId,
        employee: {
          employeeType: 'LOCAL',
        },
      },
      include: {
        employee: true,
      },
    })

    // Group entries by employee
    const workerStats = []
    const workerEntries = {}

    entries.forEach((entry) => {
      const { employeeId } = entry
      if (!workerEntries[employeeId]) {
        workerEntries[employeeId] = []
      }
      workerEntries[employeeId].push(entry)
    })

    // Calculate stats for each worker
    Object.entries(workerEntries).forEach(([employeeId, entries]) => {
      const worker = entries[0].employee
      const hourlyRate = worker.hourlyRate || 0
      const regularHours = entries.reduce((sum, e) => sum + e.regularHours, 0)
      const overtimeHours = entries.reduce((sum, e) => sum + e.overtimeHours, 0)
      const regularPay = regularHours * hourlyRate
      const overtimePay = overtimeHours * (hourlyRate * 1.5)

      workerStats.push({
        employeeId: parseInt(employeeId),
        name: `${worker.firstName} ${worker.lastName}`,
        hourlyRate,
        regularHours,
        overtimeHours,
        regularPay,
        overtimePay,
        totalPay: regularPay + overtimePay,
      })
    })

    // Calculate totals
    const summary = {
      totalRegularHours: workerStats.reduce((sum, w) => sum + w.regularHours, 0),
      totalOvertimeHours: workerStats.reduce((sum, w) => sum + w.overtimeHours, 0),
      totalRegularPay: workerStats.reduce((sum, w) => sum + w.regularPay, 0),
      totalOvertimePay: workerStats.reduce((sum, w) => sum + w.overtimePay, 0),
      totalPay: workerStats.reduce((sum, w) => sum + w.totalPay, 0),
      workerStats,
    }

    res.json(summary)
  } catch (error) {
    console.error('Error fetching local labor stats:', error)
    res.status(500).json({ error: 'Failed to fetch local labor stats' })
  }
})

// Get expense summary by category
app.get('/api/projects/:id/expenses/summary', async (req, res) => {
  try {
    const expenses = await prisma.expense.groupBy({
      by: ['category'],
      where: {
        projectId: req.params.id,
      },
      _sum: {
        amount: true,
      },
    })

    // Transform to required format
    const summary = {
      material: 0,
      tools: 0,
      rentals: 0,
      operational: 0,
    }

    expenses.forEach((exp) => {
      summary[exp.category.toLowerCase()] = exp._sum.amount || 0
    })

    res.json(summary)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense summary' })
  }
})

// Get labor cost summary
app.get('/api/projects/:id/labor/summary', async (req, res) => {
  try {
    // Get all time entries for the project
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        projectId: req.params.id,
      },
      include: {
        employee: {
          include: {
            unionClass: {
              include: {
                rates: true,
              },
            },
          },
        },
      },
    })

    const laborCosts = {
      unionBase: 0,
      unionBenefits: 0,
      local: 0,
    }

    for (const entry of timeEntries) {
      if (entry.employee.employeeType === 'LOCAL') {
        const hourlyRate = entry.employee.hourlyRate || 0
        laborCosts.local += entry.regularHours * hourlyRate
        laborCosts.local += entry.overtimeHours * (hourlyRate * 1.5)
      } else {
        // Find applicable union rate for the entry date
        const entryDate = new Date(entry.date)
        const rates = entry.employee.unionClass?.rates || []
        const applicableRate = rates.find((rate) => {
          const effectiveDate = new Date(rate.effectiveDate)
          const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
          return entryDate >= effectiveDate && entryDate <= endDate
        })

        if (applicableRate) {
          laborCosts.unionBase += entry.regularHours * applicableRate.regularRate
          laborCosts.unionBase += entry.overtimeHours * applicableRate.overtimeRate
          laborCosts.unionBenefits +=
            (entry.regularHours + entry.overtimeHours) * applicableRate.benefitsRate
        }
      }
    }

    // Round to 2 decimal places
    Object.keys(laborCosts).forEach((key) => {
      laborCosts[key] = Math.round(laborCosts[key] * 100) / 100
    })

    res.json(laborCosts)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch labor summary' })
  }
})

// Get monthly financial trends
app.get('/api/projects/:id/financials/monthly', async (req, res) => {
  try {
    const projectData = await prisma.project.findUnique({
      where: { id: req.params.id },
      select: { startDate: true },
    })

    const startDate = new Date(projectData.startDate)
    const endDate = new Date()
    const months = []

    // Generate array of months
    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)

      const [expenses, timeEntries] = await Promise.all([
        // Get expenses for month
        prisma.expense.aggregate({
          where: {
            projectId: req.params.id,
            date: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _sum: {
            amount: true,
          },
        }),

        // Get time entries for month
        prisma.timeEntry.findMany({
          where: {
            projectId: req.params.id,
            date: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          include: {
            employee: {
              include: {
                unionClass: {
                  include: {
                    rates: true,
                  },
                },
              },
            },
          },
        }),
      ])

      // Calculate labor cost
      let laborCost = 0
      for (const entry of timeEntries) {
        if (entry.employee.employeeType === 'LOCAL') {
          const hourlyRate = entry.employee.hourlyRate || 0
          laborCost += entry.regularHours * hourlyRate
          laborCost += entry.overtimeHours * (hourlyRate * 1.5)
        } else {
          const applicableRate = entry.employee.unionClass?.rates.find((rate) => {
            const effectiveDate = new Date(rate.effectiveDate)
            const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
            return entry.date >= effectiveDate && entry.date <= endDate
          })

          if (applicableRate) {
            laborCost += entry.regularHours * applicableRate.regularRate
            laborCost += entry.overtimeHours * applicableRate.overtimeRate
            laborCost += (entry.regularHours + entry.overtimeHours) * applicableRate.benefitsRate
          }
        }
      }

      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        expenses: Math.round((expenses._sum.amount || 0) * 100) / 100,
        labor: Math.round(laborCost * 100) / 100,
      })
    }

    res.json(months)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly trends' })
  }
})
