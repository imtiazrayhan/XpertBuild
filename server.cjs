const express = require('express')
const { PrismaClient } = require('@prisma/client')

const syncService = require('./services/syncService.cjs')

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
      include: {
        client: {
          select: {
            name: true,
            code: true,
          },
        },
      },
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
        contractValue: parseFloat(req.body.contractValue),
        clientId: req.body.clientId, // Fixed: Use clientId instead of client
        contractType: req.body.contractType,
        generalContractor: req.body.generalContractor,
        startDate: new Date(req.body.startDate),
        status: req.body.status,
        address: req.body.address,
      },
    })
    res.json(project)
  } catch (error) {
    console.error('Project creation error:', error)
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
        clientId: projectData.clientId,
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
          subScope: {
            scope: {
              projectId: req.params.id,
            },
          },
        },
      }),
      prisma.subScope.deleteMany({
        where: {
          scope: {
            projectId: req.params.id,
          },
        },
      }),
      prisma.scope.deleteMany({
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
        baseRates: {
          orderBy: { effectiveDate: 'desc' },
        },
        customRates: {
          orderBy: { effectiveDate: 'desc' },
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
  const { baseRate, customRates } = req.body

  try {
    await prisma.$transaction(async (prisma) => {
      // Handle base rate
      if (baseRate) {
        // End date any current active base rate
        if (!baseRate.endDate) {
          await prisma.unionClassBaseRate.updateMany({
            where: {
              unionClassId: parseInt(req.params.id),
              endDate: null,
            },
            data: {
              endDate: new Date(baseRate.effectiveDate),
            },
          })
        }

        // Create new base rate
        await prisma.unionClassBaseRate.create({
          data: {
            unionClassId: parseInt(req.params.id),
            regularRate: parseFloat(baseRate.regularRate),
            overtimeRate: parseFloat(baseRate.overtimeRate),
            benefitsRate: parseFloat(baseRate.benefitsRate),
            effectiveDate: new Date(baseRate.effectiveDate),
            endDate: baseRate.endDate ? new Date(baseRate.endDate) : null,
          },
        })
      }

      // Handle custom rates
      if (customRates && customRates.length > 0) {
        // End date any current active custom rates
        if (!baseRate?.endDate) {
          await prisma.unionClassCustomRate.updateMany({
            where: {
              unionClassId: parseInt(req.params.id),
              endDate: null,
            },
            data: {
              endDate: new Date(baseRate.effectiveDate),
            },
          })
        }

        // Create new custom rates
        await Promise.all(
          customRates.map((rate) =>
            prisma.unionClassCustomRate.create({
              data: {
                unionClassId: parseInt(req.params.id),
                name: rate.name,
                description: rate.description || null,
                rate: parseFloat(rate.rate),
                effectiveDate: new Date(baseRate.effectiveDate),
                endDate: baseRate.endDate ? new Date(baseRate.endDate) : null,
              },
            }),
          ),
        )
      }
    })

    res.json({ message: 'Rates added successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to add rates' })
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
          projectId: entry.projectId || null,
          date,
          regularHours: entry.regularHours || 0,
          overtimeHours: entry.overtimeHours || 0,
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
        employee: {
          include: {
            unionClass: {
              include: {
                baseRates: {
                  orderBy: {
                    effectiveDate: 'desc',
                  },
                },
                customRates: {
                  orderBy: {
                    effectiveDate: 'desc',
                  },
                },
              },
            },
          },
        },
        project: true,
        payment: true,
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

// Get time entries for date range
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
            unionClass: {
              include: {
                baseRates: true,
                customRates: true,
              },
            },
          },
        },
        project: true,
        payment: true,
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

// Update single time entry
app.put('/api/time-entries/:id', async (req, res) => {
  try {
    const entry = await prisma.timeEntry.update({
      where: { id: parseInt(req.params.id) },
      data: {
        regularHours: req.body.regularHours || 0,
        overtimeHours: req.body.overtimeHours || 0,
        type: req.body.overtimeHours > 0 ? 'OVERTIME' : 'REGULAR',
        projectId: req.body.projectId || null,
        date: new Date(req.body.date),
      },
    })
    res.json(entry)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update time entry' })
  }
})

// Update time entry status
app.patch('/api/time-entries/:id', async (req, res) => {
  try {
    const entry = await prisma.timeEntry.update({
      where: { id: parseInt(req.params.id) },
      data: {
        paymentStatus: req.body.paymentStatus,
      },
    })
    res.json(entry)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update time entry status' })
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

app.post('/api/time-entries/update-status', async (req, res) => {
  const { employeeId, weekNumber, yearNumber, status } = req.body

  try {
    const timeEntries = await prisma.timeEntry.findMany({
      where: { employeeId, weekNumber, yearNumber },
      include: {
        employee: {
          include: {
            unionClass: {
              include: {
                baseRates: true,
                customRates: true,
              },
            },
          },
        },
      },
    })

    if (status === 'PAID') {
      let totalAmount = 0
      const details = []

      for (const entry of timeEntries) {
        if (entry.employee.employeeType === 'LOCAL') {
          const hourlyRate = entry.employee.hourlyRate || 0
          const regularPay = entry.regularHours * hourlyRate
          const overtimePay = entry.overtimeHours * (hourlyRate * 1.5)
          totalAmount += regularPay + overtimePay
          details.push(`Regular: ${regularPay.toFixed(2)}, OT: ${overtimePay.toFixed(2)}`)
        } else {
          const date = new Date(entry.date)
          date.setUTCHours(12, 0, 0, 0)

          const baseRate = entry.employee.unionClass?.baseRates.find((rate) => {
            const effectiveDate = new Date(rate.effectiveDate)
            const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
            effectiveDate.setUTCHours(12, 0, 0, 0)
            endDate.setUTCHours(12, 0, 0, 0)
            return date >= effectiveDate && date <= endDate
          })

          const customRates =
            entry.employee.unionClass?.customRates.filter((rate) => {
              const effectiveDate = new Date(rate.effectiveDate)
              const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
              effectiveDate.setUTCHours(12, 0, 0, 0)
              endDate.setUTCHours(12, 0, 0, 0)
              return date >= effectiveDate && date <= endDate
            }) || []

          if (baseRate) {
            const regularPay = entry.regularHours * baseRate.regularRate
            const overtimePay = entry.overtimeHours * baseRate.overtimeRate
            const benefitsPay = (entry.regularHours + entry.overtimeHours) * baseRate.benefitsRate

            const customPayments = customRates.map((rate) => ({
              name: rate.name,
              amount: (entry.regularHours + entry.overtimeHours) * rate.rate,
            }))

            const customTotal = customPayments.reduce((sum, p) => sum + p.amount, 0)
            totalAmount += regularPay + overtimePay + benefitsPay + customTotal

            details.push(
              `Regular: ${regularPay.toFixed(2)}, ` +
                `OT: ${overtimePay.toFixed(2)}, ` +
                `Benefits: ${benefitsPay.toFixed(2)}, ` +
                customPayments.map((p) => `${p.name}: ${p.amount.toFixed(2)}`).join(', '),
            )
          }
        }
      }

      await prisma.payment.create({
        data: {
          employeeId,
          amount: totalAmount,
          date: new Date(),
          weekNumber,
          yearNumber,
          status: 'PAID',
          notes: details.join(' | '),
          timeEntries: {
            connect: timeEntries.map((entry) => ({ id: entry.id })),
          },
        },
      })
    }

    await prisma.timeEntry.updateMany({
      where: { employeeId, weekNumber, yearNumber },
      data: { paymentStatus: status },
    })

    res.json({ message: 'Payment status updated successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payment status' })
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
  const { weekNumber, yearNumber, employeeIds, status } = req.body

  try {
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        weekNumber: parseInt(weekNumber),
        yearNumber: parseInt(yearNumber),
        employeeId: { in: employeeIds },
        employee: { employeeType: 'UNION' },
      },
      include: {
        employee: {
          include: {
            unionClass: {
              include: {
                baseRates: true,
                customRates: true,
              },
            },
          },
        },
      },
    })

    const updatePromises = Object.entries(
      timeEntries.reduce((acc, entry) => {
        if (!acc[entry.employeeId]) acc[entry.employeeId] = []
        acc[entry.employeeId].push(entry)
        return acc
      }, {}),
    ).map(async ([employeeId, entries]) => {
      const employee = entries[0].employee
      const weekDate = normalizeDate(entries[0].date)

      // Get applicable rates
      const baseRate = employee.unionClass?.baseRates.find((rate) => {
        const effectiveDate = normalizeDate(rate.effectiveDate)
        const endDate = rate.endDate ? normalizeDate(rate.endDate) : new Date()
        return weekDate >= effectiveDate && weekDate <= endDate
      })

      const customRates =
        employee.unionClass?.customRates.filter((rate) => {
          const effectiveDate = normalizeDate(rate.effectiveDate)
          const endDate = rate.endDate ? normalizeDate(rate.endDate) : new Date()
          return weekDate >= effectiveDate && weekDate <= endDate
        }) || []

      if (!baseRate) throw new Error(`No applicable rate for employee ${employeeId}`)

      const regularHours = entries.reduce((sum, e) => sum + e.regularHours, 0)
      const overtimeHours = entries.reduce((sum, e) => sum + e.overtimeHours, 0)

      // Calculate all payments
      const regularPay = Number((regularHours * baseRate.regularRate).toFixed(2))
      const overtimePay = Number((overtimeHours * baseRate.overtimeRate).toFixed(2))
      const benefitsPay = Number(
        ((regularHours + overtimeHours) * baseRate.benefitsRate).toFixed(2),
      )
      const customPayments = customRates.map((rate) => ({
        name: rate.name,
        amount: Number(((regularHours + overtimeHours) * rate.rate).toFixed(2)),
      }))
      const totalCustomPay = customPayments.reduce((sum, p) => sum + p.amount, 0)
      const totalPay = regularPay + overtimePay + benefitsPay + totalCustomPay

      const updates = [
        prisma.timeEntry.updateMany({
          where: { id: { in: entries.map((e) => e.id) } },
          data: { paymentStatus: status },
        }),
      ]

      if (status === 'PAID') {
        const customRateDetails = customPayments
          .map((p) => `${p.name}: ${formatCurrency(p.amount)}`)
          .join(', ')
        updates.push(
          prisma.payment.create({
            data: {
              employeeId: parseInt(employeeId),
              amount: totalPay,
              date: normalizeDate(new Date()),
              weekNumber: parseInt(weekNumber),
              yearNumber: parseInt(yearNumber),
              status,
              notes: `Regular: ${formatCurrency(regularPay)}, OT: ${formatCurrency(overtimePay)}, Benefits: ${formatCurrency(benefitsPay)}, ${customRateDetails}`,
            },
          }),
        )
      }

      return updates
    })

    await prisma.$transaction(updatePromises.flat())
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
    checkDate.setUTCHours(12, 0, 0, 0)

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) },
      include: {
        unionClass: {
          include: {
            baseRates: true,
            customRates: true,
          },
        },
      },
    })

    if (!employee?.unionClass) {
      return res.status(404).json({ error: 'Employee or union class not found' })
    }

    const baseRate = employee.unionClass.baseRates.find((rate) => {
      const effectiveDate = new Date(rate.effectiveDate)
      const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
      effectiveDate.setUTCHours(12, 0, 0, 0)
      endDate.setUTCHours(12, 0, 0, 0)
      return checkDate >= effectiveDate && checkDate <= endDate
    })

    const customRates = employee.unionClass.customRates.filter((rate) => {
      const effectiveDate = new Date(rate.effectiveDate)
      const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
      effectiveDate.setUTCHours(12, 0, 0, 0)
      endDate.setUTCHours(12, 0, 0, 0)
      return checkDate >= effectiveDate && checkDate <= endDate
    })

    if (!baseRate && customRates.length === 0) {
      return res.status(404).json({ error: 'No applicable rates found for the date' })
    }

    res.json({
      baseRate,
      customRates,
    })
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

// Replace scope endpoints with scope endpoints
app.get('/api/scopes', async (req, res) => {
  try {
    const scopes = await prisma.scope.findMany({
      where: { projectId: req.query.projectId },
      include: {
        subScopes: {
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
    res.json(scopes)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scopes' })
  }
})

app.post('/api/scopes', async (req, res) => {
  try {
    const scope = await prisma.scope.create({
      data: {
        name: req.body.name,
        projectId: req.body.projectId,
      },
    })
    res.json(scope)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create scope' })
  }
})

app.get('/api/scopes/:id', async (req, res) => {
  try {
    const scope = await prisma.scope.findUnique({
      where: { id: req.params.id },
      include: {
        subScopes: {
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
    res.json(scope)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scope' })
  }
})

// Update scope
app.put('/api/scopes/:id', async (req, res) => {
  try {
    const scope = await prisma.scope.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
      },
    })
    res.json(scope)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update scope' })
  }
})

// Delete scope
app.delete('/api/scopes/:id', async (req, res) => {
  try {
    await prisma.scope.delete({
      where: { id: req.params.id },
    })
    res.json({ message: 'scope deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete scope' })
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

// Create subScope with quantities
app.post('/api/sub-scopes', async (req, res) => {
  try {
    const subScope = await prisma.$transaction(async (prisma) => {
      const newsubScope = await prisma.subScope.create({
        data: {
          name: req.body.name,
          scopeId: req.body.scopeId,
          quantities: {
            create: req.body.quantities.map((q) => ({
              workItemId: q.workItemId,
              quantity: q.quantity,
              completed: 0,
            })),
          },
        },
        include: {
          scope: true,
          quantities: {
            include: { workItem: true },
          },
        },
      })

      const scope = await prisma.scope.findUnique({
        where: { id: req.body.scopeId },
        select: { projectId: true },
      })

      const scopes = await prisma.scope.findMany({
        where: { projectId: scope.projectId },
        include: {
          subScopes: {
            include: {
              quantities: {
                include: { workItem: true },
              },
            },
          },
        },
      })

      const totalValue = scopes.reduce((projectTotal, scope) => {
        return (
          projectTotal +
          scope.subScopes.reduce((scopeTotal, subScope) => {
            return (
              scopeTotal +
              subScope.quantities.reduce((subScopeTotal, qty) => {
                return subScopeTotal + qty.quantity * qty.workItem.unitPrice
              }, 0)
            )
          }, 0)
        )
      }, 0)

      await prisma.project.update({
        where: { id: scope.projectId },
        data: { contractValue: totalValue },
      })

      return newsubScope
    })

    res.json(subScope)
  } catch (error) {
    console.error('Error creating subScope:', error)
    res.status(500).json({ error: 'Failed to create subScope' })
  }
})

// Update subScope and quantities
app.put('/api/sub-scopes/:id', async (req, res) => {
  try {
    const subScope = await prisma.$transaction(async (prisma) => {
      // Get scope and project info first
      const currentsubScope = await prisma.subScope.findUnique({
        where: { id: req.params.id },
        include: { scope: true },
      })

      // Delete existing quantities
      await prisma.workItemQuantity.deleteMany({
        where: { subScopeId: req.params.id },
      })

      // Update subScope with new quantities
      const updatedsubScope = await prisma.subScope.update({
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
          scope: true,
          quantities: {
            include: { workItem: true },
          },
        },
      })

      // Recalculate project value
      const scopes = await prisma.scope.findMany({
        where: { projectId: currentsubScope.scope.projectId },
        include: {
          subScopes: {
            include: {
              quantities: {
                include: { workItem: true },
              },
            },
          },
        },
      })

      const totalValue = scopes.reduce((projectTotal, scope) => {
        return (
          projectTotal +
          scope.subScopes.reduce((scopeTotal, subScope) => {
            return (
              scopeTotal +
              subScope.quantities.reduce((subScopeTotal, qty) => {
                return subScopeTotal + qty.quantity * qty.workItem.unitPrice
              }, 0)
            )
          }, 0)
        )
      }, 0)

      await prisma.project.update({
        where: { id: currentsubScope.scope.projectId },
        data: { contractValue: totalValue },
      })

      return updatedsubScope
    })

    res.json(subScope)
  } catch (error) {
    console.error('Error updating subScope:', error)
    res.status(500).json({ error: 'Failed to update subScope' })
  }
})

app.delete('/api/sub-scopes/:id', async (req, res) => {
  try {
    await prisma.$transaction(async (prisma) => {
      // Get subScope info before deletion
      const subScope = await prisma.subScope.findUnique({
        where: { id: req.params.id },
        include: { scope: true },
      })

      // Delete quantities first
      await prisma.workItemQuantity.deleteMany({
        where: { subScopeId: req.params.id },
      })

      // Delete the subScope
      await prisma.subScope.delete({
        where: { id: req.params.id },
      })

      // Recalculate project value
      const scopes = await prisma.scope.findMany({
        where: { projectId: subScope.scope.projectId },
        include: {
          subScopes: {
            include: {
              quantities: {
                include: { workItem: true },
              },
            },
          },
        },
      })

      const totalValue = scopes.reduce((projectTotal, scope) => {
        return (
          projectTotal +
          scope.subScopes.reduce((scopeTotal, subScope) => {
            return (
              scopeTotal +
              subScope.quantities.reduce((subScopeTotal, qty) => {
                return subScopeTotal + qty.quantity * qty.workItem.unitPrice
              }, 0)
            )
          }, 0)
        )
      }, 0)

      await prisma.project.update({
        where: { id: subScope.scope.projectId },
        data: { contractValue: totalValue },
      })
    })

    res.json({ message: 'subScope deleted successfully' })
  } catch (error) {
    console.error('Error deleting subScope:', error)
    res.status(500).json({ error: 'Failed to delete subScope' })
  }
})

app.post('/api/sub-scopes/:id/complete', async (req, res) => {
  try {
    console.log('Attempting to complete subScope:', req.params.id)

    // First get all quantities for this subScope
    const quantities = await prisma.workItemQuantity.findMany({
      where: { subScopeId: req.params.id },
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
      prisma.subScope.update({
        where: { id: req.params.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        },
      }),
    ])

    res.json({ message: 'subScope marked complete' })
  } catch (error) {
    console.error('Error completing subScope:', error)
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
                baseRates: true,
                customRates: true,
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
      customRatesPay: {},
      totalPay: 0,
    }

    // Calculate union pay with historical rates
    for (const entry of unionEntries) {
      const entryDate = new Date(entry.date)
      entryDate.setUTCHours(12, 0, 0, 0)

      const baseRate = entry.employee.unionClass?.baseRates.find((rate) => {
        const effectiveDate = new Date(rate.effectiveDate)
        const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
        effectiveDate.setUTCHours(12, 0, 0, 0)
        endDate.setUTCHours(12, 0, 0, 0)
        return entryDate >= effectiveDate && entryDate <= endDate
      })

      const customRates =
        entry.employee.unionClass?.customRates.filter((rate) => {
          const effectiveDate = new Date(rate.effectiveDate)
          const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
          effectiveDate.setUTCHours(12, 0, 0, 0)
          endDate.setUTCHours(12, 0, 0, 0)
          return entryDate >= effectiveDate && entryDate <= endDate
        }) || []

      if (baseRate) {
        unionStats.regularPay += entry.regularHours * baseRate.regularRate
        unionStats.overtimePay += entry.overtimeHours * baseRate.overtimeRate
        unionStats.benefitsPay += (entry.regularHours + entry.overtimeHours) * baseRate.benefitsRate

        customRates.forEach((rate) => {
          if (!unionStats.customRatesPay[rate.name]) {
            unionStats.customRatesPay[rate.name] = 0
          }
          unionStats.customRatesPay[rate.name] +=
            (entry.regularHours + entry.overtimeHours) * rate.rate
        })
      }
    }

    unionStats.totalPay =
      unionStats.regularPay +
      unionStats.overtimePay +
      unionStats.benefitsPay +
      Object.values(unionStats.customRatesPay).reduce((sum, val) => sum + val, 0)

    res.json({
      total: localStats.count + unionStats.count,
      local: localStats,
      union: unionStats,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active workers' })
  }
})

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
                baseRates: true,
                customRates: true,
              },
            },
          },
        },
      },
    })

    const statsByClass = {}

    for (const entry of entries) {
      const classId = entry.employee.unionClassId
      const className = entry.employee.unionClass?.name || 'Unknown'
      const entryDate = new Date(entry.date)
      entryDate.setUTCHours(12, 0, 0, 0)

      if (!statsByClass[classId]) {
        statsByClass[classId] = {
          className,
          regularHours: 0,
          overtimeHours: 0,
          workers: new Set(),
          regularPay: 0,
          overtimePay: 0,
          benefitsPay: 0,
          customRatesPay: {},
          totalPay: 0,
        }
      }

      statsByClass[classId].regularHours += entry.regularHours
      statsByClass[classId].overtimeHours += entry.overtimeHours
      statsByClass[classId].workers.add(entry.employeeId)

      const baseRate = entry.employee.unionClass?.baseRates.find((rate) => {
        const effectiveDate = new Date(rate.effectiveDate)
        const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
        effectiveDate.setUTCHours(12, 0, 0, 0)
        endDate.setUTCHours(12, 0, 0, 0)
        return entryDate >= effectiveDate && entryDate <= endDate
      })

      const customRates =
        entry.employee.unionClass?.customRates.filter((rate) => {
          const effectiveDate = new Date(rate.effectiveDate)
          const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
          effectiveDate.setUTCHours(12, 0, 0, 0)
          endDate.setUTCHours(12, 0, 0, 0)
          return entryDate >= effectiveDate && entryDate <= endDate
        }) || []

      if (baseRate) {
        statsByClass[classId].regularPay += entry.regularHours * baseRate.regularRate
        statsByClass[classId].overtimePay += entry.overtimeHours * baseRate.overtimeRate
        statsByClass[classId].benefitsPay +=
          (entry.regularHours + entry.overtimeHours) * baseRate.benefitsRate

        customRates.forEach((rate) => {
          if (!statsByClass[classId].customRatesPay[rate.name]) {
            statsByClass[classId].customRatesPay[rate.name] = 0
          }
          statsByClass[classId].customRatesPay[rate.name] +=
            (entry.regularHours + entry.overtimeHours) * rate.rate
        })
      }
    }

    const formattedStats = Object.values(statsByClass).map((stat) => {
      const customRatesTotal = Object.values(stat.customRatesPay).reduce((sum, val) => sum + val, 0)
      const totalPay = stat.regularPay + stat.overtimePay + stat.benefitsPay + customRatesTotal

      return {
        ...stat,
        workers: stat.workers.size,
        customRatesPay: Object.entries(stat.customRatesPay).map(([name, amount]) => ({
          name,
          amount: Number(amount.toFixed(2)),
        })),
        totalPay: Number(totalPay.toFixed(2)),
      }
    })

    res.json(formattedStats)
  } catch (error) {
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
    const timeEntries = await prisma.timeEntry.findMany({
      where: { projectId: req.params.id },
      include: {
        employee: {
          include: {
            unionClass: {
              include: {
                baseRates: true,
                customRates: true,
              },
            },
          },
        },
      },
    })

    const laborCosts = {
      unionBase: 0,
      unionBenefits: 0,
      unionCustomRates: {},
      local: 0,
    }

    for (const entry of timeEntries) {
      if (entry.employee.employeeType === 'LOCAL') {
        const hourlyRate = entry.employee.hourlyRate || 0
        laborCosts.local += entry.regularHours * hourlyRate
        laborCosts.local += entry.overtimeHours * (hourlyRate * 1.5)
      } else {
        const entryDate = new Date(entry.date)
        entryDate.setUTCHours(12, 0, 0, 0)

        const baseRate = entry.employee.unionClass?.baseRates.find((rate) => {
          const effectiveDate = new Date(rate.effectiveDate)
          const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
          effectiveDate.setUTCHours(12, 0, 0, 0)
          endDate.setUTCHours(12, 0, 0, 0)
          return entryDate >= effectiveDate && entryDate <= endDate
        })

        const customRates =
          entry.employee.unionClass?.customRates.filter((rate) => {
            const effectiveDate = new Date(rate.effectiveDate)
            const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
            effectiveDate.setUTCHours(12, 0, 0, 0)
            endDate.setUTCHours(12, 0, 0, 0)
            return entryDate >= effectiveDate && entryDate <= endDate
          }) || []

        if (baseRate) {
          laborCosts.unionBase += entry.regularHours * baseRate.regularRate
          laborCosts.unionBase += entry.overtimeHours * baseRate.overtimeRate
          laborCosts.unionBenefits +=
            (entry.regularHours + entry.overtimeHours) * baseRate.benefitsRate

          customRates.forEach((rate) => {
            if (!laborCosts.unionCustomRates[rate.name]) {
              laborCosts.unionCustomRates[rate.name] = 0
            }
            laborCosts.unionCustomRates[rate.name] +=
              (entry.regularHours + entry.overtimeHours) * rate.rate
          })
        }
      }
    }

    Object.keys(laborCosts).forEach((key) => {
      if (typeof laborCosts[key] === 'number') {
        laborCosts[key] = Math.round(laborCosts[key] * 100) / 100
      }
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

    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      monthStart.setUTCHours(12, 0, 0, 0)
      monthEnd.setUTCHours(12, 0, 0, 0)

      const [expenses, timeEntries] = await Promise.all([
        prisma.expense.aggregate({
          where: {
            projectId: req.params.id,
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        }),

        prisma.timeEntry.findMany({
          where: {
            projectId: req.params.id,
            date: { gte: monthStart, lte: monthEnd },
          },
          include: {
            employee: {
              include: {
                unionClass: {
                  include: {
                    baseRates: true,
                    customRates: true,
                  },
                },
              },
            },
          },
        }),
      ])

      let laborCost = {
        base: 0,
        benefits: 0,
        customRates: {},
      }

      for (const entry of timeEntries) {
        if (entry.employee.employeeType === 'LOCAL') {
          const hourlyRate = entry.employee.hourlyRate || 0
          laborCost.base +=
            entry.regularHours * hourlyRate + entry.overtimeHours * (hourlyRate * 1.5)
        } else {
          const entryDate = new Date(entry.date)
          entryDate.setUTCHours(12, 0, 0, 0)

          const baseRate = entry.employee.unionClass?.baseRates.find((rate) => {
            const effectiveDate = new Date(rate.effectiveDate)
            const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
            effectiveDate.setUTCHours(12, 0, 0, 0)
            endDate.setUTCHours(12, 0, 0, 0)
            return entryDate >= effectiveDate && entryDate <= endDate
          })

          const customRates =
            entry.employee.unionClass?.customRates.filter((rate) => {
              const effectiveDate = new Date(rate.effectiveDate)
              const endDate = rate.endDate ? new Date(rate.endDate) : new Date()
              effectiveDate.setUTCHours(12, 0, 0, 0)
              endDate.setUTCHours(12, 0, 0, 0)
              return entryDate >= effectiveDate && entryDate <= endDate
            }) || []

          if (baseRate) {
            laborCost.base +=
              entry.regularHours * baseRate.regularRate +
              entry.overtimeHours * baseRate.overtimeRate
            laborCost.benefits += (entry.regularHours + entry.overtimeHours) * baseRate.benefitsRate

            customRates.forEach((rate) => {
              if (!laborCost.customRates[rate.name]) {
                laborCost.customRates[rate.name] = 0
              }
              laborCost.customRates[rate.name] +=
                (entry.regularHours + entry.overtimeHours) * rate.rate
            })
          }
        }
      }

      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        expenses: Math.round((expenses._sum.amount || 0) * 100) / 100,
        labor: {
          base: Math.round(laborCost.base * 100) / 100,
          benefits: Math.round(laborCost.benefits * 100) / 100,
          customRates: Object.fromEntries(
            Object.entries(laborCost.customRates).map(([name, amount]) => [
              name,
              Math.round(amount * 100) / 100,
            ]),
          ),
          total:
            Math.round(
              (laborCost.base +
                laborCost.benefits +
                Object.values(laborCost.customRates).reduce((sum, val) => sum + val, 0)) *
                100,
            ) / 100,
        },
      })
    }

    res.json(months)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly trends' })
  }
})

// Current week time entries
app.get('/api/time-entries/current-week', async (req, res) => {
  try {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setUTCHours(12, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setUTCHours(12, 0, 0, 0)

    const entries = await prisma.timeEntry.findMany({
      where: {
        date: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      include: {
        employee: true,
      },
    })
    res.json(entries)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch time entries' })
  }
})

// Recent expenses (last 30 days)
app.get('/api/expenses/recent', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setUTCHours(12, 0, 0, 0)

    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: thirtyDaysAgo,
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

// Active workers count
app.get('/api/employees/active', async (req, res) => {
  try {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setUTCHours(12, 0, 0, 0)

    const count = await prisma.timeEntry.findMany({
      where: {
        date: {
          gte: startOfWeek,
        },
      },
      select: {
        employeeId: true,
      },
      distinct: ['employeeId'],
    })

    res.json(count.length)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active workers' })
  }
})

// Get all clients
// In server.cjs
app.get('/api/clients', async (req, res) => {
  try {
    // If active parameter is provided, filter by it
    // If not provided, return all clients (for ClientsPage)
    const where = req.query.active === 'true' ? { active: true } : {}

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
    })
    res.json(clients)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' })
  }
})

// Create client
app.post('/api/clients', async (req, res) => {
  try {
    const client = await prisma.client.create({
      data: {
        name: req.body.name,
        code: req.body.code,
        description: req.body.description,
        address: req.body.address,
        contactName: req.body.contactName,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        active: true,
      },
    })
    res.json(client)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create client' })
  }
})

// Update client
app.put('/api/clients/:id', async (req, res) => {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        code: req.body.code,
        description: req.body.description,
        address: req.body.address,
        contactName: req.body.contactName,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        active: req.body.active,
      },
    })
    res.json(client)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client' })
  }
})

// Delete/deactivate client
app.delete('/api/clients/:id', async (req, res) => {
  try {
    // Soft delete by setting active to false
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { active: false },
    })
    res.json({ message: 'Client deactivated successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate client' })
  }
})

// Get single client
app.get('/api/clients/:id', async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            contractValue: true,
          },
        },
      },
    })
    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }
    res.json(client)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client' })
  }
})

app.get('/api/projects/:id/completed-value', async (req, res) => {
  try {
    const scopes = await prisma.scope.findMany({
      where: { projectId: req.params.id },
      include: {
        subScopes: {
          include: {
            quantities: {
              include: {
                workItem: {
                  include: {
                    projects: {
                      where: { projectId: req.params.id },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    const completedValue = scopes.reduce(
      (total, scope) =>
        total +
        scope.subScopes.reduce(
          (scopeTotal, subScope) =>
            scopeTotal +
            subScope.quantities.reduce((subScopeTotal, qty) => {
              const projectPrice = qty.workItem.projects[0]?.unitPrice || qty.workItem.unitPrice
              return subScopeTotal + qty.completed * projectPrice
            }, 0),
          0,
        ),
      0,
    )

    res.json({ completedValue })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch completed value' })
  }
})

// Materials endpoints
app.get('/api/materials', async (req, res) => {
  try {
    const materials = await prisma.material.findMany({
      include: {
        priceHistory: {
          include: {
            vendor: true,
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    })
    res.json(materials)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch materials' })
  }
})

app.post('/api/materials', async (req, res) => {
  try {
    const material = await prisma.material.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        unit: req.body.unit,
        category: req.body.category,
        type: req.body.type,
      },
    })
    res.json(material)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create material' })
  }
})

// Vendors endpoints
app.get('/api/vendors', async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        priceHistory: true,
      },
    })
    res.json(vendors)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendors' })
  }
})

app.post('/api/vendors', async (req, res) => {
  try {
    const vendor = await prisma.vendor.create({
      data: {
        name: req.body.name,
        contactInfo: req.body.contactInfo,
        address: req.body.address,
      },
    })
    res.json(vendor)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vendor' })
  }
})

// Price history endpoints
app.post('/api/prices', async (req, res) => {
  try {
    const price = await prisma.vendorPrice.create({
      data: {
        materialId: req.body.materialId,
        vendorId: req.body.vendorId,
        price: req.body.price,
        date: new Date(),
      },
      include: {
        vendor: true,
      },
    })
    res.json(price)
  } catch (error) {
    res.status(500).json({ error: 'Failed to add price' })
  }
})

app.get('/api/materials/:id/prices', async (req, res) => {
  try {
    const prices = await prisma.vendorPrice.findMany({
      where: {
        materialId: req.params.id,
      },
      include: {
        vendor: true,
      },
      orderBy: {
        date: 'desc',
      },
    })
    res.json(prices)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prices' })
  }
})

app.delete('/api/vendors/:id', async (req, res) => {
  try {
    await prisma.vendorPrice.deleteMany({
      where: { vendorId: req.params.id },
    })
    await prisma.vendor.delete({
      where: { id: req.params.id },
    })
    res.json({ message: 'Vendor deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vendor' })
  }
})

app.put('/api/vendors/:id', async (req, res) => {
  try {
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        contactInfo: req.body.contactInfo,
        address: req.body.address,
      },
    })
    res.json(vendor)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vendor' })
  }
})

// Get latest sync status
app.get('/api/sync/status', async (req, res) => {
  const { projectId } = req.query
  const where = projectId ? { projectId } : {}

  try {
    const latestSync = await prisma.syncLog.findFirst({
      where,
      orderBy: { startTime: 'desc' },
    })
    res.json(latestSync)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sync status' })
  }
})

// Get sync history
app.get('/api/sync/logs', async (req, res) => {
  const { projectId } = req.query
  const where = projectId ? { projectId } : {}

  try {
    const logs = await prisma.syncLog.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: 50,
    })
    res.json(logs)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sync logs' })
  }
})

app.post('/api/sync/trigger', async (req, res) => {
  try {
    const { projectId } = req.body

    const syncLog = await prisma.syncLog.create({
      data: {
        startTime: new Date(),
        status: 'IN_PROGRESS',
        rowsRead: 0,
        rowsSuccess: 0,
        rowsError: 0,
        projectId,
      },
    })

    syncService
      .syncTimesheet(syncLog.id, projectId)
      .catch((error) => console.error('Sync failed:', error))

    res.json({ message: 'Sync started', syncId: syncLog.id })
  } catch (error) {
    res.status(500).json({ error: 'Failed to start sync' })
  }
})

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await prisma.settings.findFirst()
    if (!settings) {
      // Create default settings if none exist
      return res.json(
        await prisma.settings.create({
          data: {
            companyName: 'Company Name',
            businessHours: {
              monday: { open: '09:00', close: '17:00' },
              tuesday: { open: '09:00', close: '17:00' },
              wednesday: { open: '09:00', close: '17:00' },
              thursday: { open: '09:00', close: '17:00' },
              friday: { open: '09:00', close: '17:00' },
              saturday: null,
              sunday: null,
            },
            defaultCurrency: 'USD',
            fiscalYearStart: new Date(new Date().getFullYear(), 0, 1), // Jan 1
            fiscalYearEnd: new Date(new Date().getFullYear(), 11, 31), // Dec 31
            payrollBurden: 0.2,
          },
        }),
      )
    }

    res.json({
      ...settings,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// Update settings
app.put('/api/settings', async (req, res) => {
  try {
    const data = {
      companyName: req.body.companyName,
      businessHours: req.body.businessHours,
      defaultCurrency: req.body.defaultCurrency,
      fiscalYearStart: new Date(req.body.fiscalYearStart),
      fiscalYearEnd: new Date(req.body.fiscalYearEnd),
      defaultContractType: req.body.defaultContractType,
      defaultProjectStatus: req.body.defaultProjectStatus,
      payrollBurden: req.body.payrollBurden,
    }

    // Normalize dates
    data.fiscalYearStart.setUTCHours(12, 0, 0, 0)
    data.fiscalYearEnd.setUTCHours(12, 0, 0, 0)

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: data,
      create: {
        ...data,
        id: 1,
      },
    })

    res.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    res.status(500).json({ error: error.message })
  }
})

// Add to server.cjs

// Get all sheet connections
app.get('/api/settings/sheets', async (req, res) => {
  try {
    const connections = await prisma.sheetConnection.findMany({
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    })
    res.json(connections)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sheet connections' })
  }
})

// Create new sheet connection
app.post('/api/settings/sheets', async (req, res) => {
  try {
    const connection = await prisma.sheetConnection.create({
      data: {
        projectId: req.body.projectId,
        sheetId: req.body.sheetId,
        range: req.body.range,
      },
    })
    res.json(connection)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create sheet connection' })
  }
})

// Update sheet connection
app.put('/api/settings/sheets/:id', async (req, res) => {
  try {
    const connection = await prisma.sheetConnection.update({
      where: { id: req.params.id },
      data: {
        projectId: req.body.projectId,
        sheetId: req.body.sheetId,
        range: req.body.range,
      },
    })
    res.json(connection)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update sheet connection' })
  }
})

// Delete sheet connection
app.delete('/api/settings/sheets/:id', async (req, res) => {
  try {
    await prisma.sheetConnection.delete({
      where: { id: req.params.id },
    })
    res.json({ message: 'Connection deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete sheet connection' })
  }
})

// Test sheet connection
// Update server.cjs endpoint
app.get('/api/settings/sheets/:id/test', async (req, res) => {
  try {
    const connection = await prisma.sheetConnection.findUnique({
      where: { id: req.params.id },
    })

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' })
    }

    const success = await sheetsService.testConnection(connection.sheetId, connection.range)
    res.json({ success })
  } catch (error) {
    console.error('Connection test error:', error)
    res.status(500).json({ error: 'Connection test failed', details: error.message })
  }
})
