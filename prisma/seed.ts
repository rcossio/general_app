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

  await seedBotUsers(user.id)
  console.log('Seed completed successfully')
}

async function seedBotUsers(userRoleId: string) {
  const hash = (pw: string) => bcrypt.hash(pw, 10)

  const bots = [
    {
      email: 'alex.rivera@example.com',
      name: 'Alex Rivera',
      routines: [
        {
          name: 'Push / Pull / Legs',
          description: 'Classic PPL split, 6 days a week',
          days: [
            { name: 'Push A', dayOfWeek: 1, exercises: [{ name: 'Bench Press', sets: 4, reps: 8, order: 0 }, { name: 'Overhead Press', sets: 3, reps: 10, order: 1 }, { name: 'Tricep Dips', sets: 3, reps: 12, order: 2 }] },
            { name: 'Pull A', dayOfWeek: 2, exercises: [{ name: 'Pull-ups', sets: 4, reps: 8, order: 0 }, { name: 'Barbell Row', sets: 4, reps: 8, order: 1 }, { name: 'Face Pulls', sets: 3, reps: 15, order: 2 }] },
            { name: 'Legs A', dayOfWeek: 3, exercises: [{ name: 'Squat', sets: 5, reps: 5, order: 0 }, { name: 'Romanian Deadlift', sets: 3, reps: 10, order: 1 }, { name: 'Leg Press', sets: 3, reps: 12, order: 2 }] },
          ],
        },
        {
          name: 'Morning Mobility',
          description: '20 min daily mobility work',
          days: [
            { name: 'Full Body', dayOfWeek: 0, exercises: [{ name: 'Hip Circles', sets: 2, reps: 10, order: 0 }, { name: 'Shoulder Rolls', sets: 2, reps: 15, order: 1 }, { name: 'Cat-Cow', sets: 3, reps: 10, order: 2 }] },
          ],
        },
      ],
      entries: [
        { type: 'ACHIEVEMENT' as const, title: 'Hit 100kg squat', score: 10, tags: ['lifting', 'milestone'] },
        { type: 'GOAL' as const, title: 'Bench 120kg by summer', score: 8, tags: ['strength'] },
        { type: 'ACHIEVEMENT' as const, title: 'Consistent 6 days this week', score: 9, tags: ['consistency'] },
        { type: 'EMOTION' as const, title: 'Pumped after leg day', score: 9, content: 'Best session in months, everything clicked', tags: ['motivation'] },
      ],
    },
    {
      email: 'maria.santos@example.com',
      name: 'Maria Santos',
      routines: [
        {
          name: 'Beginner Full Body',
          description: 'Starting out — 3 days a week',
          days: [
            { name: 'Day A', dayOfWeek: 1, exercises: [{ name: 'Goblet Squat', sets: 3, reps: 10, order: 0 }, { name: 'Push-up', sets: 3, reps: 8, order: 1 }, { name: 'Assisted Pull-up', sets: 3, reps: 5, order: 2 }] },
            { name: 'Day B', dayOfWeek: 3, exercises: [{ name: 'Dumbbell Press', sets: 3, reps: 10, order: 0 }, { name: 'Lat Pulldown', sets: 3, reps: 10, order: 1 }, { name: 'Plank', sets: 3, reps: 1, order: 2 }] },
          ],
        },
      ],
      entries: [
        { type: 'GOAL' as const, title: 'Do my first unassisted pull-up', score: 6, tags: ['beginners', 'upper body'] },
        { type: 'EMOTION' as const, title: 'Sore but proud after week 1', score: 7, content: 'Legs feel like jelly but I showed up', tags: [] },
        { type: 'DESIRE' as const, title: 'Want to feel strong by my birthday', score: 7, tags: ['motivation'] },
        { type: 'ACHIEVEMENT' as const, title: 'Finished first full month', score: 8, tags: ['consistency', 'beginners'] },
        { type: 'EMOTION' as const, title: 'Skipped two sessions this week', score: 3, content: 'Life got busy. Getting back on track tomorrow', tags: [] },
      ],
    },
    {
      email: 'james.park@example.com',
      name: 'James Park',
      routines: [],
      entries: [
        { type: 'EMOTION' as const, title: 'Anxiety spike before the presentation', score: 3, content: 'Breathed through it. Got to the other side.', tags: ['anxiety', 'work'] },
        { type: 'GOAL' as const, title: 'Meditate 10 min every morning this month', score: 6, tags: ['mindfulness'] },
        { type: 'EMOTION' as const, title: 'Really calm evening with no phone', score: 8, tags: ['rest'] },
        { type: 'DESIRE' as const, title: 'Want to stop doom-scrolling before bed', score: 5, tags: ['habits'] },
        { type: 'ACHIEVEMENT' as const, title: '14-day meditation streak', score: 9, tags: ['mindfulness', 'streak'] },
        { type: 'EMOTION' as const, title: 'Rough week overall', score: 2, content: 'Tracking it anyway so I can look back', tags: ['honesty'] },
        { type: 'GOAL' as const, title: 'Read one book per month', score: 7, tags: ['learning'] },
      ],
    },
    {
      email: 'sofia.chen@example.com',
      name: 'Sofia Chen',
      routines: [
        {
          name: 'Hypertrophy Block',
          description: '4-day upper/lower, 8–12 rep range',
          days: [
            { name: 'Upper Power', dayOfWeek: 1, exercises: [{ name: 'Incline Bench', sets: 4, reps: 6, order: 0 }, { name: 'Weighted Pull-ups', sets: 4, reps: 6, order: 1 }, { name: 'Dumbbell Shoulder Press', sets: 3, reps: 8, order: 2 }] },
            { name: 'Lower Power', dayOfWeek: 2, exercises: [{ name: 'Front Squat', sets: 4, reps: 6, order: 0 }, { name: 'Deadlift', sets: 3, reps: 5, order: 1 }, { name: 'Bulgarian Split Squat', sets: 3, reps: 8, order: 2 }] },
            { name: 'Upper Volume', dayOfWeek: 4, exercises: [{ name: 'Cable Fly', sets: 4, reps: 12, order: 0 }, { name: 'Seated Cable Row', sets: 4, reps: 12, order: 1 }, { name: 'Lateral Raises', sets: 4, reps: 15, order: 2 }] },
            { name: 'Lower Volume', dayOfWeek: 5, exercises: [{ name: 'Leg Press', sets: 4, reps: 12, order: 0 }, { name: 'Leg Curl', sets: 3, reps: 12, order: 1 }, { name: 'Calf Raises', sets: 4, reps: 20, order: 2 }] },
          ],
        },
      ],
      entries: [
        { type: 'ACHIEVEMENT' as const, title: 'PRd on deadlift — 130kg', score: 10, tags: ['PR', 'strength'] },
        { type: 'ACHIEVEMENT' as const, title: 'Stuck to nutrition plan all week', score: 9, tags: ['nutrition'] },
        { type: 'GOAL' as const, title: 'Compete in first powerlifting meet', score: 9, tags: ['competition'] },
        { type: 'ACHIEVEMENT' as const, title: 'Lost 2kg while gaining strength', score: 10, tags: ['body recomp'] },
        { type: 'EMOTION' as const, title: 'Energised and focused every day this week', score: 10, tags: ['momentum'] },
      ],
    },
    {
      email: 'marcus.webb@example.com',
      name: 'Marcus Webb',
      routines: [
        {
          name: 'The Comeback Plan',
          description: 'Getting back to it after a long break',
          days: [
            { name: 'Full Body', dayOfWeek: 3, exercises: [{ name: 'Machine Chest Press', sets: 3, reps: 10, order: 0 }, { name: 'Leg Extension', sets: 3, reps: 12, order: 1 }, { name: 'Cable Row', sets: 3, reps: 12, order: 2 }] },
          ],
        },
      ],
      entries: [
        { type: 'EMOTION' as const, title: 'Embarrassingly weak after 8 months off', score: 2, content: 'Humbling. Starting from scratch.', tags: ['comeback'] },
        { type: 'GOAL' as const, title: 'Just show up 2x per week for a month', score: 5, tags: ['consistency'] },
        { type: 'EMOTION' as const, title: 'Made it 3 weeks in a row', score: 6, tags: ['progress'] },
        { type: 'DESIRE' as const, title: 'Want to get back to where I was', score: 6, content: 'Slowly but surely', tags: [] },
      ],
    },
    {
      email: 'priya.patel@example.com',
      name: 'Priya Patel',
      routines: [
        {
          name: 'Yoga Flow',
          description: 'Morning vinyasa + evening yin',
          days: [
            { name: 'Morning Vinyasa', dayOfWeek: 0, exercises: [{ name: 'Sun Salutation A', sets: 5, reps: 1, order: 0 }, { name: 'Warrior Sequence', sets: 1, reps: 1, order: 1 }, { name: 'Crow Pose hold', sets: 3, reps: 1, order: 2 }] },
            { name: 'Evening Yin', dayOfWeek: 3, exercises: [{ name: 'Dragon Pose', sets: 1, reps: 1, order: 0 }, { name: 'Sleeping Swan', sets: 1, reps: 1, order: 1 }, { name: 'Supine Twist', sets: 1, reps: 1, order: 2 }] },
          ],
        },
      ],
      entries: [
        { type: 'GOAL' as const, title: 'Hold headstand for 60 seconds', score: 7, tags: ['yoga', 'balance'] },
        { type: 'ACHIEVEMENT' as const, title: 'Completed 30-day yoga challenge', score: 9, tags: ['yoga', 'dedication'] },
        { type: 'EMOTION' as const, title: 'Deep peace after yin session', score: 9, tags: ['mindfulness', 'rest'] },
        { type: 'DESIRE' as const, title: 'Teach a beginner yoga class someday', score: 8, tags: ['teaching'] },
        { type: 'ACHIEVEMENT' as const, title: 'First crow pose without wall support', score: 8, tags: ['yoga', 'milestone'] },
      ],
    },
    {
      email: 'tom.larsson@example.com',
      name: 'Tom Larsson',
      routines: [],
      entries: [
        { type: 'EMOTION' as const, title: 'Nothing particular today', score: 5, tags: [] },
        { type: 'DESIRE' as const, title: 'Want to be more productive', score: 5, tags: ['work'] },
        { type: 'EMOTION' as const, title: 'Actually had a really good Monday', score: 7, content: 'Small wins add up', tags: ['work'] },
        { type: 'GOAL' as const, title: 'Finish side project by end of quarter', score: 6, tags: ['coding', 'goals'] },
        { type: 'EMOTION' as const, title: 'Tired and burnt out', score: 2, content: 'Need a proper break', tags: ['burnout'] },
        { type: 'ACHIEVEMENT' as const, title: 'Shipped the side project', score: 8, tags: ['coding', 'milestone'] },
        { type: 'EMOTION' as const, title: 'Proud of myself today', score: 8, tags: [] },
        { type: 'DESIRE' as const, title: 'Learn to cook properly', score: 6, tags: ['life'] },
      ],
    },
    {
      email: 'zara.ahmed@example.com',
      name: 'Zara Ahmed',
      routines: [
        {
          name: 'Running Base',
          description: 'Building up to a 10k',
          days: [
            { name: 'Easy Run', dayOfWeek: 2, exercises: [{ name: '30-min easy jog', sets: 1, reps: 1, order: 0 }, { name: 'Cool down walk', sets: 1, reps: 1, order: 1 }] },
            { name: 'Long Run', dayOfWeek: 6, exercises: [{ name: 'Long slow distance', sets: 1, reps: 1, order: 0 }] },
          ],
        },
      ],
      entries: [
        { type: 'EMOTION' as const, title: 'Couldn\'t run 5 min without stopping', score: 2, content: 'Embarrassing but that\'s the start', tags: ['running', 'beginner'] },
        { type: 'GOAL' as const, title: 'Run a 5k without stopping', score: 6, tags: ['running'] },
        { type: 'ACHIEVEMENT' as const, title: 'First 5k done — 34 minutes', score: 8, tags: ['running', 'milestone'] },
        { type: 'EMOTION' as const, title: 'Runner\'s high is real', score: 9, tags: ['running'] },
        { type: 'GOAL' as const, title: 'Sub-30 5k by end of year', score: 8, tags: ['running', 'goals'] },
        { type: 'ACHIEVEMENT' as const, title: 'Ran 8k this weekend — new longest run', score: 9, tags: ['running', 'progress'] },
      ],
    },
    {
      email: 'lucas.moreau@example.com',
      name: 'Lucas Moreau',
      routines: [
        {
          name: 'Stronglifts 5x5',
          description: 'Simple and effective strength programme',
          days: [
            { name: 'Workout A', dayOfWeek: 1, exercises: [{ name: 'Squat', sets: 5, reps: 5, order: 0 }, { name: 'Bench Press', sets: 5, reps: 5, order: 1 }, { name: 'Barbell Row', sets: 5, reps: 5, order: 2 }] },
            { name: 'Workout B', dayOfWeek: 3, exercises: [{ name: 'Squat', sets: 5, reps: 5, order: 0 }, { name: 'Overhead Press', sets: 5, reps: 5, order: 1 }, { name: 'Deadlift', sets: 1, reps: 5, order: 2 }] },
          ],
        },
        {
          name: 'Weekend Conditioning',
          description: 'Saturday cardio and core',
          days: [
            { name: 'Conditioning', dayOfWeek: 6, exercises: [{ name: 'Farmers Carry', sets: 4, reps: 1, order: 0 }, { name: 'Battle Ropes', sets: 5, reps: 1, order: 1 }, { name: 'Ab Wheel', sets: 3, reps: 10, order: 2 }] },
          ],
        },
      ],
      entries: [],
    },
    {
      email: 'nina.okafor@example.com',
      name: 'Nina Okafor',
      routines: [
        {
          name: '3-Day Dumbbell Programme',
          description: 'Home workouts, no excuses',
          days: [
            { name: 'Push', dayOfWeek: 1, exercises: [{ name: 'Dumbbell Press', sets: 4, reps: 10, order: 0 }, { name: 'Lateral Raise', sets: 3, reps: 12, order: 1 }, { name: 'Overhead Tricep Ext', sets: 3, reps: 12, order: 2 }] },
            { name: 'Pull', dayOfWeek: 3, exercises: [{ name: 'Dumbbell Row', sets: 4, reps: 10, order: 0 }, { name: 'Hammer Curl', sets: 3, reps: 12, order: 1 }, { name: 'Rear Delt Fly', sets: 3, reps: 15, order: 2 }] },
            { name: 'Legs', dayOfWeek: 5, exercises: [{ name: 'Dumbbell Squat', sets: 4, reps: 12, order: 0 }, { name: 'Romanian Deadlift', sets: 3, reps: 10, order: 1 }, { name: 'Step-ups', sets: 3, reps: 12, order: 2 }] },
          ],
        },
      ],
      entries: [
        { type: 'GOAL' as const, title: 'Stay consistent through the holidays', score: 6, tags: ['consistency'] },
        { type: 'ACHIEVEMENT' as const, title: 'Did all 3 sessions this week', score: 7, tags: ['consistency'] },
        { type: 'EMOTION' as const, title: 'Proud — not perfect but showing up', score: 7, content: 'Missed one session but made up for it', tags: [] },
        { type: 'DESIRE' as const, title: 'Upgrade to a proper home gym setup', score: 7, tags: ['gear'] },
        { type: 'ACHIEVEMENT' as const, title: 'Two months of no missed weeks', score: 8, tags: ['consistency', 'milestone'] },
        { type: 'EMOTION' as const, title: 'Balance feels good right now', score: 8, tags: ['balance', 'life'] },
      ],
    },
  ]

  const userRole = await prisma.role.findUniqueOrThrow({ where: { id: userRoleId } })

  for (const bot of bots) {
    const existingUser = await prisma.user.findUnique({ where: { email: bot.email } })
    if (existingUser) continue  // skip if already seeded

    const botUser = await prisma.user.create({
      data: {
        email: bot.email,
        passwordHash: await hash('BotUser!2024'),
        name: bot.name,
      },
    })

    await prisma.userRole.create({ data: { userId: botUser.id, roleId: userRole.id } })

    for (const r of bot.routines) {
      const routine = await prisma.workoutRoutine.create({
        data: { userId: botUser.id, name: r.name, description: r.description, isPublic: true },
      })
      for (const d of r.days) {
        const day = await prisma.workoutDay.create({
          data: { routineId: routine.id, dayOfWeek: d.dayOfWeek, name: d.name },
        })
        for (const ex of d.exercises) {
          await prisma.workoutExercise.create({ data: { dayId: day.id, ...ex } })
        }
      }
    }

    for (const e of bot.entries) {
      await prisma.trackerEntry.create({
        data: {
          userId: botUser.id,
          type: e.type,
          title: e.title,
          content: 'content' in e ? e.content : undefined,
          score: e.score,
          tags: e.tags,
          isPublic: true,
        },
      })
    }
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
