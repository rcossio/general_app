import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { activeModules } from '../config/modules'

const prisma = new PrismaClient()

async function main() {
  // Seed roles
  const roles = [
    { name: 'Master Admin', slug: 'master_admin', description: 'Full platform access' },
    { name: 'Admin', slug: 'admin', description: 'Administrative access' },
    { name: 'User', slug: 'user', description: 'Standard user access' },
    { name: 'Bot User', slug: 'bot_user', description: 'Seeded bot accounts for community content' },
    { name: 'Users Admin', slug: 'users_admin', description: 'Receives new-user notification emails' },
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

  // Assign permissions to roles
  const masterAdmin = await prisma.role.findUniqueOrThrow({ where: { slug: 'master_admin' } })
  const admin = await prisma.role.findUniqueOrThrow({ where: { slug: 'admin' } })
  const user = await prisma.role.findUniqueOrThrow({ where: { slug: 'user' } })
  const botUser = await prisma.role.findUniqueOrThrow({ where: { slug: 'bot_user' } })
  const usersAdmin = await prisma.role.findUniqueOrThrow({ where: { slug: 'users_admin' } })
  const allPermissions = await prisma.permission.findMany()

  // master_admin and admin get all permissions
  for (const permission of allPermissions) {
    for (const role of [masterAdmin, admin]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      })
    }
  }

  // Explicit allowlist for user and bot_user — new permissions default to admin-only
  const userAllowlist = [
    'adventure:play',
    'community:create',
  ]

  // Clear old user/bot_user role_permissions and re-assign from allowlist
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: [user.id, botUser.id] } },
  })

  for (const permStr of userAllowlist) {
    const [resource, action] = permStr.split(':')
    const perm = allPermissions.find((p) => p.resource === resource && p.action === action)
    if (!perm) continue
    for (const r of [user, botUser]) {
      await prisma.rolePermission.create({
        data: { roleId: r.id, permissionId: perm.id },
      })
    }
  }

  // Seed default master_admin user
  // If the user already exists (e.g. created via Google OAuth), update their password
  // so they can also log in with email/password. Always ensure master_admin role.
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env before seeding')
  }
  const passwordHash = await bcrypt.hash(adminPassword, 12)
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Master Admin',
    },
  })

  // Remove any existing roles and assign master_admin + users_admin (so the
  // operator receives new-user notification emails).
  await prisma.userRole.deleteMany({ where: { userId: adminUser.id } })
  await prisma.userRole.createMany({
    data: [
      { userId: adminUser.id, roleId: masterAdmin.id },
      { userId: adminUser.id, roleId: usersAdmin.id },
    ],
  })

  await seedBotUsers(botUser.id)
  console.log('Seed completed successfully')
}

// Bots are seeded as plain users with the bot_user role. They used to carry
// Life Tracker / Workout demo content, but those modules (and their tables) were
// dropped, so only the account itself remains.
async function seedBotUsers(userRoleId: string) {
  const bots = [
    { email: 'alex.rivera@example.com', name: 'Alex Rivera' },
    { email: 'maria.santos@example.com', name: 'Maria Santos' },
    { email: 'james.park@example.com', name: 'James Park' },
    { email: 'sofia.chen@example.com', name: 'Sofia Chen' },
    { email: 'marcus.webb@example.com', name: 'Marcus Webb' },
    { email: 'priya.patel@example.com', name: 'Priya Patel' },
    { email: 'tom.larsson@example.com', name: 'Tom Larsson' },
    { email: 'zara.ahmed@example.com', name: 'Zara Ahmed' },
    { email: 'lucas.moreau@example.com', name: 'Lucas Moreau' },
    { email: 'nina.okafor@example.com', name: 'Nina Okafor' },
  ]

  const userRole = await prisma.role.findUniqueOrThrow({ where: { id: userRoleId } })

  for (const bot of bots) {
    const existingUser = await prisma.user.findUnique({ where: { email: bot.email } })
    if (existingUser) {
      // Ensure existing bots have the bot_user role
      await prisma.userRole.deleteMany({ where: { userId: existingUser.id } })
      await prisma.userRole.create({ data: { userId: existingUser.id, roleId: userRole.id } })
      continue
    }

    const botAccount = await prisma.user.create({
      data: {
        email: bot.email,
        passwordHash: await bcrypt.hash('BotUser!2024', 10),
        name: bot.name,
      },
    })

    await prisma.userRole.create({ data: { userId: botAccount.id, roleId: userRole.id } })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
