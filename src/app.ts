import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import { config } from './config/env';
import { taskRoutes } from './routes/task.routes';
import { statsRoutes } from './routes/stats.routes';
import { assignmentRoutes } from './routes/assignment.routes';
import { submissionRoutes } from './routes/submission.routes';
import { errorlogRoutes } from './routes/errorlog.routes';
import { ratingRoutes } from './routes/rating.routes';
import { reviewRoutes } from './routes/review.routes';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/users.routes';
import { walletRoutes } from './routes/wallet.routes';
import prisma from './config/prisma';
import authPlugin from './plugins/auth';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn',
      transport:
        config.nodeEnv === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Decorate fastify with prisma
  fastify.decorate('prisma', prisma);

  // Register auth plugin (must be before routes that use authentication)
  await fastify.register(authPlugin);

  // Register plugins
  await fastify.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false, // For Swagger UI
  });

  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100,
      fields: 10,
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
      headerPairs: 2000,
    },
  });

  // Register Swagger
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'PayTask Worker API',
        description: 'API for task discovery, acceptance, and submission for workers',
        version: '1.0.0',
        contact: {
          name: 'PayTask Team',
          email: 'support@paytask.com',
        },
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server',
        },
      ],
      tags: [
        {
          name: 'Tasks',
          description: 'Task discovery and management endpoints',
        },
        {
          name: 'Assignments',
          description: 'Worker task acceptance and assignment management',
        },
        {
          name: 'Submissions',
          description: 'Work submission and QA endpoints',
        },
        {
          name: 'Statistics',
          description: 'Statistics and analytics endpoints',
        },
        {
          name: 'Ratings',
          description: 'User rating and feedback endpoints',
        },
        {
          name: 'Reviews',
          description: 'Submission review and approval endpoints',
        },
        {
          name: 'Authentication',
          description: 'User authentication and authorization endpoints',
        },
        {
          name: 'Users',
          description: 'User profile and management endpoints',
        },
        {
          name: 'Wallet',
          description: 'Wallet and transaction management endpoints',
        },
        {
          name: 'Error Logs',
          description: 'Error logging and monitoring endpoints',
        },
        {
          name: 'Health',
          description: 'Health check and system status endpoints',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: '/api-docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecificationClone: true,
  });



  // Health check
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['Health'],
        response: {
          200: {
            description: 'Service is healthy',
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
              environment: { type: 'string' },
              services: {
                type: 'object',
                properties: {
                  database: { type: 'string' },
                  redis: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        // Check database
        const prisma = (await import('./config/prisma')).default;
        await prisma.$queryRaw`SELECT 1`;
        const dbStatus = 'connected';

        // Check Redis
        const redis = (await import('./config/redis')).default;
        await redis.ping();
        const redisStatus = 'connected';

        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.nodeEnv,
          services: {
            database: dbStatus,
            redis: redisStatus,
          },
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(503).send({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.nodeEnv,
          error: 'Service unavailable',
        });
      }
    }
  );

  // Register routes
  await fastify.register(
    async (instance) => {
      await instance.register(authRoutes);
    },
    { prefix: '/api/auth' }
  );

  await fastify.register(
    async (instance) => {
      await instance.register(userRoutes);
    },
    { prefix: '/api/users' }
  );

  await fastify.register(
    async (instance) => {
      await instance.register(walletRoutes);
    },
    { prefix: '/api/wallet' }
  );

  await fastify.register(
    async (instance) => {
      await instance.register(taskRoutes);
    },
    { prefix: '/api/tasks' }
  );

  await fastify.register(
    async (instance) => {
      await instance.register(statsRoutes);
    },
    { prefix: '/api/stats' }
  );

  await fastify.register(
    async (instance) => {
      await instance.register(assignmentRoutes);
    },
    { prefix: '/api/tasks/assignments' }
  );

  await fastify.register(
    async (instance) => {
      await instance.register(submissionRoutes);
    },
    { prefix: '/api/submissions' }
  );

  await fastify.register(
    async (instance) => {
      await instance.register(errorlogRoutes);
    },
    { prefix: '/api/errorlogs' }
  );

  await fastify.register(
    async (instance) => {
      await instance.register(ratingRoutes);
    },
    { prefix: '/api/ratings' }
  );

  await fastify.register(
    async (instance) => {
      await instance.register(reviewRoutes);
    },
    { prefix: '/api/reviews' }
  );

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      error: {
        message: `Route ${request.method} ${request.url} not found`,
        code: 'NOT_FOUND',
      },
    });
  });

  // Global error handler
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    // Validation error
    if (error.validation) {
      return reply.code(400).send({
        success: false,
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.validation,
        },
      });
    }

    // Default error
    return reply.code(error.statusCode || 500).send({
      success: false,
      error: {
        message: error.message || 'Internal server error',
        code: error.code || 'INTERNAL_ERROR',
      },
    });
  });

  return fastify;
}
