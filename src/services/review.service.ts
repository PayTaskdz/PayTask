import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { ReviewResponse } from '../types/review.types';
import { solanaService } from './solanaService';
import { taskService } from './task.service';

/**
 * Review Service (Prisma)
 * Handles business logic for submission reviews using Prisma ORM
 * Integrated with Solana payment system
 */
export class ReviewService {
  /**
   * Accept submission and transfer payment to worker
   * Client approves worker's submission -> Transfer USDC from settlement wallet to worker wallet
   */
  async acceptSubmission(
    userId: string,
    data: { submissionId: string; feedback?: string }
  ): Promise<ReviewResponse & { payment?: { signature: string; amount: number } }> {
    console.log('🔵 START acceptSubmission:', { userId, ...data });

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      console.log('🔵 Transaction started');

      // 1. Get submission with task and worker details
      console.log('🔵 Fetching submission:', data.submissionId);
      const submission = await tx.submission.findUnique({
        where: { id: data.submissionId },
        include: {
          assignment: {
            include: {
              task: true,
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
        console.log('❌ Submission NOT_FOUND');
        throw new Error('SUBMISSION_NOT_FOUND');
      }

      // 2. Verify reviewer is the task owner (client)
      console.log('🔵 Verifying reviewer is task owner');
      if (submission.assignment.task.clientId !== userId) {
        console.log('❌ UNAUTHORIZED - Reviewer is not task owner');
        throw new Error('UNAUTHORIZED');
      }

      // 3. Check if submission is already reviewed
      if (submission.status === 'accepted') {
        throw new Error('SUBMISSION_ALREADY_ACCEPTED');
      }

      // 4. Create review with approve decision
      console.log('🔵 Creating review with approve decision');
      const review = await tx.review.create({
        data: {
          submissionId: data.submissionId,
          reviewerId: userId,
          decision: 'approve',
          feedback: data.feedback,
        },
      });

      console.log('🔵 Review created:', review.id);

      // 5. Update submission status to accepted
      console.log('🔵 Updating submission status to accepted');
      await tx.submission.update({
        where: { id: data.submissionId },
        data: { status: 'accepted' },
      });

      // 6. Update assignment status to completed
      console.log('🔵 Updating assignment status to completed');
      await tx.assignment.update({
        where: { id: submission.assignmentId },
        data: { status: 'completed' },
      });

      // 7. Update task status to completed
      console.log('🔵 Updating task status to completed');
      await taskService.updateTaskStatus(submission.assignment.task.id, 'completed');

      // 8. Get worker wallet information
      const worker = await tx.user.findUnique({
        where: { id: submission.assignment.worker.id },
        include: {
          wallet: {
            take: 1,
            where: { isActive: true },
          },
        },
      });

      if (!worker || !worker.wallet || worker.wallet.length === 0) {
        throw new Error('WORKER_WALLET_NOT_FOUND');
      }

      // Extract wallet address from addresses JSON
      const addresses = worker.wallet[0].addresses as any;
      const workerWalletAddress = Object.values(addresses)[0] as string;

      if (!workerWalletAddress) {
        throw new Error('WORKER_WALLET_ADDRESS_NOT_FOUND');
      }

      // 9. Calculate payment amount (reward only, fee stays in settlement wallet)
      const rewardAmount = parseFloat(submission.assignment.task.reward.toString());
      console.log(`💰 Transferring ${rewardAmount} USDC to worker ${workerWalletAddress}`);

      // 10. Transfer USDC from settlement wallet to worker wallet
      let paymentResult;
      try {
        paymentResult = await solanaService.transferToWallet(
          workerWalletAddress,
          rewardAmount
        );
        console.log('✅ Payment transferred:', paymentResult.signature);
      } catch (error: any) {
        console.error('❌ Payment transfer failed:', error);
        throw new Error(`PAYMENT_TRANSFER_FAILED: ${error.message}`);
      }

      // 11. Build response
      const result = {
        id: review.id,
        submissionId: review.submissionId,
        reviewerId: review.reviewerId,
        decision: review.decision,
        feedback: review.feedback,
        createdAt: review.createdAt.toISOString(),
        submission: {
          id: submission.id,
          assignmentId: submission.assignmentId,
          status: 'accepted' as const,
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
        payment: paymentResult,
      };

      console.log('✅ SUCCESS - Submission accepted and payment transferred:', result.id);
      return result;
    });
  }

  /**
   * Reject submission
   * Client rejects worker's submission -> Mark for support review
   * Support will decide: either request fix or initiate refund
   */
  async rejectSubmission(
    userId: string,
    data: { submissionId: string; feedback: string }
  ): Promise<ReviewResponse> {
    console.log('🔵 START rejectSubmission:', { userId, ...data });

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      console.log('🔵 Transaction started');

      // 1. Get submission with task details
      console.log('🔵 Fetching submission:', data.submissionId);
      const submission = await tx.submission.findUnique({
        where: { id: data.submissionId },
        include: {
          assignment: {
            include: {
              task: true,
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
        console.log('❌ Submission NOT_FOUND');
        throw new Error('SUBMISSION_NOT_FOUND');
      }

      // 2. Verify reviewer is the task owner (client)
      console.log('🔵 Verifying reviewer is task owner');
      if (submission.assignment.task.clientId !== userId) {
        console.log('❌ UNAUTHORIZED - Reviewer is not task owner');
        throw new Error('UNAUTHORIZED');
      }

      // 3. Validate feedback requirement for rejection
      if (!data.feedback || data.feedback.trim() === '') {
        console.log('❌ FEEDBACK_REQUIRED for rejection');
        throw new Error('FEEDBACK_REQUIRED');
      }

      // 4. Create review with reject decision
      console.log('🔵 Creating review with reject decision');
      const review = await tx.review.create({
        data: {
          submissionId: data.submissionId,
          reviewerId: userId,
          decision: 'reject',
          feedback: data.feedback,
        },
      });

      console.log('🔵 Review created:', review.id);

      // 5. Update submission status to rejected
      console.log('🔵 Updating submission status to rejected');
      await tx.submission.update({
        where: { id: data.submissionId },
        data: { status: 'rejected' },
      });

      // 6. Build response
      const result: ReviewResponse = {
        id: review.id,
        submissionId: review.submissionId,
        reviewerId: review.reviewerId,
        decision: review.decision,
        feedback: review.feedback,
        createdAt: review.createdAt.toISOString(),
        submission: {
          id: submission.id,
          assignmentId: submission.assignmentId,
          status: 'rejected',
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

      console.log('✅ SUCCESS - Submission rejected, awaiting support decision:', result.id);
      console.log('⚠️ Support should review and decide: request fix OR initiate refund');
      return result;
    });
  }

  /**
   * Refund task to client
   * Support decides that dispute cannot be resolved -> Refund USDC to client
   * Transfer from settlement wallet back to client wallet (reward only, fee is kept)
   */
  async refundTask(
    taskId: string,
    reason: string
  ): Promise<{ success: boolean; refund: { signature: string; amount: number }; taskId: string }> {
    console.log('🔵 START refundTask:', { taskId, reason });

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      console.log('🔵 Transaction started');

      // 1. Get task with client details
      console.log('🔵 Fetching task:', taskId);
      const task = await tx.task.findUnique({
        where: { id: taskId },
        include: {
          client: {
            include: {
              wallet: {
                take: 1,
                where: { isActive: true },
              },
            },
          },
        },
      });

      if (!task) {
        console.log('❌ Task NOT_FOUND');
        throw new Error('TASK_NOT_FOUND');
      }

      // 2. Check task status - should not be completed or already cancelled
      if (task.status === 'completed') {
        throw new Error('TASK_ALREADY_COMPLETED');
      }

      if (task.status === 'cancelled') {
        throw new Error('TASK_ALREADY_CANCELLED');
      }

      // 3. Get client wallet information
      if (!task.client.wallet || task.client.wallet.length === 0) {
        throw new Error('CLIENT_WALLET_NOT_FOUND');
      }

      // Extract wallet address from addresses JSON
      const addresses = task.client.wallet[0].addresses as any;
      const clientWalletAddress = Object.values(addresses)[0] as string;

      if (!clientWalletAddress) {
        throw new Error('CLIENT_WALLET_ADDRESS_NOT_FOUND');
      }

      // 4. Calculate refund amount (reward * qty, fee is NOT refunded)
      const refundAmount = parseFloat(task.reward.toString()) * task.qty;
      console.log(`💰 Refunding ${refundAmount} USDC to client ${clientWalletAddress}`);
      console.log(`ℹ️ Fee is kept by platform (not refunded)`);

      // 5. Transfer USDC from settlement wallet to client wallet
      let refundResult;
      try {
        refundResult = await solanaService.transferToWallet(
          clientWalletAddress,
          refundAmount
        );
        console.log('✅ Refund transferred:', refundResult.signature);
      } catch (error: any) {
        console.error('❌ Refund transfer failed:', error);
        throw new Error(`REFUND_TRANSFER_FAILED: ${error.message}`);
      }

      // 6. Update task status to cancelled
      console.log('🔵 Updating task status to cancelled');
      await taskService.updateTaskStatus(taskId, 'cancelled');

      // 7. Create audit log
      await tx.auditLog.create({
        data: {
          actorId: task.clientId,
          action: 'refund_task',
          details: {
            entityType: 'task',
            entityId: taskId,
            refundAmount: refundAmount,
            signature: refundResult.signature,
            reason: reason,
          },
        },
      });

      console.log('✅ SUCCESS - Task refunded to client');

      return {
        success: true,
        refund: refundResult,
        taskId: task.id,
      };
    });
  }

  /**
   * Get reviews for a submission
   */
  async getReviewsBySubmissionId(submissionId: string): Promise<ReviewResponse[]> {
    console.log('🔵 Getting reviews for submission:', submissionId);

    const reviews = await prisma.review.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((review) => ({
      id: review.id,
      submissionId: review.submissionId,
      reviewerId: review.reviewerId,
      decision: review.decision,
      feedback: review.feedback,
      createdAt: review.createdAt.toISOString(),
    }));
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId: string): Promise<ReviewResponse | null> {
    console.log('🔵 Getting review:', reviewId);

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return null;
    }

    return {
      id: review.id,
      submissionId: review.submissionId,
      reviewerId: review.reviewerId,
      decision: review.decision,
      feedback: review.feedback,
      createdAt: review.createdAt.toISOString(),
    };
  }
}

export const reviewService = new ReviewService();
