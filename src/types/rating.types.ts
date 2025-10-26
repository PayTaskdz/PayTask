/**
 * Rating Types
 * Type definitions for rating-related operations
 */

export interface CreateRatingRequest {
  taskId: string;
  toUserId: string;
  score: number;
  comment: string | null;
}

export interface RatingResponse {
  id: string;
  fromUserId: string;
  toUserId: string;
  taskId: string;
  score: number;
  comment: string | null;
  createdAt: string;
  task?: {
    id: string;
    title: string;
    reward: string;
  };
}

export interface WorkerRatingStatsResponse {
  workerId: string;
  averageScore: number;
  totalRatings: number;
  scoreDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentRatings?: RatingResponse[];
}
