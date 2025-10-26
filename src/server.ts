import { buildApp } from './app';
import { config } from './config/env';
import prisma from './config/prisma';
import redis from './config/redis';
import { fystackService } from './services/fystack.service';

async function start() {
  try {
    console.log('🚀 Starting PayTask Worker API...');
    console.log(`📦 Environment: ${config.nodeEnv}`);
    console.log(`🔧 Port: ${config.port}`);

    // Build the Fastify app
    const fastify = await buildApp();

    // Test database connection
    console.log('🔌 Connecting to PostgreSQL...');
    await prisma.$connect();
    console.log('✅ PostgreSQL connected');

    // Test Redis connection
    console.log('🔌 Connecting to Redis...');
    await redis.ping();
    console.log('✅ Redis connected');

    // Test FyStack connection
    console.log('🔌 Connecting to FyStack...');
    const fystackStatus = await fystackService.checkConnection();
    if (fystackStatus.connected) {
      console.log('✅ FyStack connected');
    } else {
      console.log(`⚠️  FyStack: ${fystackStatus.message}`);
    }

    // Start the server
    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`\n✅ Server running on http://localhost:${config.port}`);
    console.log(`📚 API Documentation: http://localhost:${config.port}/api-docs`);
    console.log(`💚 Health Check: http://localhost:${config.port}/health`);
    console.log(`🔍 Task Discovery: http://localhost:${config.port}/api/tasks/discover`);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\n⚠️  Received ${signal}, shutting down gracefully...`);

        try {
          await fastify.close();
          await prisma.$disconnect();
          await redis.quit();
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (err) {
          console.error('❌ Error during shutdown:', err);
          process.exit(1);
        }
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

start();

