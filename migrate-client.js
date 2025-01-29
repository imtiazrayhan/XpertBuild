import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function migrate() {
  try {
    // Create default clients
    const nycha = await prisma.client.create({
      data: {
        name: 'New York City Housing Authority',
        code: 'NYCHA',
        active: true,
      },
    })

    const sca = await prisma.client.create({
      data: {
        name: 'School Construction Authority',
        code: 'SCA',
        active: true,
      },
    })

    // Update existing projects to use NYCHA as default
    await prisma.project.updateMany({
      where: {
        clientId: null,
      },
      data: {
        clientId: nycha.id,
      },
    })

    console.log('Migration completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
