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
    console.log(`🔵 START acceptTask: taskId=${taskId}, userId=${userId}`);
    
    // Use transaction with serializable isolation for optimistic locking
    // This ensures "first wins" - simultaneous requests will be serialized
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        console.log('📝 Inside transaction...');
        
        // Validate user is a worker
        console.log('✓ Validating worker role...');
        await UserRoleValidator.validateWorkerRole(userId, tx);

        // 1. Check worker's active assignments (< 3)
        console.log('✓ Checking active assignments...');
        const activeAssignments = await tx.assignment.count({
          where: {
            workerId: userId,
            status: {
              in: ['in_progress', 'late'],
            },
          },
        });

        console.log(`  Active assignments: ${activeAssignments}/3`);
        if (activeAssignments >= 3) {
          throw new Error('CONCURRENCY_CAP');
        }

        // 2. Get task (lock for update to prevent race conditions)
        console.log('✓ Fetching task...');
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

        console.log(`  Task found: ${task ? task.title : 'NOT FOUND'}`);
        if (!task) {
          throw new Error('NOT_FOUND');
        }

        // 3. Check task status = 'open'
        console.log(`  Task status: ${task.status}`);
        if (task.status !== 'open') {
          throw new Error('TASK_NOT_OPEN');
        }

        // 4. OPTIMISTIC LOCK: Re-check assignment count just before creation
        console.log('✓ Checking assignment count (race condition prevention)...');
        const currentAssignmentCount = await tx.assignment.count({
          where: { taskId: taskId },
        });

        console.log(`  Assignments: ${currentAssignmentCount}/${task.qty}`);
        if (currentAssignmentCount >= task.qty) {
          throw new Error('DOUBLE_ACCEPTANCE'); // Race condition detected!
        }

        // 5. Check if worker already accepted this task
        console.log('✓ Checking duplicate acceptance...');
        const existingAssignment = await tx.assignment.findFirst({
          where: {
            taskId: taskId,
            workerId: userId,
          },
        });

        if (existingAssignment) {
          console.log('  ⚠️ Worker already accepted this task');
          throw new Error('ALREADY_ACCEPTED');
        }

        // 6. Create assignment (atomic operation)
        console.log('✓ Creating assignment...');
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

        // 7. Update task status to 'active' (first worker accepted)
        // Only update if task is still in 'open' status
        await tx.task.update({
          where: { id: taskId },
          data: { status: 'active' },
        });

        // 8. Create audit log for task status change
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'task_status_changed',
            details: {
              entityType: 'task',
              entityId: taskId,
              oldStatus: 'open',
              newStatus: 'active',
              reason: 'First worker accepted task',
            },
          },
        });

        // 9. Create audit log for task status change
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'task_status_changed',
            details: {
              entityType: 'task',
              entityId: taskId,
              oldStatus: 'open',
              newStatus: 'active',
              reason: 'First worker accepted task',
            },
          },
        });

        console.log('✅ Assignment created successfully');

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
      }
    );

    // Clear cache AFTER transaction completes successfully
    console.log('🗑️ Clearing assignment cache...');
    try {
      await this.clearAssignmentCache(userId);
    } catch (cacheError) {
      console.error('⚠️ Failed to clear cache (non-critical):', cacheError);
    }

    console.log('✅ Task accepted successfully');
    return result;
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

