const express = require('express')
const { PrismaClient } = require('@prisma/client')

const app = express()
const prisma = new PrismaClient()
const port = 3000

app.use(express.json())

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
