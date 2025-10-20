import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { taskService } from '../services/task.service';
import { TaskDiscoveryQuerySchema, TaskDiscoveryResponse } from '../types/task.types';

export async function taskRoutes(fastify: FastifyInstance) {
  // Get All Tasks (No Filters)
  fastify.get(
    '/all',
    {
      schema: {
        description: 'Get all tasks in the system (no filters)',
        tags: ['Tasks'],
        response: {
          200: {
            description: 'All tasks retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    category: { type: ['string', 'null'] },
                    reward: { type: 'string' },
                    qty: { type: 'integer' },
                    deadline: { type: ['string', 'null'] },
                    status: { type: 'string' },
                    createdAt: { type: 'string' },
                    client: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        country: { type: ['string', 'null'] },
                      },
                    },
                    escrow: {
                      type: ['object', 'null'],
                      properties: {
                        amount: { type: 'string' },
                        status: { type: 'string' },
                      },
                    },
                    _count: {
                      type: 'object',
                      properties: {
                        assignments: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal server error',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tasks = await taskService.getAllTasks();

        return reply.code(200).send({
          success: true,
          data: tasks,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  );

  // Task Discovery Endpoint
  fastify.get(
    '/discover',
    {
      schema: {
        description: 'List all available tasks with filtering and pagination',
        tags: ['Tasks'],
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Task category filter' },
            minReward: { type: 'number', description: 'Minimum reward (USD)', minimum: 0 },
            maxReward: { type: 'number', description: 'Maximum reward (USD)', minimum: 0 },
            sortBy: {
              type: 'string',
              enum: ['createdAt', 'reward', 'deadline'],
              default: 'createdAt',
              description: 'Sort field',
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
              description: 'Sort order',
            },
            page: { type: 'integer', default: 1, minimum: 1, description: 'Page number (1-based)' },
            limit: {
              type: 'integer',
              default: 20,
              minimum: 1,
              maximum: 100,
              description: 'Items per page (max 100)',
            },
          },
        },
        response: {
          200: {
            description: 'Successful response',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: ['string', 'null'] },
                        category: { type: ['string', 'null'] },
                        reward: { type: 'string' },
                        qty: { type: 'integer' },
                        deadline: { type: ['string', 'null'] },
                        status: { type: 'string' },
                        createdAt: { type: 'string' },
                        client: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            country: { type: ['string', 'null'] },
                          },
                        },
                        escrow: {
                          type: ['object', 'null'],
                          properties: {
                            amount: { type: 'string' },
                            status: { type: 'string' },
                          },
                        },
                        _count: {
                          type: 'object',
                          properties: {
                            assignments: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
          500: {
            description: 'Internal server error',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Validate query parameters
        const queryParams = TaskDiscoveryQuerySchema.parse(request.query);

        // Get tasks (auth skipped as per requirements)
        const result = await taskService.discoverTasks(queryParams);

        const response: TaskDiscoveryResponse = {
          success: true,
          data: result,
        };

        return reply.code(200).send(response);
      } catch (error: any) {
        // Validation error
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            success: false,
            error: {
              message: 'Invalid query parameters',
              code: 'VALIDATION_ERROR',
              details: error.errors,
            },
          });
        }

        // Internal error
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  );

  // Get task by ID (bonus endpoint)
  fastify.get(
    '/:taskId',
    {
      schema: {
        description: 'Get task details by ID',
        tags: ['Tasks'],
        params: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task UUID' },
          },
          required: ['taskId'],
        },
        response: {
          200: {
            description: 'Task found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
          404: {
            description: 'Task not found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
      try {
        const { taskId } = request.params;
        fastify.log.info(`Fetching task with ID: ${taskId}`);
        
        const task = await taskService.getTaskById(taskId);
        
        fastify.log.info(`Task found: ${task ? 'YES' : 'NO'}`);
        if (task) {
          fastify.log.info(`Task data: ${JSON.stringify(task).substring(0, 200)}...`);
        }

        if (!task) {
          return reply.code(404).send({
            success: false,
            error: {
              message: 'Task not found',
              code: 'NOT_FOUND',
            },
          });
        }

        const response = {
          success: true,
          data: task,
        };

        fastify.log.info(`Sending response with data length: ${JSON.stringify(response).length}`);
        
        return reply.code(200).send(response);
      } catch (error: any) {
        fastify.log.error('Error in getTaskById route:', error);
        return reply.code(500).send({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  );
}

