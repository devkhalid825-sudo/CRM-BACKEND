import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function connectSQL(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL / Prisma Database connected successfully');
  } catch (error) {
    console.warn('⚠️ Prisma connection warning (Check DATABASE_URL):', (error as Error).message);
  }
}

export async function disconnectSQL(): Promise<void> {
  await prisma.$disconnect();
}
