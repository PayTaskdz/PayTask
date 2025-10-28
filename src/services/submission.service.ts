import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { QAFlags } from '../types/submission.types';

export class SubmissionService {
  /**
   * Create submission for an assignment
   */
  async createSubmission(
    assignmentId: string,
    payloadUrl: string,
    payloadHash: string,
    metadata?: {
      fileSize: number;
      fileName: string;
      mimeType: string;
    }
  ) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Get assignment with task
      const assignment = await tx.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          task: true,
          worker: {
            include: {
              workerProfile: true,
            },
          },
          submission: true,
        },
      });

      if (!assignment) {
        throw new Error('ASSIGNMENT_NOT_FOUND');
      }

      // 2. Check if already submitted
      if (assignment.submission) {
        throw new Error('DUPLICATE_SUBMISSION');
      }

      // 3. Check if late
      const now = new Date();
      const dueAt = assignment.dueAt;
      const isLate = dueAt && now > dueAt;

      if (isLate) {
        throw new Error('LATE_SUBMISSION');
      }

      // 4. Run QA checks
      const qaFlags = await this.runQAChecks(payloadUrl, payloadHash, metadata);

      if (!qaFlags.passed) {
        throw new Error('QA_FAILED');
      }

      // 5. Calculate early submission bonus
      const earlyBonus = this.calculateEarlyBonus(assignment.startedAt, dueAt, now);

      // 6. Create submission
      const submission = await tx.submission.create({
        data: {
          assignmentId: assignmentId,
          payloadUrl: payloadUrl,
          payloadHash: payloadHash,
          qaFlags: qaFlags as any,
          status: 'submitted',
        },
      });

      // 7. Update worker profile if early submission
      if (earlyBonus.isEarly && assignment.worker.workerProfile) {
        await tx.workerProfile.update({
          where: { userId: assignment.workerId },
          data: {
            earlySubmissions: {
              increment: 1,
            },
            reputation: {
              increment: earlyBonus.bonusPoints || 0,
            },
          },
        });
      }

      // 8. Update assignment status
      await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          status: 'completed',
        },
      });

      // 9. Create notification for client
      await tx.notification.create({
        data: {
          toUserId: assignment.task.clientId,
          type: 'SUBMISSION_CREATED',
          content: `New submission received for task "${assignment.task.title}" from ${assignment.worker.username || assignment.worker.email}`,
          status: 'pending',
          meta: {
            submissionId: submission.id,
            assignmentId: assignmentId,
            taskId: assignment.task.id,
            taskTitle: assignment.task.title,
            workerId: assignment.workerId,
            workerUsername: assignment.worker.username,
            workerEmail: assignment.worker.email,
            submittedAt: submission.submittedAt.toISOString(),
            earlySubmission: earlyBonus.isEarly,
            hoursEarly: earlyBonus.hoursEarly,
            bonusPoints: earlyBonus.bonusPoints,
          },
        },
      });

      return {
        id: submission.id,
        assignmentId: submission.assignmentId,
        payloadUrl: submission.payloadUrl,
        payloadHash: submission.payloadHash,
        qaFlags: submission.qaFlags as unknown as QAFlags,
        status: submission.status,
        submittedAt: submission.submittedAt.toISOString(),
        earlySubmission: earlyBonus.isEarly,
        hoursEarly: earlyBonus.hoursEarly,
        bonusPoints: earlyBonus.bonusPoints,
      };
    });
  }

  /**
   * Run QA checks on submission
   */
  private async runQAChecks(
    _payloadUrl: string,
    payloadHash: string,
    metadata?: {
      fileSize: number;
      fileName: string;
      mimeType: string;
    }
  ): Promise<QAFlags> {
    const checks = {
      completeness: true,
      duplicate: false,
      format: true,
      size: true,
    };
    const errors: string[] = [];

    // Check 1: Completeness - File not empty
    if (metadata && metadata.fileSize === 0) {
      checks.completeness = false;
      errors.push('File is empty');
    }

    // Check 2: Duplicate - Check if hash already exists
    const existingSubmission = await prisma.submission.findFirst({
      where: { payloadHash: payloadHash },
    });
    if (existingSubmission) {
      checks.duplicate = true;
      errors.push('Duplicate submission detected');
    }

    // Check 3: Format - Basic validation
    if (metadata) {
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'image/jpeg',
        'image/png',
        'audio/mpeg',
        'video/mp4',
        'application/zip',
      ];
      if (!allowedTypes.includes(metadata.mimeType)) {
        checks.format = false;
        errors.push('Unsupported file format');
      }
    }

    // Check 4: Size - Max 100MB
    if (metadata && metadata.fileSize > 100 * 1024 * 1024) {
      checks.size = false;
      errors.push('File size exceeds 100MB limit');
    }

    // Check 5: Hash validation - Ensure it's valid
    if (!payloadHash.startsWith('sha256:')) {
      errors.push('Invalid hash format (must start with sha256:)');
    }

    const passed =
      checks.completeness && !checks.duplicate && checks.format && checks.size && errors.length === 0;

    return {
      passed,
      checks,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Calculate early submission bonus
   */
  private calculateEarlyBonus(
    startedAt: Date | null,
    dueAt: Date | null,
    submittedAt: Date
  ): {
    isEarly: boolean;
    hoursEarly?: number;
    bonusPoints?: number;
  } {
    if (!dueAt || !startedAt) {
      return { isEarly: false };
    }

    const hoursEarly = (dueAt.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);

    if (hoursEarly > 0) {
      // Early submission bonus: 0.1 point per hour early (capped at 5.0)
      const rawBonus = Math.round(hoursEarly * 0.1 * 10) / 10; // Round to 1 decimal
      const bonusPoints = Math.min(rawBonus, 5.0); // Cap at 5.0 points

      return {
        isEarly: true,
        hoursEarly: Math.round(hoursEarly * 10) / 10,
        bonusPoints,
      };
    }

    return { isEarly: false };
  }

  /**
   * Get submission by ID
   */
  async getSubmissionById(submissionId: string) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                reward: true,
              },
            },
            worker: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      return null;
    }

    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      payloadUrl: submission.payloadUrl,
      payloadHash: submission.payloadHash,
      qaFlags: submission.qaFlags as unknown as QAFlags,
      status: submission.status,
      submittedAt: submission.submittedAt.toISOString(),
      assignment: {
        id: submission.assignment.id,
        taskId: submission.assignment.taskId,
        workerId: submission.assignment.workerId,
        status: submission.assignment.status,
        task: {
          id: submission.assignment.task.id,
          title: submission.assignment.task.title,
          reward: submission.assignment.task.reward.toString(),
        },
        worker: {
          id: submission.assignment.worker.id,
          email: submission.assignment.worker.email,
        },
      },
    };
  }
}

export const submissionService = new SubmissionService();

