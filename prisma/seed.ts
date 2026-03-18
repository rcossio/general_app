import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { activeModules } from '../config/modules'

const prisma = new PrismaClient()

async function main() {
  // Seed roles
  const roles = [
    { name: 'Master Admin', slug: 'master_admin', description: 'Full platform access' },
    { name: 'Admin', slug: 'admin', description: 'Administrative access' },
    { name: 'Moderator', slug: 'moderator', description: 'Moderation access' },
    { name: 'User', slug: 'user', description: 'Standard user access' },
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: {},
      create: role,
    })
  }

  // Seed permissions from active modules
  const permissionStrings: string[] = []
  for (const mod of activeModules) {
    if (mod.isActive) {
      permissionStrings.push(...mod.permissions)
    }
  }

  for (const perm of permissionStrings) {
    const [resource, action] = perm.split(':')
    await prisma.permission.upsert({
      where: { resource_action: { resource, action } },
      update: {},
      create: { resource, action },
    })
  }

  // Assign all permissions to master_admin and admin
  const masterAdmin = await prisma.role.findUniqueOrThrow({ where: { slug: 'master_admin' } })
  const admin = await prisma.role.findUniqueOrThrow({ where: { slug: 'admin' } })
  const user = await prisma.role.findUniqueOrThrow({ where: { slug: 'user' } })
  const allPermissions = await prisma.permission.findMany()

  // Actions restricted to admins only
  const adminOnlyActions = ['manage', 'delete_any']

  for (const permission of allPermissions) {
    for (const role of [masterAdmin, admin]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      })
    }
    if (!adminOnlyActions.includes(permission.action)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: user.id, permissionId: permission.id } },
        update: {},
        create: { roleId: user.id, permissionId: permission.id },
      })
    }
  }

  // Seed default master_admin user
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env before seeding')
  }
  const passwordHash = await bcrypt.hash(adminPassword, 12)
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Master Admin',
    },
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: masterAdmin.id } },
    update: {},
    create: { userId: adminUser.id, roleId: masterAdmin.id },
  })

  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
