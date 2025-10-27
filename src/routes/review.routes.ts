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
        // TODO: Add admin/support role validation here
        // For now, any authenticated user can refund (should be restricted to support/admin)

        const body = request.body as RefundTaskBody;
        const result = await reviewService.refundTask(
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
}

