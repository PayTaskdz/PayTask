/**
 * Review Types
 * Type definitions for review-related operations
 */

export interface CreateReviewRequest {
  submissionId: string;
  decision: 'approve' | 'reject' | 'fix';
  feedback: string | null;
}

export interface ReviewResponse {
  id: string;
  submissionId: string;
  reviewerId: string;
  decision: 'approve' | 'reject' | 'fix';
  feedback: string | null;
  createdAt: string;
  submission?: {
    id: string;
    assignmentId: string;
    status: string;
    task: {
      id: string;
      title: string;
      reward: string;
    };
    worker: {
      id: string;
      email: string;
    };
  };
}
