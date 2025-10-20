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
}

