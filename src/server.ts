import http from 'http';
import { app } from './app.js';
import { env } from './config/bootstrap.js';
import { connectDB, disconnectDB } from './db/connect.js';
import { runtimeConfig } from './config/runtimeConfig.js';
import { setupSockets } from './sockets/index.js';
import { logger } from './services/logger.js';
import { providersService } from './modules/providers/service.js';

async function bootstrap() {
  try {
    // 1. Connect database
    await connectDB();

    // 2. Load runtime config cache from MongoDB
    await runtimeConfig.init();

    // 3. Ensure default providers exist
    await providersService.ensureDefaults();

    // 4. Create HTTP server & Socket.IO
    const httpServer = http.createServer(app);
    const io = setupSockets(httpServer);

    // 5. Start listening
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
