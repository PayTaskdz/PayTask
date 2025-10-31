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

    // Step 1: Get submission and validate (outside transaction)
    const submissionCheck = await prisma.submission.findUnique({
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

    if (!submissionCheck) {
      throw new Error('SUBMISSION_NOT_FOUND');
    }

    if (submissionCheck.assignment.task.clientId !== userId) {
      throw new Error('UNAUTHORIZED');
    }

    if (submissionCheck.status === 'accepted') {
      throw new Error('SUBMISSION_ALREADY_ACCEPTED');
    }

    // Step 2: Get worker wallet (outside transaction)
    const worker = await prisma.user.findUnique({
      where: { id: submissionCheck.assignment.worker.id },
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

    const addresses = worker.wallet[0].addresses as any;
    const workerWalletAddress = Object.values(addresses)[0] as string;

    if (!workerWalletAddress) {
      throw new Error('WORKER_WALLET_ADDRESS_NOT_FOUND');
    }

    // Step 3: Execute payment BEFORE database transaction (critical!)
    const rewardAmount = parseFloat(submissionCheck.assignment.task.reward.toString());
    console.log(`💰 Transferring ${rewardAmount} USDC to worker ${workerWalletAddress}`);

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

    // Step 4: Update database in fast transaction (no external calls)
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      console.log('🔵 Database transaction started');

      // Get fresh submission data
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
        throw new Error('SUBMISSION_NOT_FOUND');
      }

      // Create review
      const review = await tx.review.create({
        data: {
          submissionId: data.submissionId,
          reviewerId: userId,
          decision: 'approve',
          feedback: data.feedback,
        },
      });

      // Update submission status
      await tx.submission.update({
        where: { id: data.submissionId },
        data: { status: 'accepted' },
      });

      // Update assignment status
      await tx.assignment.update({
        where: { id: submission.assignmentId },
        data: { status: 'completed' },
      });

      // Check if all assignments completed
      const taskId = submission.assignment.task.id;
      const taskQty = submission.assignment.task.qty;
      
      const completedAssignmentsCount = await tx.assignment.count({
        where: {
          taskId: taskId,
          status: 'completed',
        },
      });

      console.log(`🔵 Task ${taskId}: ${completedAssignmentsCount}/${taskQty} assignments completed`);

      // Update task status if all done
      if (completedAssignmentsCount >= taskQty) {
        console.log('✅ All assignments completed!');
        await tx.task.update({
          where: { id: taskId },
          data: { status: 'completed' },
        });
      }

      // Create notification for worker
      await tx.notification.create({
        data: {
          toUserId: submission.assignment.worker.id,
          type: 'SUBMISSION_ACCEPTED',
          content: `Your submission for "${submission.assignment.task.title}" has been accepted! Payment of ${rewardAmount} USDC has been transferred to your wallet.`,
          status: 'pending',
          meta: {
            submissionId: submission.id,
            taskId: submission.assignment.task.id,
            taskTitle: submission.assignment.task.title,
            reviewId: review.id,
            paymentAmount: rewardAmount,
            paymentSignature: paymentResult.signature,
            walletAddress: workerWalletAddress,
            acceptedAt: new Date().toISOString(),
            feedback: data.feedback,
          },
        },
      });

      return {
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
    });

    console.log('✅ SUCCESS - Submission accepted and payment transferred');
    return result;
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

      // 6. Create notifications for worker and client
      console.log('🔵 Creating notifications for worker and client');
      
      // Notification for worker
      await tx.notification.create({
        data: {
          toUserId: submission.assignment.worker.id,
          type: 'SUBMISSION_REJECTED',
          content: `Your submission for "${submission.assignment.task.title}" has been rejected by the client.`,
          status: 'pending',
          meta: {
            submissionId: submission.id,
            taskId: submission.assignment.task.id,
            taskTitle: submission.assignment.task.title,
            rejectionReason: data.feedback,
            reviewId: review.id,
            rejectedAt: new Date().toISOString(),
          },
        },
      });

      // Notification for client (confirmation)
      await tx.notification.create({
        data: {
          toUserId: submission.assignment.task.clientId,
          type: 'SUBMISSION_REJECTED_CONFIRMED',
          content: `Submission for "${submission.assignment.task.title}" has been rejected. Admin will review for refund decision.`,
          status: 'pending',
          meta: {
            submissionId: submission.id,
            taskId: submission.assignment.task.id,
            taskTitle: submission.assignment.task.title,
            workerId: submission.assignment.worker.id,
            workerEmail: submission.assignment.worker.email,
            rejectionReason: data.feedback,
            reviewId: review.id,
            rejectedAt: new Date().toISOString(),
            nextAction: 'ADMIN_REVIEW_PENDING',
          },
        },
      });

      console.log('✅ Notifications created for worker and client');

      // 7. Build response
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
   * Only admin can perform refund
   */
  async refundTask(
    adminUserId: string,
    taskId: string,
    reason: string
  ): Promise<{ success: boolean; refund: { signature: string; amount: number }; taskId: string }> {
    console.log('🔵 START refundTask:', { adminUserId, taskId, reason });

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      console.log('🔵 Transaction started');

      // 1. Verify admin user
      console.log('🔵 Verifying admin user:', adminUserId);
      const adminUser = await tx.user.findUnique({
        where: { id: adminUserId },
      });

      if (!adminUser) {
        console.log('❌ User NOT_FOUND');
        throw new Error('USER_NOT_FOUND');
      }

      if (adminUser.role !== 'admin') {
        console.log('❌ UNAUTHORIZED - User is not admin');
        throw new Error('UNAUTHORIZED_ONLY_ADMIN_CAN_REFUND');
      }

      // 2. Get task with client details
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

      // 3. Check task status - should not be completed or already cancelled
      if (task.status === 'completed') {
        throw new Error('TASK_ALREADY_COMPLETED');
      }

      if (task.status === 'cancelled') {
        throw new Error('TASK_ALREADY_CANCELLED');
      }

      // 4. Get client wallet information
      if (!task.client.wallet || task.client.wallet.length === 0) {
        throw new Error('CLIENT_WALLET_NOT_FOUND');
      }

      // Extract wallet address from addresses JSON
      const addresses = task.client.wallet[0].addresses as any;
      const clientWalletAddress = Object.values(addresses)[0] as string;

      if (!clientWalletAddress) {
        throw new Error('CLIENT_WALLET_ADDRESS_NOT_FOUND');
      }

      // 5. Calculate refund amount (reward * qty, fee is NOT refunded)
      const refundAmount = parseFloat(task.reward.toString()) * task.qty;
      console.log(`💰 Refunding ${refundAmount} USDC to client ${clientWalletAddress}`);
      console.log(`ℹ️ Fee is kept by platform (not refunded)`);

      // 6. Transfer USDC from settlement wallet to client wallet
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
          actorId: adminUserId,
          action: 'refund_task',
          details: {
            entityType: 'task',
            entityId: taskId,
            refundAmount: refundAmount,
            signature: refundResult.signature,
            reason: reason,
            refundedBy: adminUserId,
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
