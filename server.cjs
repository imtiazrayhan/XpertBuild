const express = require('express')
const { PrismaClient } = require('@prisma/client')

const app = express()
const prisma = new PrismaClient()
const port = 3000

app.use(express.json())

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

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
app.get('/api/time-entries', async (req, res) => {
  const { weekNumber, yearNumber } = req.query

  try {
    const entries = await prisma.timeEntry.findMany({
      where: {
        weekNumber: Number(weekNumber),
        yearNumber: Number(yearNumber),
      },
      include: {
        employee: true,
        project: true,
      },
      orderBy: {
        date: 'asc',
      },
    })
    res.json(entries)
  } catch (error) {
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
