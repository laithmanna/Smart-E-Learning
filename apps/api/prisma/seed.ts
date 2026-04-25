import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPERADMIN_EMAIL ?? 'laethmanna4@gmail.com';
  const password = process.env.SUPERADMIN_PASSWORD ?? 'Admin@123';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`SuperAdmin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.SUPER_ADMIN,
      emailConfirmed: true,
      admin: {
        create: {
          name: 'Super Admin',
        },
      },
    },
  });

  console.log(`Seeded SuperAdmin: ${user.email} (id=${user.id})`);
  console.log(`Default password: ${password} — change on first login.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
