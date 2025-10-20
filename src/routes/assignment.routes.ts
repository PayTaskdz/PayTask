import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { assignmentService } from '../services/assignment.service';
import { AcceptTaskSchema, ListAssignmentsQuerySchema } from '../types/assignment.types';

export async function assignmentRoutes(fastify: FastifyInstance) {
  // Accept Task
  fastify.post(
    '/accept',
    {
      schema: {
        description: 'Worker accepts an available task',
        tags: ['Assignments'],
        body: {
          type: 'object',
          required: ['taskId'],
          properties: {
            taskId: {
              type: 'string',
              format: 'uuid',
              description: 'Task ID to accept',
            },
            workerId: {
              type: 'string',
              format: 'uuid',
              description: 'Worker ID (optional, for testing without auth)',
            },
          },
        },
        response: {
          201: {
            description: 'Task accepted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  taskId: { type: 'string' },
                  workerId: { type: 'string' },
                  status: { type: 'string' },
                  startedAt: { type: 'string' },
                  dueAt: { type: 'string' },
                  createdAt: { type: 'string' },
                  task: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      reward: { type: 'string' },
                      deadline: { type: ['string', 'null'] },
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
          409: {
            description: 'Conflict',
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
    async (request: FastifyRequest<{ Body: { taskId: string; workerId?: string } }>, reply: FastifyReply) => {
      try {
        // Validate request body
        const validatedData = AcceptTaskSchema.parse(request.body);

        // Use provided workerId or default worker from seed
        const workerId = validatedData.workerId || '550e8400-e29b-41d4-a716-446655440004';

        fastify.log.info(`Worker ${workerId} accepting task ${validatedData.taskId}`);

        // Accept task
        const assignment = await assignmentService.acceptTask(validatedData.taskId, workerId);

        return reply.code(201).send({
          success: true,
          message: 'Task accepted successfully',
          data: assignment,
        });
      } catch (error: any) {
        fastify.log.error('Error accepting task:', error);

        // Handle custom errors
        if (error.message === 'CONCURRENCY_CAP') {
          return reply.code(400).send({
            success: false,
            error: {
              message: 'Maximum concurrent assignments (3) reached',
              code: 'CONCURRENCY_CAP',
            },
          });
        }

        if (error.message === 'ALREADY_ACCEPTED') {
          return reply.code(400).send({
            success: false,
            error: {
              message: 'You have already accepted this task',
              code: 'ALREADY_ACCEPTED',
            },
          });
        }

        if (error.message === 'NOT_FOUND') {
          return reply.code(404).send({
            success: false,
            error: {
              message: 'Task not found',
              code: 'NOT_FOUND',
            },
          });
        }

        if (error.message === 'TASK_NOT_OPEN') {
          return reply.code(400).send({
            success: false,
            error: {
              message: 'Task is not open for acceptance',
              code: 'TASK_NOT_OPEN',
            },
          });
        }

        if (error.message === 'ESCROW_NOT_HELD') {
          return reply.code(400).send({
            success: false,
            error: {
              message: 'Task is not funded (escrow not held)',
              code: 'ESCROW_NOT_HELD',
            },
          });
        }

        if (error.message === 'FULLY_ASSIGNED') {
          return reply.code(409).send({
            success: false,
            error: {
              message: 'Task is already fully assigned',
              code: 'FULLY_ASSIGNED',
            },
          });
        }

        if (error.message === 'DOUBLE_ACCEPTANCE') {
          return reply.code(409).send({
            success: false,
            error: {
              message: 'Task already assigned to another worker (race condition detected)',
              code: 'DOUBLE_ACCEPTANCE',
              details: {
                hint: 'Another worker accepted this task at the same time. Please try another task.',
                timestamp: new Date().toISOString(),
              },
            },
          });
        }

        // Validation error
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            success: false,
            error: {
              message: 'Invalid request data',
              code: 'VALIDATION_ERROR',
              details: error.errors,
            },
          });
        }

        // Generic error
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

  // List Worker's Assignments (with pagination and filter)
  fastify.get(
    '/list',
    {
      schema: {
        description: 'Get worker\'s assignments with pagination and filter',
        tags: ['Assignments'],
        querystring: {
          type: 'object',
          properties: {
            workerId: {
              type: 'string',
              format: 'uuid',
              description: 'Worker ID (optional, for testing without auth)',
            },
            status: {
              type: 'string',
              enum: ['in_progress', 'late', 'completed', 'expired'],
              description: 'Filter by assignment status',
            },
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
              description: 'Page number',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 10,
              description: 'Items per page',
            },
          },
        },
        response: {
          200: {
            description: 'Assignments retrieved successfully',
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
                        taskId: { type: 'string' },
                        workerId: { type: 'string' },
                        status: { type: 'string' },
                        startedAt: { type: ['string', 'null'] },
                        dueAt: { type: ['string', 'null'] },
                        createdAt: { type: 'string' },
                        task: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            category: { type: ['string', 'null'] },
                            reward: { type: 'string' },
                            deadline: { type: ['string', 'null'] },
                          },
                        },
                        submission: {
                          type: ['object', 'null'],
                          properties: {
                            id: { type: 'string' },
                            status: { type: 'string' },
                            submittedAt: { type: 'string' },
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
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { workerId?: string; status?: string; page?: number; limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      try {
        // Validate query params
        const query = ListAssignmentsQuerySchema.parse(request.query);

        // Use provided workerId or default worker from seed
        const workerId = query.workerId || '550e8400-e29b-41d4-a716-446655440004';

        const result = await assignmentService.listWorkerAssignments(
          workerId,
          query.status,
          query.page,
          query.limit
        );

        return reply.code(200).send({
          success: true,
          data: result,
        });
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

        fastify.log.error('Error listing assignments:', error);
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

  // Get Worker's Assignments (Simple version)
  fastify.get(
    '/my-assignments',
    {
      schema: {
        description: 'Get all assignments for a worker',
        tags: ['Assignments'],
        querystring: {
          type: 'object',
          properties: {
            workerId: {
              type: 'string',
              format: 'uuid',
              description: 'Worker ID (optional, for testing without auth)',
            },
          },
        },
        response: {
          200: {
            description: 'Assignments retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: true,
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { workerId?: string } }>, reply: FastifyReply) => {
      try {
        // Use provided workerId or default worker from seed
        const workerId = request.query.workerId || '550e8400-e29b-41d4-a716-446655440004';

        const assignments = await assignmentService.getWorkerAssignments(workerId);

        return reply.code(200).send({
          success: true,
          data: assignments,
        });
      } catch (error: any) {
        fastify.log.error('Error getting assignments:', error);
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

