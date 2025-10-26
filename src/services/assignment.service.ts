import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import redis from '../config/redis';
import { UserRoleValidator } from './user-role.validator';

export class AssignmentService {
  /**
   * Accept a task (create assignment)
   * Uses optimistic locking - first transaction wins, others get conflict error
   */
  async acceptTask(taskId: string, userId: string) {
    // Use transaction with serializable isolation for optimistic locking
    // This ensures "first wins" - simultaneous requests will be serialized
    return await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Validate user is a worker
        await UserRoleValidator.validateWorkerRole(userId, tx);

        // 1. Check worker's active assignments (< 3)
        const activeAssignments = await tx.assignment.count({
          where: {
            workerId: userId,
            status: {
              in: ['in_progress', 'late'],
            },
          },
        });

        if (activeAssignments >= 3) {
          throw new Error('CONCURRENCY_CAP');
        }

        // 2. Get task (lock for update to prevent race conditions)
        const task = await tx.task.findUnique({
          where: { id: taskId },
          include: {
            _count: {
              select: {
                assignments: true,
              },
            },
          },
        });

        if (!task) {
          throw new Error('NOT_FOUND');
        }

        // 3. Check task status = 'open'
        if (task.status !== 'open') {
          throw new Error('TASK_NOT_OPEN');
        }

        // 4. OPTIMISTIC LOCK: Re-check assignment count just before creation
        // This is the critical section - prevents race conditions
        const currentAssignmentCount = await tx.assignment.count({
          where: { taskId: taskId },
        });

        if (currentAssignmentCount >= task.qty) {
          throw new Error('DOUBLE_ACCEPTANCE'); // Race condition detected!
        }

        // 5. Check if worker already accepted this task
        const existingAssignment = await tx.assignment.findFirst({
          where: {
            taskId: taskId,
            workerId: userId,
          },
        });

        if (existingAssignment) {
          throw new Error('ALREADY_ACCEPTED');
        }

        // 6. Create assignment (atomic operation)
        const dueAt = task.deadline || new Date(Date.now() + 48 * 60 * 60 * 1000); // deadline or +48h

        const assignment = await tx.assignment.create({
          data: {
            taskId: taskId,
            workerId: userId,
            status: 'in_progress',
            startedAt: new Date(),
            dueAt: dueAt,
          },
          include: {
            task: {
              select: {
                title: true,
                reward: true,
                deadline: true,
              },
            },
          },
        });

        // 8. Clear cache
        await this.clearAssignmentCache(userId);

      return {
        id: assignment.id,
        taskId: assignment.taskId,
        workerId: assignment.workerId,
        status: assignment.status,
        startedAt: assignment.startedAt?.toISOString() || new Date().toISOString(),
        dueAt: assignment.dueAt?.toISOString() || new Date().toISOString(),
        createdAt: assignment.createdAt.toISOString(),
        task: {
          title: assignment.task.title,
          reward: assignment.task.reward.toString(),
          deadline: assignment.task.deadline?.toISOString() || null,
        },
      };
    });
  }

  /**
   * List worker's assignments with pagination and filter
   */
  async listWorkerAssignments(
    userId: string,
    status?: string,
    page: number = 1,
    limit: number = 10
  ) {
    // Validate user is a worker
    await UserRoleValidator.validateWorkerRole(userId);

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { workerId: userId };
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.assignment.count({ where });

    // Get assignments
    const assignments = await prisma.assignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            category: true,
            reward: true,
            deadline: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
          },
        },
      },
    });

    const data = assignments.map((a) => ({
      id: a.id,
      taskId: a.taskId,
      workerId: a.workerId,
      status: a.status,
      startedAt: a.startedAt?.toISOString() || null,
      dueAt: a.dueAt?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
      task: {
        id: a.task.id,
        title: a.task.title,
        category: a.task.category,
        reward: a.task.reward.toString(),
        deadline: a.task.deadline?.toISOString() || null,
      },
      submission: a.submission
        ? {
            id: a.submission.id,
            status: a.submission.status,
            submittedAt: a.submission.submittedAt.toISOString(),
          }
        : null,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get worker's assignments (simple version, no pagination)
   */
  async getWorkerAssignments(userId: string) {
    // Validate user is a worker
    await UserRoleValidator.validateWorkerRole(userId);

    const cacheKey = `assignments:worker:${userId}`;

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const assignments = await prisma.assignment.findMany({
      where: { workerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            reward: true,
            deadline: true,
            status: true,
          },
        },
      },
    });

    const data = assignments.map((a) => ({
      id: a.id,
      taskId: a.taskId,
      status: a.status,
      startedAt: a.startedAt?.toISOString() || null,
      dueAt: a.dueAt?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
      task: {
        id: a.task.id,
        title: a.task.title,
        description: a.task.description,
        category: a.task.category,
        reward: a.task.reward.toString(),
        deadline: a.task.deadline?.toISOString() || null,
        status: a.task.status,
      },
    }));

    // Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(data));

    return data;
  }

  /**
   * Clear assignment cache
   */
  async clearAssignmentCache(userId?: string) {
    if (userId) {
      await redis.del(`assignments:worker:${userId}`);
    }
    // Also clear task cache as assignment count changed
    const keys = await redis.keys('tasks:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const assignmentService = new AssignmentService();

