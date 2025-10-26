/**
 * Application error codes and messages
 * Centralized error definitions for consistency
 */
export const ErrorCodes = {
  // User/Auth errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_NOT_CLIENT: 'USER_NOT_CLIENT',
  USER_NOT_WORKER: 'USER_NOT_WORKER',
  
  // Task errors
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  TASK_NOT_OPEN: 'TASK_NOT_OPEN',
  NOT_OWNER: 'NOT_OWNER',
  CANNOT_UPDATE_PUBLISHED: 'CANNOT_UPDATE_PUBLISHED',
  ALREADY_PUBLISHED: 'ALREADY_PUBLISHED',
  CANNOT_DELETE_PUBLISHED: 'CANNOT_DELETE_PUBLISHED',
  
  // Assignment errors
  CONCURRENCY_CAP: 'CONCURRENCY_CAP',
  NOT_FOUND: 'NOT_FOUND',
  ESCROW_NOT_HELD: 'ESCROW_NOT_HELD',
  DOUBLE_ACCEPTANCE: 'DOUBLE_ACCEPTANCE',
  ALREADY_ACCEPTED: 'ALREADY_ACCEPTED',
  ASSIGNMENT_NOT_FOUND: 'ASSIGNMENT_NOT_FOUND',
  
  // Submission errors
  DUPLICATE_SUBMISSION: 'DUPLICATE_SUBMISSION',
  LATE_SUBMISSION: 'LATE_SUBMISSION',
  QA_FAILED: 'QA_FAILED',
} as const;

export const ErrorMessages: Record<keyof typeof ErrorCodes, string> = {
  // User/Auth errors
  USER_NOT_FOUND: 'User not found',
  USER_NOT_CLIENT: 'User is not a client',
  USER_NOT_WORKER: 'User is not a worker',
  
  // Task errors
  TASK_NOT_FOUND: 'Task not found',
  TASK_NOT_OPEN: 'Task is not open for acceptance',
  NOT_OWNER: 'User is not the owner of this resource',
  CANNOT_UPDATE_PUBLISHED: 'Cannot update a published task',
  ALREADY_PUBLISHED: 'Task is already published',
  CANNOT_DELETE_PUBLISHED: 'Cannot delete a published task',
  
  // Assignment errors
  CONCURRENCY_CAP: 'Worker has reached maximum active assignments (3)',
  NOT_FOUND: 'Resource not found',
  ESCROW_NOT_HELD: 'Escrow funds are not held',
  DOUBLE_ACCEPTANCE: 'Task has already been fully accepted',
  ALREADY_ACCEPTED: 'Worker has already accepted this task',
  ASSIGNMENT_NOT_FOUND: 'Assignment not found',
  
  // Submission errors
  DUPLICATE_SUBMISSION: 'Submission already exists for this assignment',
  LATE_SUBMISSION: 'Submission is past the deadline',
  QA_FAILED: 'Submission failed quality assurance checks',
};

/**
 * Create a standardized error object
 */
export class AppError extends Error {
  constructor(
    public code: keyof typeof ErrorCodes,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(ErrorMessages[code]);
    this.name = 'AppError';
  }
}

/**
 * Error Log Types
 */
export interface CreateErrorLogRequest {
  errorCode: string;
  errorMessage: string;
  errorStack?: string | null;
  endpoint?: string | null;
  method?: string | null;
  userId?: string | null;
  requestBody?: any;
  requestParams?: any;
  requestQuery?: any;
  userAgent?: string | null;
  ipAddress?: string | null;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface ErrorLogResponse {
  id: string;
  errorCode: string;
  errorMessage: string;
  errorStack: string | null;
  endpoint: string | null;
  method: string | null;
  userId: string | null;
  requestBody: any;
  requestParams: any;
  requestQuery: any;
  userAgent: string | null;
  ipAddress: string | null;
  severity: 'info' | 'warning' | 'error' | 'critical';
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ListErrorLogsQuery {
  severity?: 'info' | 'warning' | 'error' | 'critical';
  resolved?: boolean;
  errorCode?: string;
  userId?: string;
  endpoint?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export interface ResolveErrorLogRequest {
  resolvedBy: string;
  notes?: string | null;
}

export interface ErrorStatistics {
  total: number;
  byCode: Array<{
    errorCode: string;
    count: number;
  }>;
  bySeverity: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  byEndpoint: Array<{
    endpoint: string;
    count: number;
  }>;
  resolved: number;
  unresolved: number;
  recentErrors: ErrorLogResponse[];
}
