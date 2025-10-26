import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import {
  CreateRatingRequest,
  RatingResponse,
  WorkerRatingStatsResponse,
} from '../types/rating.types';

/**
 * Rating Service (Prisma)
 * Handles business logic for user ratings using Prisma ORM
 */
export class RatingService {
  /**
   * Create a rating for a user on a task
   * Validates task ownership and prevents duplicate ratings
   */
  async createRating(
    fromUserId: string,
    data: CreateRatingRequest
  ): Promise<RatingResponse> {
    console.log('🔵 START createRating:', { fromUserId, ...data });

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      console.log('🔵 Transaction started');

      // 1. Verify task exists
      console.log('🔵 Fetching task:', data.taskId);
      const task = await tx.task.findUnique({
        where: { id: data.taskId },
      });

      if (!task) {
        console.log('❌ Task NOT_FOUND');
        throw new Error('TASK_NOT_FOUND');
      }

      // 2. Verify user is involved in the task (either client or worker)
      console.log('🔵 Verifying user involvement in task');
      const isClient = task.clientId === fromUserId;
      const isWorker = await tx.assignment.findFirst({
        where: {
          taskId: data.taskId,
          workerId: fromUserId,
        },
      });

      if (!isClient && !isWorker) {
        console.log('❌ UNAUTHORIZED - User not involved in task');
        throw new Error('UNAUTHORIZED');
      }

      // 3. Check for duplicate rating
      console.log('🔵 Checking for duplicate rating');
      const existingRating = await tx.rating.findFirst({
        where: {
          taskId: data.taskId,
          fromUserId,
          toUserId: data.toUserId,
        },
      });

      if (existingRating) {
        console.log('❌ DUPLICATE_RATING');
        throw new Error('DUPLICATE_RATING');
      }

      // 4. Validate score range (already validated by Zod, but double-check)
      if (data.score < 1 || data.score > 5) {
        console.log('❌ INVALID_SCORE:', data.score);
        throw new Error('INVALID_SCORE');
      }

      // 5. Verify target user exists
      console.log('🔵 Verifying target user exists');
      const targetUser = await tx.user.findUnique({
        where: { id: data.toUserId },
      });

      if (!targetUser) {
        console.log('❌ USER_NOT_FOUND');
        throw new Error('USER_NOT_FOUND');
      }

      // 6. Create rating
      console.log('🔵 Creating rating');
      const rating = await tx.rating.create({
        data: {
          fromUserId,
          toUserId: data.toUserId,
          taskId: data.taskId,
          score: data.score,
          comment: data.comment,
        },
      });

      console.log('🔵 Rating created:', rating.id);

      // 7. Build response
      const result: RatingResponse = {
        id: rating.id,
        fromUserId: rating.fromUserId,
        toUserId: rating.toUserId,
        taskId: rating.taskId,
        score: rating.score,
        comment: rating.comment,
        createdAt: rating.createdAt.toISOString(),
        task: {
          id: task.id,
          title: task.title,
          reward: task.reward.toString(),
        },
      };

      console.log('✅ SUCCESS - Rating created:', result.id);
      return result;
    });
  }

  /**
   * Get rating by ID
   */
  async getRatingById(ratingId: string): Promise<RatingResponse | null> {
    console.log('🔵 Getting rating:', ratingId);

    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
    });

    if (!rating) {
      return null;
    }

    return {
      id: rating.id,
      fromUserId: rating.fromUserId,
      toUserId: rating.toUserId,
      taskId: rating.taskId,
      score: rating.score,
      comment: rating.comment,
      createdAt: rating.createdAt.toISOString(),
    };
  }

  /**
   * Get ratings for a task
   */
  async getRatingsByTaskId(taskId: string): Promise<RatingResponse[]> {
    console.log('🔵 Getting ratings for task:', taskId);

    const ratings = await prisma.rating.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    return ratings.map((rating) => ({
      id: rating.id,
      fromUserId: rating.fromUserId,
      toUserId: rating.toUserId,
      taskId: rating.taskId,
      score: rating.score,
      comment: rating.comment,
      createdAt: rating.createdAt.toISOString(),
    }));
  }

  /**
   * Get ratings given by a user
   */
  async getRatingsGivenByUser(userId: string): Promise<RatingResponse[]> {
    console.log('🔵 Getting ratings given by user:', userId);

    const ratings = await prisma.rating.findMany({
      where: { fromUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return ratings.map((rating) => ({
      id: rating.id,
      fromUserId: rating.fromUserId,
      toUserId: rating.toUserId,
      taskId: rating.taskId,
      score: rating.score,
      comment: rating.comment,
      createdAt: rating.createdAt.toISOString(),
    }));
  }

  /**
   * Get ratings received by a user
   */
  async getRatingsReceivedByUser(userId: string): Promise<RatingResponse[]> {
    console.log('🔵 Getting ratings received by user:', userId);

    const ratings = await prisma.rating.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return ratings.map((rating) => ({
      id: rating.id,
      fromUserId: rating.fromUserId,
      toUserId: rating.toUserId,
      taskId: rating.taskId,
      score: rating.score,
      comment: rating.comment,
      createdAt: rating.createdAt.toISOString(),
    }));
  }

  /**
   * Get worker rating statistics
   */
  async getWorkerRatingStats(
    userId: string,
    includeRecent: boolean = false
  ): Promise<WorkerRatingStatsResponse> {
    console.log('🔵 Getting worker rating stats:', userId);

    // Get all ratings for the user
    const ratings = await prisma.rating.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate statistics
    const totalRatings = ratings.length;
    const averageScore =
      totalRatings > 0
        ? ratings.reduce((sum, r) => sum + r.score, 0) / totalRatings
        : 0;

    // Calculate score distribution
    const scoreDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratings.forEach((r) => {
      scoreDistribution[r.score as keyof typeof scoreDistribution]++;
    });

    const response: WorkerRatingStatsResponse = {
      workerId: userId,
      averageScore: Number(averageScore.toFixed(2)),
      totalRatings,
      scoreDistribution,
    };

    // Include recent ratings if requested
    if (includeRecent) {
      response.recentRatings = ratings.slice(0, 5).map((rating) => ({
        id: rating.id,
        fromUserId: rating.fromUserId,
        toUserId: rating.toUserId,
        taskId: rating.taskId,
        score: rating.score,
        comment: rating.comment,
        createdAt: rating.createdAt.toISOString(),
      }));
    }

    console.log('✅ Worker stats retrieved:', response);
    return response;
  }

  /**
   * Get all ratings with pagination
   */
  async getAllRatings(
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: RatingResponse[]; pagination: any }> {
    console.log('🔵 Getting all ratings:', { page, limit });

    const offset = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      prisma.rating.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.rating.count(),
    ]);

    return {
      data: ratings.map((rating) => ({
        id: rating.id,
        fromUserId: rating.fromUserId,
        toUserId: rating.toUserId,
        taskId: rating.taskId,
        score: rating.score,
        comment: rating.comment,
        createdAt: rating.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const ratingService = new RatingService();
