import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { taskService } from '../services/task.service';
import { userService } from '../services/user.service';
import { solanaService } from '../services/solanaService';
import { config } from '../config/env';
import { TaskDiscoveryQuerySchema, TaskDiscoveryResponse } from '../types/task.types';

interface CreateTaskBody {
  title: string;
  description?: string;
  category?: string;
  reward: number;
  qty: number;
  deadline?: string;
}

interface UpdateTaskBody {
  title?: string;
  description?: string;
  category?: string;
  reward?: number;
  qty?: number;
  deadline?: string;
}

export async function taskRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/tasks
   * Create a new task (draft)
   */
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Create a new task (draft status)',
        tags: ['Tasks'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['title', 'reward', 'qty'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            category: { type: 'string', maxLength: 100 },
            reward: { type: 'number', minimum: 0.01 },
            qty: { type: 'integer', minimum: 1 },
            deadline: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.userId;

        const body = request.body as CreateTaskBody;
        const task = await taskService.createTask(userId, {
          title: body.title,
          description: body.description,
          category: body.category,
          reward: body.reward,
          qty: body.qty,
          deadline: body.deadline ? new Date(body.deadline) : undefined,
        });

        return reply.code(201).send({
          success: true,
          data: task,
        });
      } catch (error: any) {
        if (error.message === 'NOT_CLIENT') {
          return reply.code(403).send({ error: 'Only clients can create tasks' });
        }
        console.error('Error creating task:', error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * PUT /api/tasks/updateTask/:taskId
   * Update a draft task
   */
  fastify.put(
    '/updateTaskDraft/:taskId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Update a draft task',
        tags: ['Tasks'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            taskId: { type: 'string', format: 'uuid' },
          },
          required: ['taskId'],
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            category: { type: 'string', maxLength: 100 },
            reward: { type: 'number', minimum: 0.01 },
            qty: { type: 'integer', minimum: 1 },
            deadline: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.userId;

        const params = request.params as { taskId: string };
        const body = request.body as UpdateTaskBody;
        const task = await taskService.updateTask(userId, params.taskId, {
          title: body.title,
          description: body.description,
          category: body.category,
          reward: body.reward,
          qty: body.qty,
          deadline: body.deadline ? new Date(body.deadline) : undefined,
        });

        return reply.code(200).send({
          success: true,
          data: task,
        });
      } catch (error: any) {
        if (error.message === 'TASK_NOT_FOUND') {
          return reply.code(404).send({ error: error.message });
        }
        if (error.message === 'NOT_OWNER' || error.message === 'NOT_CLIENT') {
          return reply.code(403).send({ error: error.message });
        }
        if (error.message === 'CANNOT_UPDATE_PUBLISHED') {
          return reply.code(400).send({ error: error.message });
        }
        console.error('Error updating task:', error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * POST /api/tasks/:taskId/publish
   * Publish task with escrow payment
   * This will:
   * 1. Verify client has enough USDC balance
   * 2. Transfer budget (reward + fee) from client wallet to settlement wallet
   * 3. Update task status to 'open'
   */
  fastify.post(
    '/:taskId/publish',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Publish task with escrow payment',
        tags: ['Tasks'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            taskId: { type: 'string', format: 'uuid' },
          },
          required: ['taskId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.userId;

        const params = request.params as { taskId: string };
        const { taskId } = params;

        // 1. Get task details
        const task = await taskService.getTaskById(taskId);
        if (!task) {
          return reply.code(404).send({
            success: false,
            error: 'Task not found',
          });
        }

        // 2. Verify ownership
        if (task.clientId !== userId) {
          return reply.code(403).send({
            success: false,
            error: 'NOT_OWNER',
          });
        }

        // 3. Check task is in draft status
        if (task.status !== 'draft') {
          return reply.code(400).send({
            success: false,
            error: 'Task must be in draft status to publish',
            currentStatus: task.status,
          });
        }

        // 4. Get client wallet information
        const user = await userService.getUserById(task.clientId);
        if (!user) {
          return reply.code(404).send({
            success: false,
            error: 'User not found',
          });
        }

        if (!user.walletAddress) {
          return reply.code(400).send({
            success: false,
            error: 'User wallet address not found',
          });
        }

        // 5. Calculate total amount (budget includes reward + fee)
        const totalAmount = parseFloat(task.budget || '0');
        if (totalAmount <= 0) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid task budget',
          });
        }

        // 6. Check user USDC balance
        console.log(`Checking USDC balance for wallet ${user.walletAddress}`);
        const userBalance = await solanaService.getUsdcBalance(user.walletAddress);
        console.log(`Balance: ${userBalance} USDC, Required: ${totalAmount} USDC`);

        if (userBalance < totalAmount) {
          return reply.code(400).send({
            success: false,
            error: 'Insufficient balance',
            details: {
              userWallet: user.walletAddress,
              currentBalance: userBalance,
              requiredAmount: totalAmount,
              shortage: parseFloat((totalAmount - userBalance).toFixed(2)),
            },
          });
        }

        // 7. Transfer USDC from client wallet to settlement wallet
        console.log(`Transferring ${totalAmount} USDC from client ${user.walletAddress} to settlement wallet ${config.solana.settlementWalletPublicKey}`);
        
        // TODO: Implement actual transfer from client to settlement
        // For now, this is mocked - in production, client needs to sign transaction
        console.log(`[MOCK] Transfer of ${totalAmount} USDC to settlement wallet`);
        const mockTxHash = `mock_tx_${Date.now()}`;

        // 8. Publish task (update status to 'open')
        const publishedTask = await taskService.publishTask(userId, {
          taskId: task.id,
          txHash: mockTxHash,
        });

        // 9. Return success response
        return reply.code(200).send({
          success: true,
          message: 'Task published successfully with escrow payment',
          data: publishedTask,
          escrow: {
            fromWallet: user.walletAddress,
            toWallet: config.solana.settlementWalletPublicKey,
            amount: totalAmount,
            reward: parseFloat(task.reward),
            fee: totalAmount - parseFloat(task.reward) * task.qty,
            txHash: mockTxHash,
            note: 'Funds escrowed in settlement wallet',
          },
        });
      } catch (error: any) {
        if (error.message === 'TASK_NOT_FOUND') {
          return reply.code(404).send({ error: error.message });
        }
        if (error.message === 'NOT_OWNER' || error.message === 'NOT_CLIENT') {
          return reply.code(403).send({ error: error.message });
        }
        if (error.message === 'ALREADY_PUBLISHED') {
          return reply.code(400).send({ error: error.message });
        }
        console.error('Error publishing task:', error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * DELETE /api/tasks/:taskId
   * Delete a draft task
   */
  fastify.delete(
    '/:taskId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Delete a draft task',
        tags: ['Tasks'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            taskId: { type: 'string', format: 'uuid' },
          },
          required: ['taskId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.userId;

        const params = request.params as { taskId: string };
        const result = await taskService.deleteTask(userId, params.taskId);

        return reply.code(200).send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        if (error.message === 'TASK_NOT_FOUND') {
          return reply.code(404).send({ error: error.message });
        }
        if (error.message === 'NOT_OWNER' || error.message === 'NOT_CLIENT') {
          return reply.code(403).send({ error: error.message });
        }
        if (error.message === 'CANNOT_DELETE_PUBLISHED') {
          return reply.code(400).send({ error: error.message });
        }
        console.error('Error deleting task:', error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

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

