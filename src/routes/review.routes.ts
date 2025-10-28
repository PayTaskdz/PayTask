import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { reviewService } from '../services/review.service';

interface AcceptSubmissionBody {
  submissionId: string;
  feedback?: string;
}

interface RejectSubmissionBody {
  submissionId: string;
  feedback: string;
}

interface RefundTaskBody {
  taskId: string;
  reason: string;
}

export async function reviewRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/reviews/accept
   * Accept submission and transfer payment to worker
   */
  fastify.post(
    '/accept',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Accept submission and transfer payment to worker',
        tags: ['Reviews'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['submissionId'],
          properties: {
            submissionId: { type: 'string', format: 'uuid' },
            feedback: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.userId;

        const body = request.body as AcceptSubmissionBody;
        const result = await reviewService.acceptSubmission(userId, {
          submissionId: body.submissionId,
          feedback: body.feedback,
        });
        return reply.code(201).send(result);
      } catch (error: any) {
        if (error.message === 'SUBMISSION_NOT_FOUND') {
          return reply.code(404).send({ error: error.message });
        }
        if (error.message === 'UNAUTHORIZED') {
          return reply.code(403).send({ error: error.message });
        }
        if (
          error.message === 'SUBMISSION_ALREADY_ACCEPTED' ||
          error.message.includes('WALLET_NOT_FOUND') ||
          error.message.includes('PAYMENT_TRANSFER_FAILED')
        ) {
          return reply.code(400).send({ error: error.message });
        }
        console.error('Error accepting submission:', error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * POST /api/reviews/reject
   * Reject submission (will be reviewed by support)
   */
  fastify.post(
    '/reject',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Reject submission - awaiting support decision',
        tags: ['Reviews'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['submissionId', 'feedback'],
          properties: {
            submissionId: { type: 'string', format: 'uuid' },
            feedback: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.userId;

        const body = request.body as RejectSubmissionBody;
        const result = await reviewService.rejectSubmission(userId, {
          submissionId: body.submissionId,
          feedback: body.feedback,
        });
        return reply.code(201).send(result);
      } catch (error: any) {
        if (error.message === 'SUBMISSION_NOT_FOUND') {
          return reply.code(404).send({ error: error.message });
        }
        if (error.message === 'UNAUTHORIZED') {
          return reply.code(403).send({ error: error.message });
        }
        if (error.message === 'FEEDBACK_REQUIRED') {
          return reply.code(400).send({ error: error.message });
        }
        console.error('Error rejecting submission:', error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * POST /api/reviews/refund
   * Refund task to client (Support/Admin only)
   */
  fastify.post(
    '/refund',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Refund task to client - Support/Admin only',
        tags: ['Reviews'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['taskId', 'reason'],
          properties: {
            taskId: { type: 'string', format: 'uuid' },
            reason: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Admin role validation
        if (request.user.role !== 'admin') {
          return reply.code(403).send({ 
            error: 'UNAUTHORIZED_ONLY_ADMIN_CAN_REFUND',
            message: 'Only admin users can perform refunds'
          });
        }

        const body = request.body as RefundTaskBody;
        const result = await reviewService.refundTask(
          request.user.userId,
          body.taskId,
          body.reason
        );
        return reply.code(200).send(result);
      } catch (error: any) {
        if (error.message === 'TASK_NOT_FOUND') {
          return reply.code(404).send({ error: error.message });
        }
        if (
          error.message === 'TASK_ALREADY_COMPLETED' ||
          error.message === 'TASK_ALREADY_CANCELLED' ||
          error.message.includes('WALLET_NOT_FOUND') ||
          error.message.includes('REFUND_TRANSFER_FAILED')
        ) {
          return reply.code(400).send({ error: error.message });
        }
        console.error('Error refunding task:', error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/reviews/:id
   * Get review by ID
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get review by ID',
        tags: ['Reviews'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const review = await reviewService.getReviewById(request.params.id);

        if (!review) {
          return reply.code(404).send({ error: 'REVIEW_NOT_FOUND' });
        }

        return reply.send(review);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/reviews/submission/:submissionId
   * Get all reviews for a submission
   */
  fastify.get(
    '/submission/:submissionId',
    {
      schema: {
        description: 'Get all reviews for a submission',
        tags: ['Reviews'],
        params: {
          type: 'object',
          properties: {
            submissionId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { submissionId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const reviews = await reviewService.getReviewsBySubmissionId(
          request.params.submissionId
        );
        return reply.send(reviews);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/reviews/admin/pending-refunds
   * Get all rejected submissions pending admin review (Admin only)
   */
  fastify.get(
    '/admin/pending-refunds',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get all rejected submissions pending admin review',
        tags: ['Reviews'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Admin role validation
        if (request.user.role !== 'admin') {
          return reply.code(403).send({
            error: 'UNAUTHORIZED_ADMIN_ONLY',
            message: 'Only admin users can view pending refunds',
          });
        }

        // Get all rejected submissions from tasks that are still active
        const rejectedSubmissions = await fastify.prisma.submission.findMany({
          where: {
            status: 'rejected',
            assignment: {
              task: {
                status: { in: ['active', 'open'] }, // Only active tasks
              },
            },
          },
          include: {
            assignment: {
              include: {
                task: {
                  include: {
                    client: {
                      select: {
                        id: true,
                        email: true,
                        username: true,
                      },
                    },
                  },
                },
                worker: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                  },
                },
              },
            },
            reviews: {
              where: { decision: 'reject' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: {
            submittedAt: 'desc',
          },
        });

        // Format response
        const pendingReviews = rejectedSubmissions.map((submission) => ({
          submissionId: submission.id,
          status: submission.status,
          payloadUrl: submission.payloadUrl,
          submittedAt: submission.submittedAt,
          task: {
            id: submission.assignment.task.id,
            title: submission.assignment.task.title,
            description: submission.assignment.task.description,
            reward: submission.assignment.task.reward.toString(),
            qty: submission.assignment.task.qty,
            deadline: submission.assignment.task.deadline,
            status: submission.assignment.task.status,
          },
          client: {
            id: submission.assignment.task.client.id,
            email: submission.assignment.task.client.email,
            username: submission.assignment.task.client.username,
          },
          worker: {
            id: submission.assignment.worker.id,
            email: submission.assignment.worker.email,
            username: submission.assignment.worker.username,
          },
          rejection: {
            reviewId: submission.reviews[0]?.id,
            feedback: submission.reviews[0]?.feedback,
            rejectedAt: submission.reviews[0]?.createdAt,
          },
          suggestedActions: [
            {
              action: 'REFUND',
              description: 'Refund the task amount to client',
              endpoint: 'POST /api/reviews/refund',
              payload: {
                taskId: submission.assignment.task.id,
                reason: 'Approved by admin after review',
              },
            },
            {
              action: 'REQUEST_FIX',
              description: 'Request worker to fix and resubmit',
              endpoint: 'POST /api/submissions/:id/request-fix',
              payload: {
                feedback: 'Please address the issues mentioned in the review',
              },
            },
          ],
        }));

        return reply.send({
          total: pendingReviews.length,
          pendingRefunds: pendingReviews,
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Error getting pending refunds');
        return reply.code(500).send({ error: error.message });
      }
    }
  );
}

