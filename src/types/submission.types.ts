import { z } from 'zod';

// Create submission request schema
export const CreateSubmissionSchema = z.object({
  assignmentId: z.string().uuid('Invalid assignment ID format'),
  payloadUrl: z.string().url('Invalid payload URL'),
  payloadHash: z.string().min(1, 'Payload hash is required'),
  metadata: z
    .object({
      fileSize: z.number().positive('File size must be positive'),
      fileName: z.string().min(1, 'File name is required'),
      mimeType: z.string().min(1, 'MIME type is required'),
    })
    .optional(),
});

export type CreateSubmissionRequest = z.infer<typeof CreateSubmissionSchema>;

// QA Flags
export interface QAFlags {
  passed: boolean;
  checks: {
    completeness: boolean;
    duplicate: boolean;
    format: boolean;
    size: boolean;
  };
  errors?: string[];
}

// Submission response
export interface SubmissionResponse {
  id: string;
  assignmentId: string;
  payloadUrl: string;
  payloadHash: string;
  qaFlags: QAFlags;
  status: string;
  submittedAt: string;
  earlySubmission: boolean;
  hoursEarly?: number;
  bonusPoints?: number;
}

export interface CreateSubmissionResponse {
  success: boolean;
  message: string;
  data: SubmissionResponse;
}

