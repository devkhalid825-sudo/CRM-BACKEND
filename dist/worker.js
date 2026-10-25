import { connectDB, disconnectDB } from './db/connect.js';
import { runtimeConfig } from './config/runtimeConfig.js';
import { logger } from './services/logger.js';
async function bootstrapWorker() {
    try {
        await connectDB();
        await runtimeConfig.init();
        logger.info('worker', 'Job worker started and waiting for tasks...');
        const shutdown = async (signal) => {
            logger.info('worker', `Worker received ${signal}. Stopping worker...`);
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