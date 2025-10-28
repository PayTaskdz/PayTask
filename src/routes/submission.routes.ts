import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { submissionService } from '../services/submission.service';
import { CreateSubmissionSchema } from '../types/submission.types';

export async function submissionRoutes(fastify: FastifyInstance) {
  // Create Submission
  fastify.post(
    '/create',
    {
      schema: {
        description: 'Submit completed work for an assignment',
        tags: ['Submissions'],
        body: {
          type: 'object',
          required: ['assignmentId', 'payloadUrl', 'payloadHash'],
          properties: {
            assignmentId: {
              type: 'string',
              format: 'uuid',
              description: 'Assignment ID',
            },
            payloadUrl: {
              type: 'string',
              format: 'uri',
              description: 'URL to submission file',
            },
            payloadHash: {
              type: 'string',
              description: 'SHA256 hash of file (format: sha256:...)',
            },
            metadata: {
              type: 'object',
              properties: {
                fileSize: {
                  type: 'number',
                  description: 'File size in bytes',
                },
                fileName: {
                  type: 'string',
                  description: 'Original file name',
                },
                mimeType: {
                  type: 'string',
                  description: 'MIME type of file',
                },
              },
            },
          },
        },
        response: {
          201: {
            description: 'Submission created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  assignmentId: { type: 'string' },
                  payloadUrl: { type: 'string' },
                  payloadHash: { type: 'string' },
                  qaFlags: {
                    type: 'object',
                    properties: {
                      passed: { type: 'boolean' },
                      checks: {
                        type: 'object',
                        properties: {
                          completeness: { type: 'boolean' },
                          duplicate: { type: 'boolean' },
                          format: { type: 'boolean' },
                          size: { type: 'boolean' },
                        },
                      },
                    },
                  },
                  status: { type: 'string' },
                  submittedAt: { type: 'string' },
                  earlySubmission: { type: 'boolean' },
                  hoursEarly: { type: 'number' },
                  bonusPoints: { type: 'number' },
                },
              },
            },
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: { type: 'string' },
                  details: { type: 'object' },
                },
              },
            },
          },
          404: {
            description: 'Assignment not found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
          409: {
            description: 'Duplicate submission',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          assignmentId: string;
          payloadUrl: string;
          payloadHash: string;
          metadata?: {
            fileSize: number;
            fileName: string;
            mimeType: string;
          };
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        // Validate request body
        const validatedData = CreateSubmissionSchema.parse(request.body);

        fastify.log.info(`Creating submission for assignment ${validatedData.assignmentId}`);
        fastify.log.info(`Payload URL: ${validatedData.payloadUrl}`);
        fastify.log.info(`Payload Hash: ${validatedData.payloadHash}`);
        if (validatedData.metadata) {
          fastify.log.info(`Metadata: ${JSON.stringify(validatedData.metadata)}`);
        }

        // Create submission
        const submission = await submissionService.createSubmission(
          validatedData.assignmentId,
          validatedData.payloadUrl,
          validatedData.payloadHash,
          validatedData.metadata
        );

        fastify.log.info(`Submission created successfully: ${submission.id}`);

        return reply.code(201).send({
          success: true,
          message: 'Submission created successfully',
          data: submission,
        });
      } catch (error: any) {
        fastify.log.error('Error creating submission:', error);
        fastify.log.error('Error message:', error.message);
        fastify.log.error('Error stack:', error.stack);

        // Handle custom errors
        if (error.message === 'ASSIGNMENT_NOT_FOUND') {
          return reply.code(404).send({
            success: false,
            error: {
              message: 'Assignment not found',
              code: 'ASSIGNMENT_NOT_FOUND',
            },
          });
        }

        if (error.message === 'DUPLICATE_SUBMISSION') {
          return reply.code(409).send({
            success: false,
            error: {
              message: 'This assignment already has a submission',
              code: 'DUPLICATE_SUBMISSION',
            },
          });
        }

        if (error.message === 'LATE_SUBMISSION') {
          return reply.code(400).send({
            success: false,
            error: {
              message: 'Submission deadline has passed',
              code: 'LATE_SUBMISSION',
              details: {
                hint: 'Accept a new task with a valid deadline',
              },
            },
          });
        }

        if (error.message === 'QA_FAILED') {
          return reply.code(400).send({
            success: false,
            error: {
              message: 'Submission failed quality checks',
              code: 'QA_FAILED',
              details: {
                hint: 'Check fileSize (must be > 0), mimeType (must be in allowed list), size (must be <= 100MB), and hash format (must start with sha256:)',
              },
            },
          });
        }

        // Validation error
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            success: false,
            error: {
              message: 'Invalid request data',
              code: 'VALIDATION_ERROR',
              details: error.errors,
            },
          });
        }

        // Generic error
        return reply.code(500).send({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  );

  // Get Submission by ID
  fastify.get(
    '/:submissionId',
    {
      schema: {
        description: 'Get submission details by ID',
        tags: ['Submissions'],
        params: {
          type: 'object',
          required: ['submissionId'],
          properties: {
            submissionId: {
              type: 'string',
              format: 'uuid',
              description: 'Submission ID',
            },
          },
        },
        response: {
          200: {
            description: 'Submission found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
          404: {
            description: 'Submission not found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { submissionId: string } }>, reply: FastifyReply) => {
      try {
        const { submissionId } = request.params;
        const submission = await submissionService.getSubmissionById(submissionId);

        if (!submission) {
          return reply.code(404).send({
            success: false,
            error: {
              message: 'Submission not found',
              code: 'NOT_FOUND',
            },
          });
        }

        return reply.code(200).send({
          success: true,
          data: submission,
        });
      } catch (error: any) {
        fastify.log.error('Error getting submission:', error);
        return reply.code(500).send({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  );

  /**
   * POST /api/submissions/:id/request-fix
   * Request worker to fix and resubmit (Admin only)
   */
  fastify.post<{ 
    Params: { id: string };
    Body: { feedback: string };
  }>(
    '/:id/request-fix',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Request worker to fix and resubmit the submission (Admin only)',
        tags: ['Submissions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['feedback'],
          properties: {
            feedback: { 
              type: 'string',
              minLength: 10,
              description: 'Detailed feedback on what needs to be fixed',
            },
          },
        },
        response: {
          200: {
            description: 'Fix request sent successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  submissionId: { type: 'string' },
                  status: { type: 'string' },
                  feedback: { type: 'string' },
                  workerNotificationId: { type: 'string' },
                  clientNotificationId: { type: 'string' },
                },
              },
            },
          },
          403: {
            description: 'Forbidden - Admin only',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          404: {
            description: 'Submission not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id: submissionId } = request.params;
        const { feedback } = request.body;
        const userId = request.user.userId;
        const userRole = request.user.role;

        // Check authorization: only admin can request fix
        if (userRole !== 'admin') {
          return reply.code(403).send({
            error: 'UNAUTHORIZED',
            message: 'Only admin can request submission fix',
          });
        }

        // Get submission with task and worker details
        const submission = await fastify.prisma.submission.findUnique({
          where: { id: submissionId },
          include: {
            assignment: {
              include: {
                task: {
                  select: {
                    id: true,
                    title: true,
                    clientId: true,
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
          },
        });

        if (!submission) {
          return reply.code(404).send({ 
            error: 'SUBMISSION_NOT_FOUND',
            message: 'Submission not found',
          });
        }

        // Check if submission is in a fixable state (rejected or submitted)
        if (submission.status !== 'rejected' && submission.status !== 'submitted') {
          return reply.code(400).send({
            error: 'INVALID_STATUS',
            message: `Cannot request fix for submission with status: ${submission.status}`,
          });
        }

        // Update submission status to fix_requested
        const updatedSubmission = await fastify.prisma.submission.update({
          where: { id: submissionId },
          data: { status: 'fix_requested' },
        });

        // Create notification for worker
        const workerNotification = await fastify.prisma.notification.create({
          data: {
            toUserId: submission.assignment.worker.id,
            type: 'SUBMISSION_FIX_REQUESTED',
            content: `Admin requested you to fix and resubmit your work on task "${submission.assignment.task.title}"`,
            status: 'pending',
            meta: {
              submissionId: submissionId,
              taskId: submission.assignment.task.id,
              taskTitle: submission.assignment.task.title,
              feedback: feedback,
              requestedBy: userId,
              requestedAt: new Date().toISOString(),
            },
          },
        });

        // Create notification for client
        const clientNotification = await fastify.prisma.notification.create({
          data: {
            toUserId: submission.assignment.task.clientId,
            type: 'SUBMISSION_FIX_REQUESTED_CLIENT',
            content: `Admin requested worker to fix submission for task "${submission.assignment.task.title}"`,
            status: 'pending',
            meta: {
              submissionId: submissionId,
              taskId: submission.assignment.task.id,
              taskTitle: submission.assignment.task.title,
              workerId: submission.assignment.worker.id,
              workerUsername: submission.assignment.worker.username,
              feedback: feedback,
              requestedBy: userId,
              requestedAt: new Date().toISOString(),
            },
          },
        });

        // Create audit log
        await fastify.prisma.auditLog.create({
          data: {
            actorId: userId,
            action: 'request_submission_fix',
            details: {
              submissionId: submissionId,
              taskId: submission.assignment.task.id,
              workerId: submission.assignment.worker.id,
              clientId: submission.assignment.task.clientId,
              feedback: feedback,
              previousStatus: submission.status,
              newStatus: 'fix_requested',
            },
          },
        });

        fastify.log.info(`Admin ${userId} requested fix for submission ${submissionId}`);

        return reply.code(200).send({
          success: true,
          message: 'Fix request sent to worker and client successfully',
          data: {
            submissionId: updatedSubmission.id,
            status: updatedSubmission.status,
            feedback: feedback,
            workerNotificationId: workerNotification.id,
            clientNotificationId: clientNotification.id,
            worker: {
              id: submission.assignment.worker.id,
              email: submission.assignment.worker.email,
              username: submission.assignment.worker.username,
            },
            client: {
              id: submission.assignment.task.clientId,
            },
          },
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Error requesting submission fix');
        return reply.code(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to request submission fix',
        });
      }
    }
  );
}

