import { z } from 'zod';

// Accept task request schema
export const AcceptTaskSchema = z.object({
  taskId: z.string().uuid('Invalid task ID format'),
  workerId: z.string().uuid('Invalid worker ID format').optional(), // Optional since auth is skipped
});

export type AcceptTaskRequest = z.infer<typeof AcceptTaskSchema>;

// List assignments query schema
export const ListAssignmentsQuerySchema = z.object({
  workerId: z.string().uuid('Invalid worker ID format').optional(),
  status: z.enum(['in_progress', 'late', 'completed', 'expired']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListAssignmentsQuery = z.infer<typeof ListAssignmentsQuerySchema>;

// Assignment response types
export interface AssignmentResponse {
  id: string;
  taskId: string;
  workerId: string;
  status: string;
  startedAt: string;
  dueAt: string;
  createdAt: string;
  task: {
    title: string;
    reward: string;
    deadline: string | null;
  };
}

export interface AcceptTaskResponse {
  success: boolean;
  message: string;
  data: AssignmentResponse;
}

