import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authPlugin } from './plugins/auth';
import { databasePlugin } from './plugins/database';
import { swaggerPlugin } from './plugins/swagger';
import { corsPlugin } from './plugins/cors';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users.routes';
import { walletRoutes } from './routes/wallets';
import { healthRoutes } from './routes/health';
import { fystackService } from './services/fystack.service';

// Logger configuration that works in both dev and production
let loggerConfig: any = { level: process.env.LOG_LEVEL || 'info' };

if (process.env.NODE_ENV === 'development') {
  try {
    // Only use pino-pretty if available (dev environment)
    require.resolve('pino-pretty');
    loggerConfig = {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    };
  } catch (e) {
    // pino-pretty not available, use default logger
  }
}

const server = Fastify({
  logger: loggerConfig
});

async function start() {
  try {
    // Initialize FyStack service
    server.log.info('Initializing FyStack service...');
    await fystackService.initialize();
    server.log.info('FyStack service initialized successfully');

    // Register plugins
    await server.register(corsPlugin);
    await server.register(databasePlugin);
    await server.register(authPlugin);
    await server.register(swaggerPlugin);

    // Register routes
    await server.register(authRoutes, { prefix: '/auth' });
    await server.register(userRoutes, { prefix: '/users' });
    await server.register(walletRoutes, { prefix: '/wallets' });
    await server.register(healthRoutes, { prefix: '/health' });

    // Start server
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });

    console.log(`🚀 Server running on http://${host}:${port}`);
    console.log(`📚 Swagger docs: http://${host}:${port}/documentation`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await server.close();
    console.log('Server closed gracefully');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

start();
