import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = prisma;
export async function connectSQL() {
    try {
        await prisma.$connect();
        console.log('✅ PostgreSQL / Prisma Database connected successfully');
    }
    catch (error) {
        console.warn('⚠️ Prisma connection warning (Check DATABASE_URL):', error.message);
    }
}
export async function disconnectSQL() {
    await prisma.$disconnect();
}
//# sourceMappingURL=prisma.js.map