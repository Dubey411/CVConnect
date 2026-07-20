import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to Prisma using DATABASE_URL…');
  const result = await prisma.$queryRaw`SELECT 1`;
  console.log("Connection successful! Result:", result);
}

main()
  .catch((err) => {
    console.error("Prisma Connection Error Detail:");
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
