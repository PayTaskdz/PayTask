import prisma from '../config/prisma';
import redis from '../config/redis';

export class StatsService {
  /**
   * Get task statistics
   */
  async getTaskStats() {
    const cacheKey = 'stats:tasks';

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get stats from database
    const [
      totalTasks,
      openTasks,
      totalAssignments,
      completedAssignments,
      tasksByCategory,
      tasksByStatus,
    ] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: 'open' } }),
      prisma.assignment.count(),
      prisma.assignment.count({ where: { status: 'completed' } }),
      prisma.task.groupBy({
        by: ['category'],
        _count: true,
      }),
      prisma.task.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const stats = {
      tasks: {
        total: totalTasks,
        open: openTasks,
        byCategory: tasksByCategory.map((item) => ({
          category: item.category || 'uncategorized',
          count: item._count,
        })),
        byStatus: tasksByStatus.map((item) => ({
          status: item.status,
          count: item._count,
        })),
      },
      assignments: {
        total: totalAssignments,
        completed: completedAssignments,
      },
    };

    // Cache for 1 minute
    await redis.setex(cacheKey, 60, JSON.stringify(stats));

    return stats;
  }

  /**
   * Get categories
   */
  async getCategories() {
    const cacheKey = 'stats:categories';

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await prisma.task.findMany({
      select: { category: true },
      distinct: ['category'],
      where: {
        category: { not: null },
      },
    });

    const result = categories.map((c) => c.category).filter(Boolean);

    await redis.setex(cacheKey, 300, JSON.stringify(result));

    return result;
  }

  /**
   * Clear stats cache
   */
  async clearStatsCache() {
    const keys = await redis.keys('stats:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const statsService = new StatsService();

