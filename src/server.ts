import http from 'http';
import { app } from './app.js';
import { env } from './config/bootstrap.js';
import { connectDB, disconnectDB } from './db/connect.js';
import { connectSQL, disconnectSQL } from './db/prisma.js';
import { runtimeConfig } from './config/runtimeConfig.js';
import { setupSockets } from './sockets/index.js';
import { logger } from './services/logger.js';
import { providersService } from './modules/providers/service.js';

async function bootstrap() {
  try {
    // 1. Connect AWS SQL / Prisma Database
    console.log('🔌 Connecting to SQL Database (Prisma / AWS)...');
    await connectSQL();

    // 2. Connect MongoDB (if configured, without crashing if omitted)
    if (env.MONGODB_URI) {
      try {
        await connectDB();
        await runtimeConfig.init();
        await providersService.ensureDefaults();
      } catch (mongoErr) {
        console.warn('⚠️  [MongoDB Notice]: MongoDB offline or skipped. Continuing with SQL database.');
      }
    } else {
      console.log('ℹ️  Operating in SQL mode (MONGODB_URI not provided).');
    }

    // 3. Create HTTP server & Socket.IO
    const httpServer = http.createServer(app);
    const io = setupSockets(httpServer);

    // 4. Start listening
    httpServer.listen(env.PORT, () => {
      logger.info('server', `Global Lead CRM API server running on port ${env.PORT}`, {
        port: env.PORT,
        origin: env.CLIENT_ORIGIN,
        nodeEnv: env.NODE_ENV,
      });
      console.log(`🚀 Global Lead CRM API listening on http://localhost:${env.PORT}`);
    });

    const shutdown = async (signal: string) => {
      logger.info('server', `Received ${signal}. Shutting down gracefully...`);
      io.close();
      httpServer.close(async () => {
        await disconnectSQL();
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
