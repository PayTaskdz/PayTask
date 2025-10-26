import Fastify from 'fastify';
import { config } from './config';
import { registerRoutes } from './routes/health';
import { db } from './db/db';
import { CREATE_TASKS_TABLE } from './db/tables/task';
import { CREATE_USERS_TABLE } from './db/tables/user';

const fastify = Fastify({
  logger: true,
});

// Initialize database
async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Create database if it doesn't exist
    await db.createDatabase();
    
    // Create tables
    await db.query(CREATE_USERS_TABLE);
    await db.query(CREATE_TASKS_TABLE);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Register all routes
registerRoutes(fastify);

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down gracefully...');
  try {
    await fastify.close();
    await db.close();
    console.log('Server closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
const start = async () => {
  try {
    // Initialize database first
    await initDatabase();
    
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });
    
    console.log(`Server is running on http://${config.server.host}:${config.server.port}`);
    console.log(`Health check: http://${config.server.host}:${config.server.port}/health`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
