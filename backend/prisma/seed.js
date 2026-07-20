import { PrismaClient } from '@prisma/client'; import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() { const password = await bcrypt.hash('change-me-in-production', 12); await prisma.user.upsert({ where: { email: 'demo@cvconnect.dev' }, update: {}, create: { email: 'demo@cvconnect.dev', name: 'Demo User', password } }); }
main().finally(() => prisma.$disconnect());
