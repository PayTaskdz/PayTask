import prisma from '../config/prisma';
import { UserRoleValidator } from './user-role.validator';

interface ClientStatistics {
  userId: string;
  role: 'client';
  summary: {
    totalTasksCreated: number;
    totalBudgetSpent: string;
    totalSubmissionsReviewed: number;
    totalWorkersEngaged: number;
    averageRatingGiven: number | null;
  };
  tasks: {
    draft: number;
    open: number;
    closed: number;
    expired: number;
  };
  reviews: {
    approved: number;
    rejected: number;
    reported: number;
  };
  topWorkers: Array<{
    workerId: string;
    workerEmail: string;
    tasksCompleted: number;
    averageRating: number | null;
  }>;
}

interface WorkerStatistics {
  userId: string;
  role: 'worker';
  profile: {
    reputation: number;
    completedTasks: number;
    earlySubmissions: number;
  };
  summary: {
    totalAssignments: number;
    totalEarnings: string;
    averageRatingReceived: number | null;
    successRate: number;
  };
  assignments: {
    inProgress: number;
    late: number;
    completed: number;
    expired: number;
  };
  submissions: {
    submitted: number;
    fixRequested: number;
    rejected: number;
    accepted: number;
  };
  topClients: Array<{
    clientId: string;
    clientEmail: string;
    tasksCompleted: number;
    averageRating: number | null;
  }>;
}

/**
 * Statistics Service
 * Provides statistics for clients and workers using Prisma
 */
export class StatisticsService {
  /**
   * Get statistics for a client
   */
  async getClientStatistics(userId: string): Promise<ClientStatistics> {
    console.log('🔵 Getting client statistics for:', userId);

    // Validate user is a client
    await UserRoleValidator.validateClientRole(userId);

    // Get task statistics
    const [taskStats, reviewStats, uniqueWorkersCount, avgRating, topWorkers] =
      await Promise.all([
        // Task statistics
        prisma.task.groupBy({
          by: ['status'],
          where: { clientId: userId },
          _count: true,
          _sum: { budget: true },
        }),
        // Review statistics
        prisma.review.groupBy({
          by: ['decision'],
          where: { reviewerId: userId },
          _count: true,
        }),
        // Unique workers engaged
        prisma.assignment.findMany({
          where: {
            task: {
              clientId: userId,
            },
          },
          select: {
            workerId: true,
          },
          distinct: ['workerId'],
        }),
        // Average rating given
        prisma.rating.aggregate({
          where: { fromUserId: userId },
          _avg: { score: true },
        }),
        // Top workers
        prisma.assignment.groupBy({
          by: ['workerId'],
          where: {
            task: {
              clientId: userId,
            },
            status: 'completed',
          },
          _count: true,
          orderBy: {
            _count: {
              workerId: 'desc',
            },
          },
          take: 5,
        }),
      ]);

    // Calculate totals
    let totalTasks = 0;
    let totalBudget = 0;
    const tasksByStatus: any = {
      draft: 0,
      open: 0,
      closed: 0,
      expired: 0,
    };

    taskStats.forEach((stat) => {
      totalTasks += stat._count;
      totalBudget += Number(stat._sum.budget || 0);
      if (stat.status in tasksByStatus) {
        tasksByStatus[stat.status] = stat._count;
      }
    });

    // Calculate review stats
    const reviewsByDecision: any = {
      approved: 0,
      rejected: 0,
      reported: 0,
    };

    reviewStats.forEach((stat) => {
      if (stat.decision === 'approve') {
        reviewsByDecision.approved = stat._count;
      } else if (stat.decision === 'reject') {
        reviewsByDecision.rejected = stat._count;
      } else if (stat.decision === 'fix') {
        reviewsByDecision.reported = stat._count;
      }
    });

    // Get worker details for top workers
    const workerIds = topWorkers.map((w) => w.workerId);
    const workersData = await prisma.user.findMany({
      where: { id: { in: workerIds } },
      select: {
        id: true,
        email: true,
        ratingsReceived: {
          where: { fromUserId: userId },
          select: { score: true },
        },
      },
    });

    const topWorkersWithDetails = topWorkers.map((worker) => {
      const workerData = workersData.find((w) => w.id === worker.workerId);
      const ratings = workerData?.ratingsReceived || [];
      const avgWorkerRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
          : null;

      return {
        workerId: worker.workerId,
        workerEmail: workerData?.email || 'unknown',
        tasksCompleted: worker._count,
        averageRating: avgWorkerRating,
      };
    });

    const statistics: ClientStatistics = {
      userId,
      role: 'client',
      summary: {
        totalTasksCreated: totalTasks,
        totalBudgetSpent: totalBudget.toString(),
        totalSubmissionsReviewed:
          reviewsByDecision.approved + reviewsByDecision.rejected + reviewsByDecision.reported,
        totalWorkersEngaged: uniqueWorkersCount.length,
        averageRatingGiven: avgRating._avg.score
          ? Number(avgRating._avg.score.toFixed(2))
          : null,
      },
      tasks: tasksByStatus,
      reviews: reviewsByDecision,
      topWorkers: topWorkersWithDetails,
    };

    console.log('✅ Client statistics retrieved successfully');
    return statistics;
  }

  /**
   * Get statistics for a worker
   */
  async getWorkerStatistics(userId: string): Promise<WorkerStatistics> {
    console.log('🔵 Getting worker statistics for:', userId);

    // Validate user is a worker
    await UserRoleValidator.validateWorkerRole(userId);

    // Get worker profile
    const profile = await prisma.workerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error('WORKER_PROFILE_NOT_FOUND');
    }

    // Get statistics
    const [assignmentStats, submissionStats, earnings, avgRating] =
      await Promise.all([
        // Assignment statistics
        prisma.assignment.groupBy({
          by: ['status'],
          where: { workerId: userId },
          _count: true,
        }),
        // Submission statistics
        prisma.submission.groupBy({
          by: ['status'],
          where: {
            assignment: {
              workerId: userId,
            },
          },
          _count: true,
        }),
        // Total earnings
        prisma.payout.aggregate({
          where: {
            workerId: userId,
            status: 'paid',
          },
          _sum: {
            amountNet: true,
          },
        }),
        // Average rating received
        prisma.rating.aggregate({
          where: { toUserId: userId },
          _avg: { score: true },
        }),
      ]);

    // Calculate assignment stats
    const assignmentsByStatus: any = {
      inProgress: 0,
      late: 0,
      completed: 0,
      expired: 0,
    };

    let totalAssignments = 0;
    assignmentStats.forEach((stat) => {
      totalAssignments += stat._count;
      if (stat.status === 'in_progress') {
        assignmentsByStatus.inProgress = stat._count;
      } else if (stat.status in assignmentsByStatus) {
        assignmentsByStatus[stat.status] = stat._count;
      }
    });

    // Calculate submission stats
    const submissionsByStatus: any = {
      submitted: 0,
      fixRequested: 0,
      rejected: 0,
      accepted: 0,
    };

    let totalSubmissions = 0;
    let acceptedSubmissions = 0;

    submissionStats.forEach((stat) => {
      totalSubmissions += stat._count;
      if (stat.status === 'accepted') {
        acceptedSubmissions = stat._count;
      }
      if (stat.status === 'fix_requested') {
        submissionsByStatus.fixRequested = stat._count;
      } else if (stat.status in submissionsByStatus) {
        submissionsByStatus[stat.status] = stat._count;
      }
    });

    // Calculate success rate
    const successRate =
      totalSubmissions > 0 ? (acceptedSubmissions / totalSubmissions) * 100 : 0;

    // Get top clients (simplified - would need more complex query for full implementation)
    const statistics: WorkerStatistics = {
      userId,
      role: 'worker',
      profile: {
        reputation: Number(profile.reputation),
        completedTasks: profile.completedTasks,
        earlySubmissions: profile.earlySubmissions,
      },
      summary: {
        totalAssignments,
        totalEarnings: earnings._sum.amountNet?.toString() || '0',
        averageRatingReceived: avgRating._avg.score
          ? Number(avgRating._avg.score.toFixed(2))
          : null,
        successRate: Number(successRate.toFixed(2)),
      },
      assignments: assignmentsByStatus,
      submissions: submissionsByStatus,
      topClients: [], // Would need additional query to populate
    };

    console.log('✅ Worker statistics retrieved successfully');
    return statistics;
  }
}

export const statisticsService = new StatisticsService();
