import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { statsService } from '../services/stats.service';

export async function statsRoutes(fastify: FastifyInstance) {
  // Get Task Statistics
  fastify.get(
    '/tasks',
    {
      schema: {
        description: 'Get task statistics and overview',
        tags: ['Statistics'],
        response: {
          200: {
            description: 'Statistics retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  tasks: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer' },
                      open: { type: 'integer' },
                      byCategory: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            category: { type: 'string' },
                            count: { type: 'integer' },
                          },
                        },
                      },
                      byStatus: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            status: { type: 'string' },
                            count: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                  assignments: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer' },
                      completed: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await statsService.getTaskStats();
        return reply.code(200).send({
          success: true,
          data: stats,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: {
            message: 'Failed to retrieve statistics',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  );

  // Get All Categories
  fastify.get(
    '/categories',
    {
      schema: {
        description: 'Get all available task categories',
        tags: ['Statistics'],
        response: {
          200: {
            description: 'Categories retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const categories = await statsService.getCategories();
        return reply.code(200).send({
          success: true,
          data: categories,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: {
            message: 'Failed to retrieve categories',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  );

  // Clear Cache
  fastify.post(
    '/cache/clear',
    {
      schema: {
        description: 'Clear statistics cache (development only)',
        tags: ['Statistics'],
        response: {
          200: {
            description: 'Cache cleared successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        await statsService.clearStatsCache();
        return reply.code(200).send({
          success: true,
          message: 'Statistics cache cleared successfully',
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: {
            message: 'Failed to clear cache',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  );
}

