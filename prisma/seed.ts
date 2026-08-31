// prisma/seed.ts
// Creates the initial admin user.
// Run with: npm run prisma-seed
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: 'admin@tienda.local' },
  })

  if (!existing) {
    const hash = await bcrypt.hash('Admin123!', 12)
    await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@tienda.local',
        password: hash,
        role: 'ADMIN',
      },
    })
    console.log('✓ Admin user created: admin@tienda.local / Admin123!')
    console.log('  ⚠  Change the password immediately after first login.')
  } else {
    console.log('✓ Admin user already exists, skipping.')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
