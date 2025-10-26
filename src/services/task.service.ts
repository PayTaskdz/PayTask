import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import redis from '../config/redis';
import { config } from '../config/env';
import { TaskDiscoveryQuery, TaskDiscoveryItem, PaginationMeta } from '../types/task.types';
import { UserRoleValidator } from './user-role.validator';

// System fee rate - FIXED at 5%
const SYSTEM_FEE_RATE = 0.05; // 5%

interface CreateTaskRequest {
  title: string;
  description?: string;
  category?: string;
  reward: number;
  qty: number;
  deadline?: Date;
  idempotencyKey?: string;
}

interface UpdateTaskRequest {
  title?: string;
  description?: string;
  category?: string;
  reward?: number;
  qty?: number;
  deadline?: Date;
}

interface PublishTaskRequest {
  taskId: string;
  txHash?: string;
}

interface ListTasksQuery {
  status?: string;
  page: number;
  limit: number;
}

export class TaskService {
  async createTask(userId: string, data: CreateTaskRequest) {
    console.log('🔵 START createTask:', { userId, ...data });

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validate user is a client
      await UserRoleValidator.validateClientRole(userId, tx);

      // Calculate fee and budget
      const rewardTotal = data.reward * data.qty;
      const feePercent = SYSTEM_FEE_RATE * 100; // Convert to percentage (e.g., 5.00)
      const fee = rewardTotal * SYSTEM_FEE_RATE; // Fee amount (5% of reward total)
      const budget = rewardTotal + fee; // Total budget

      console.log('💰 Budget calculated:', { rewardTotal, fee, budget, feePercent });

      // Create draft task
      const createdTask = await tx.task.create({
        data: {
          clientId: userId,
          title: data.title,
          description: data.description,
          category: data.category,
          reward: data.reward,
          qty: data.qty,
          budget: budget,
          // feePercent will default to 5.00
          deadline: data.deadline,
          status: 'draft',
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'create_task',
          details: {
            entityType: 'task',
            entityId: createdTask.id,
            taskTitle: createdTask.title,
            rewardTotal: rewardTotal,
            fee: fee,
            budget: budget,
            idempotencyKey: data.idempotencyKey,
          },
        },
      });

      console.log('✅ Task created:', createdTask.id);

      return {
        id: createdTask.id,
        clientId: createdTask.clientId,
        title: createdTask.title,
        description: createdTask.description,
        category: createdTask.category,
        reward: createdTask.reward.toString(),
        qty: createdTask.qty,
        budget: createdTask.budget?.toString() || null,
        deadline: createdTask.deadline?.toISOString() || null,
        status: createdTask.status,
        createdAt: createdTask.createdAt.toISOString(),
      };
    });
  }

  /**
   * Update draft task
   * EC-B1: No update after publish
   */
  async updateTask(userId: string, taskId: string, data: UpdateTaskRequest) {
    console.log('🔵 START updateTask:', { userId, taskId, ...data });

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validate user is a client
      await UserRoleValidator.validateClientRole(userId, tx);

      // Get task with lock
      const task = await tx.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error('TASK_NOT_FOUND');
      }

      // Verify ownership
      if (task.clientId !== userId) {
        throw new Error('NOT_OWNER');
      }

      // Block update after publish
      if (task.status !== 'draft') {
        throw new Error('CANNOT_UPDATE_PUBLISHED');
      }

      // Recalculate fee and budget if reward or qty changed
      let budget = task.budget;
      if (data.reward !== undefined || data.qty !== undefined) {
        const newReward = data.reward ?? Number(task.reward);
        const newQty = data.qty ?? task.qty;
        const rewardTotal = newReward * newQty;
        const fee = rewardTotal * SYSTEM_FEE_RATE;
        budget = new Prisma.Decimal(rewardTotal + fee);
      }

      // Update task
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          reward: data.reward,
          qty: data.qty,
          budget: budget,
          deadline: data.deadline,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'update_task',
          details: {
            entityType: 'task',
            entityId: taskId,
            changes: data,
          } as any,
        },
      });

      console.log('✅ Task updated:', taskId);

      return {
        id: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description,
        category: updatedTask.category,
        reward: updatedTask.reward.toString(),
        qty: updatedTask.qty,
        budget: updatedTask.budget?.toString() || null,
        feePercent: updatedTask.feePercent.toString(),
        deadline: updatedTask.deadline?.toISOString() || null,
        status: updatedTask.status,
        updatedAt: updatedTask.createdAt.toISOString(),
      };
    });
  }
  /**
   * Update task status
   * @param taskId - The ID of the task to update
   * @param status - The new status to set
   * Simply change status
   */
  async updateTaskStatus(taskId: string, status: 'draft' | 'open' | 'active' | 'completed' | 'cancelled' | 'refund') {
    console.log('🔵 START updateTaskStatus:', { taskId, status });

    try {
      // Get task first to check if it exists
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error('TASK_NOT_FOUND');
      }

      // Update task status
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: { status },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          actorId: task.clientId,
          action: 'update_task_status',
          details: {
            entityType: 'task',
            entityId: taskId,
            oldStatus: task.status,
            newStatus: status,
          },
        },
      });

      console.log('✅ Task status updated:', { taskId, oldStatus: task.status, newStatus: status });

      return {
        id: updatedTask.id,
        status: updatedTask.status,
        updatedAt: updatedTask.updatedAt.toISOString(),
      };
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new Error('TASK_NOT_FOUND');
      }
      throw error;
    }
  }

  /**
   * Publish task
   * Simply changes status from draft to open
   */
  async publishTask(userId: string, data: PublishTaskRequest) {
    console.log('🔵 START publishTask:', { userId, ...data });

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validate user is a client
      await UserRoleValidator.validateClientRole(userId, tx);

      // Get task
      const task = await tx.task.findUnique({
        where: { id: data.taskId },
      });

      if (!task) {
        throw new Error('TASK_NOT_FOUND');
      }

      // Verify ownership
      if (task.clientId !== userId) {
        throw new Error('NOT_OWNER');
      }

      // Block if already published
      if (task.status !== 'draft') {
        throw new Error('ALREADY_PUBLISHED');
      }

      // Publish task
      const publishedTask = await tx.task.update({
        where: { id: data.taskId },
        data: {
          status: 'open',
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'publish_task',
          details: {
            entityType: 'task',
            entityId: data.taskId,
            budget: task.budget?.toString(),
            txHash: data.txHash,
          },
        },
      });

      console.log('✅ Task published:', data.taskId);

      return {
        id: publishedTask.id,
        status: publishedTask.status,
        budget: publishedTask.budget?.toString() || '0',
        publishedAt: publishedTask.createdAt.toISOString(),
      };
    });
  }
  // /**
  //    * Get tasks by userId
  //    */
  // async getTasksByUserId(userId: string): Promise<Task[]> {
  //   const tasks = await prisma.task.findMany({
  //     where: { userId },
  //     orderBy: { createdAt: 'desc' },
  //   });

  //   return tasks.map((task) => ({
  //     id: task.id,
  //     taskId: task.taskId,
  //     userId: task.userId,
  //     amount: Number(task.amount),
  //     budget: Number(task.budget),
  //     quantity: task.quantity,
  //     feePercent: Number(task.feePercent),
  //     status: task.status,
  //     txHash: task.txHash || undefined,
  //     createdAt: task.createdAt,
  //     updatedAt: task.updatedAt,
  //   }));
  // }
  // /**
  //    * Get tasks by status
  //    */
  // async getTasksByStatus(status: TaskPaymentStatus): Promise<Task[]> {
  //   const tasks = await prisma.task.findMany({
  //     where: { status },
  //     orderBy: { createdAt: 'desc' },
  //   });

  //   return tasks.map((task) => ({
  //     id: task.id,
  //     taskId: task.taskId,
  //     userId: task.userId,
  //     amount: Number(task.amount),
  //     budget: Number(task.budget),
  //     quantity: task.quantity,
  //     feePercent: Number(task.feePercent),
  //     status: task.status,
  //     txHash: task.txHash || undefined,
  //     createdAt: task.createdAt,
  //     updatedAt: task.updatedAt,
  //   }));
  // }
  // /**
  //    * Update task status
  //    */
  // async updateTaskStatus(
  //   taskId: string,
  //   status: TaskPaymentStatus,
  //   txHash?: string
  // ): Promise<Task> {
  //   try {
  //     const updated = await prisma.task.update({
  //       where: { taskId },
  //       data: {
  //         status,
  //         ...(txHash && { txHash }),
  //       },
  //     });

  //     return {
  //       id: updated.id,
  //       taskId: updated.taskId,
  //       userId: updated.userId,
  //       amount: Number(updated.amount),
  //       budget: Number(updated.budget),
  //       quantity: updated.quantity,
  //       feePercent: Number(updated.feePercent),
  //       status: updated.status,
  //       txHash: updated.txHash || undefined,
  //       createdAt: updated.createdAt,
  //       updatedAt: updated.updatedAt,
  //     };
  //   } catch (error: any) {
  //     if (error.code === 'P2025') {
  //       // Record not found
  //       throw new Error('Task not found');
  //     }
  //     throw error;
  //   }
  // }
  /**
   * Delete task
   * Only draft tasks can be deleted
   */
  async deleteTask(userId: string, taskId: string) {
    console.log('🔵 START deleteTask:', { userId, taskId });

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validate user is a client
      await UserRoleValidator.validateClientRole(userId, tx);

      // Get task
      const task = await tx.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error('TASK_NOT_FOUND');
      }

      // Verify ownership
      if (task.clientId !== userId) {
        throw new Error('NOT_OWNER');
      }

      // Only allow deleting draft tasks
      if (task.status !== 'draft') {
        throw new Error('CANNOT_DELETE_PUBLISHED');
      }

      // Delete task (CASCADE will delete related records)
      await tx.task.delete({
        where: { id: taskId },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'delete_task',
          details: {
            entityType: 'task',
            entityId: taskId,
            taskTitle: task.title,
            budget: task.budget?.toString(),
          },
        },
      });

      console.log('✅ Task deleted:', taskId);

      return {
        success: true,
        message: 'Task deleted successfully',
        taskId: taskId,
      };
    });
  }

  /**
   * List client's tasks
   */
  async listTasks(userId: string, query: ListTasksQuery) {
    console.log('🔵 listTasks:', { userId, ...query });

    // Validate user is a client
    await UserRoleValidator.validateClientRole(userId);

    const { status, page, limit } = query;
    const skip = (page - 1) * limit;

    // Build WHERE clause
    const where: Prisma.TaskWhereInput = {
      clientId: userId,
    };

    if (status) {
      where.status = status as any;
    }

    // Get total count
    const total = await prisma.task.count({ where });

    // Get tasks
    const tasksResult = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const tasks = tasksResult.map((task: typeof tasksResult[number]) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      reward: task.reward.toString(),
      qty: task.qty,
      budget: task.budget?.toString() || null,
      deadline: task.deadline?.toISOString() || null,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
    }));

    const totalPages = Math.ceil(total / limit);

    console.log('✅ Tasks listed:', { total, page, totalPages });

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
  /**
   * Get available tasks for workers with filtering and pagination
   * Excludes tasks worker already accepted
   */
  async discoverTasks(
    query: TaskDiscoveryQuery,
    userId?: string
  ): Promise<{ data: TaskDiscoveryItem[]; pagination: PaginationMeta }> {
    const { category, minReward, maxReward, sortBy, order, page, limit } = query;

    // Build cache key
    const cacheKey = `tasks:discover:${JSON.stringify({ ...query, userId })}`;

    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Build where clause
    const where: Prisma.TaskWhereInput = {
      status: 'open',
    };

    // Filter by category
    if (category) {
      where.category = category;
    }

    // Filter by reward range
    if (minReward !== undefined || maxReward !== undefined) {
      where.reward = {};
      if (minReward !== undefined) {
        where.reward.gte = minReward;
      }
      if (maxReward !== undefined) {
        where.reward.lte = maxReward;
      }
    }

    // Exclude tasks worker already accepted
    if (userId) {
      where.assignments = {
        none: {
          workerId: userId,
        },
      };
    }

    // Build orderBy
    let orderBy: Prisma.TaskOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'reward':
        orderBy = { reward: order };
        break;
      case 'deadline':
        orderBy = { deadline: order };
        break;
      case 'createdAt':
      default:
        orderBy = { createdAt: order };
        break;
    }

    // Get total count
    const total = await prisma.task.count({ where });

    // Get paginated tasks
    const tasks = await prisma.task.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        reward: true,
        qty: true,
        deadline: true,
        status: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    // Transform data
    const data: TaskDiscoveryItem[] = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      reward: task.reward.toString(),
      qty: task.qty,
      deadline: task.deadline?.toISOString() || null,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      client: {
        id: task.client.id,
        email: task.client.email,
      },
      _count: {
        assignments: task._count.assignments,
      },
    }));

    // Pagination metadata
    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
    };

    const result = { data, pagination };

    // Cache result
    await redis.setex(cacheKey, config.cacheTtl, JSON.stringify(result));

    return result;
  }

  /**
   * Get all tasks (no filters)
   */
  async getAllTasks() {
    const cacheKey = 'tasks:all';

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get all tasks from database
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        reward: true,
        qty: true,
        deadline: true,
        status: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    // Transform data
    const data = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      reward: task.reward.toString(),
      qty: task.qty,
      deadline: task.deadline?.toISOString() || null,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      client: {
        id: task.client.id,
        email: task.client.email,
      },
      _count: {
        assignments: task._count.assignments,
      },
    }));

    // Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(data));

    return data;
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        client: {
          select: {
            id: true,
            email: true,
          },
        },
        assignments: {
          include: {
            worker: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return null;
    }

    // Transform data to ensure proper JSON serialization
    return {
      id: task.id,
      clientId: task.clientId,
      title: task.title,
      description: task.description,
      category: task.category,
      reward: task.reward.toString(),
      qty: task.qty,
      budget: task.budget?.toString() || null,
      feePercent: task.feePercent.toString(),
      deadline: task.deadline?.toISOString() || null,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      client: task.client,
      assignments: task.assignments.map((assignment) => ({
        id: assignment.id,
        taskId: assignment.taskId,
        workerId: assignment.workerId,
        status: assignment.status,
        startedAt: assignment.startedAt?.toISOString() || null,
        dueAt: assignment.dueAt?.toISOString() || null,
        createdAt: assignment.createdAt.toISOString(),
        worker: assignment.worker,
      })),
    };
  }

  /**
   * Clear task cache
   */
  async clearTaskCache() {
    const keys = await redis.keys('tasks:discover:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const taskService = new TaskService();

