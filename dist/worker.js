import { connectDB, disconnectDB } from './db/connect.js';
import { connectSQL, disconnectSQL } from './db/prisma.js';
import { runtimeConfig } from './config/runtimeConfig.js';
import { env } from './config/bootstrap.js';
import { logger } from './services/logger.js';
async function bootstrapWorker() {
    try {
        // 1. Connect SQL Database (Prisma)
        console.log('🔌 Connecting worker to SQL Database (Prisma / AWS)...');
        await connectSQL();
        // 2. Connect MongoDB (if configured)
        if (env.MONGODB_URI) {
            try {
                await connectDB();
            }
            catch (mongoErr) {
                console.warn('⚠️  [MongoDB Worker Notice]: MongoDB offline or skipped. Continuing with SQL database.');
            }
        }
        // 3. Initialize Runtime Configuration
        try {
            await runtimeConfig.init();
        }
        catch (err) {
            console.warn('⚠️  [Worker Config Init Notice]:', err?.message || err);
        }
        logger.info('worker', 'Job worker started and waiting for tasks...');
        const shutdown = async (signal) => {
            logger.info('worker', `Worker received ${signal}. Stopping worker...`);
            await disconnectSQL();
            await disconnectDB();
            process.exit(0);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        console.error('❌ Failed to start worker:', error);
        process.exit(1);
    }
}
bootstrapWorker();
//# sourceMappingURL=worker.js.map