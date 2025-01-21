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
// Get all time entries
app.get('/api/time-entries', async (req, res) => {
  try {
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        employee: {
          employeeType: 'LOCAL',
        },
      },
      include: {
        employee: true,
      },
      orderBy: {
        date: 'desc',
      },
    })
    res.json(timeEntries)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch time entries' })
  }
})

// Create time entry
app.post('/api/time-entries', async (req, res) => {
  try {
    const timeEntry = await prisma.timeEntry.create({
      data: {
        employeeId: req.body.employeeId,
        date: new Date(req.body.date),
        regularHours: req.body.regularHours,
        overtimeHours: 0,
        type: 'REGULAR',
        weekNumber: getWeekNumber(new Date(req.body.date)),
        yearNumber: new Date(req.body.date).getFullYear(),
        paymentStatus: 'PENDING',
      },
    })
    res.json(timeEntry)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create time entry' })
  }
})

// Update time entry payment status
app.patch('/api/time-entries/:id', async (req, res) => {
  try {
    const timeEntry = await prisma.timeEntry.update({
      where: { id: parseInt(req.params.id) },
      data: {
        paymentStatus: req.body.paymentStatus,
      },
    })
    res.json(timeEntry)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update time entry' })
  }
})

// Get all unpaid entries for an employee
app.get('/api/time-entries/unpaid/:employeeId', async (req, res) => {
  try {
    const entries = await prisma.timeEntry.findMany({
      where: {
        employeeId: parseInt(req.params.employeeId),
        paymentStatus: 'PENDING',
      },
    })
    res.json(entries)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unpaid entries' })
  }
})

// Update time entry
app.put('/api/time-entries/:id', async (req, res) => {
  try {
    const timeEntry = await prisma.timeEntry.update({
      where: { id: parseInt(req.params.id) },
      data: {
        date: new Date(req.body.date),
        regularHours: req.body.regularHours,
        overtimeHours: req.body.overtimeHours,
      },
    })
    res.json(timeEntry)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update time entry' })
  }
})

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}
