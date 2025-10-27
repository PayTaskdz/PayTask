
import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Basic health check
  fastify.get('/', {
    schema: {
      description: 'Basic health check',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            version: { type: 'string' }
          }
        }
      }
    }
  }, async (_request, reply) => {
    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // Readiness check
  fastify.get('/ready', {
    schema: {
      description: 'Readiness check - verifies all dependencies are available',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (_request, reply) => {
    const checks: Record<string, string> = {};

    try {
      // Check database connection
      await fastify.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (error) {
      checks.database = 'error';
      fastify.log.error({ error }, 'Database health check failed');
    }

    const allChecksPass = Object.values(checks).every(status => status === 'ok');

    reply.code(allChecksPass ? 200 : 503).send({
      status: allChecksPass ? 'ready' : 'not ready',
      checks
    });
  });

  // Liveness check
  fastify.get('/live', {
    schema: {
      description: 'Liveness check - verifies the application is running',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (_request, reply) => {
    reply.send({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  });
};

export { healthRoutes };
