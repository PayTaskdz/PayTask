import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import redis from '../config/redis';
import { config } from '../config/env';
import { TaskDiscoveryQuery, TaskDiscoveryItem, PaginationMeta } from '../types/task.types';

export class TaskService {
  /**
   * Get available tasks for workers with filtering and pagination
   * Excludes tasks worker already accepted
   */
  async discoverTasks(
    query: TaskDiscoveryQuery,
    workerId?: string
  ): Promise<{ data: TaskDiscoveryItem[]; pagination: PaginationMeta }> {
    const { category, minReward, maxReward, sortBy, order, page, limit } = query;

    // Build cache key
    const cacheKey = `tasks:discover:${JSON.stringify({ ...query, workerId })}`;

    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Build where clause
    const where: Prisma.TaskWhereInput = {
      status: 'open',
      escrow: {
        status: 'held',
      },
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
    if (workerId) {
      where.assignments = {
        none: {
          workerId: workerId,
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
            country: true,
          },
        },
        escrow: {
          select: {
            amount: true,
            status: true,
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
        country: task.client.country,
      },
      escrow: task.escrow
        ? {
            amount: task.escrow.amount.toString(),
            status: task.escrow.status,
          }
        : null,
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
            country: true,
          },
        },
        escrow: {
          select: {
            amount: true,
            status: true,
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
        country: task.client.country,
      },
      escrow: task.escrow
        ? {
            amount: task.escrow.amount.toString(),
            status: task.escrow.status,
          }
        : null,
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
            country: true,
            email: true,
          },
        },
        escrow: true,
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
      deadline: task.deadline?.toISOString() || null,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      client: task.client,
      escrow: task.escrow
        ? {
            id: task.escrow.id,
            taskId: task.escrow.taskId,
            amount: task.escrow.amount.toString(),
            feeRate: task.escrow.feeRate.toString(),
            status: task.escrow.status,
            txHashHold: task.escrow.txHashHold,
            createdAt: task.escrow.createdAt.toISOString(),
          }
        : null,
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

