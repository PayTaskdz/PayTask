import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ratingService } from '../services/rating.service';

interface CreateRatingBody {
  toUserId: string;
  taskId: string;
  score: number;
  comment?: string;
}

interface PaginationQuery {
  page?: number;
  limit?: number;
}

export async function ratingRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/ratings
   * Create a new rating
   */
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new rating',
        tags: ['Ratings'],
        headers: {
          type: 'object',
          properties: {
            'x-user-id': { type: 'string', format: 'uuid' },
          },
          required: ['x-user-id'],
        },
        body: {
          type: 'object',
          required: ['toUserId', 'taskId', 'score'],
          properties: {
            toUserId: { type: 'string', format: 'uuid' },
            taskId: { type: 'string', format: 'uuid' },
            score: { type: 'number', minimum: 1, maximum: 5 },
            comment: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: CreateRatingBody; Headers: { 'x-user-id': string } }>,
      reply: FastifyReply
    ) => {
      try {
        const fromUserId = request.headers['x-user-id'];
        if (!fromUserId) {
          return reply.code(401).send({ error: 'UNAUTHORIZED' });
        }

        const rating = await ratingService.createRating(fromUserId, {
          toUserId: request.body.toUserId,
          taskId: request.body.taskId,
          score: request.body.score,
          comment: request.body.comment || null,
        });
        return reply.code(201).send(rating);
      } catch (error: any) {
        if (error.message === 'TASK_NOT_FOUND' || error.message === 'USER_NOT_FOUND') {
          return reply.code(404).send({ error: error.message });
        }
        if (error.message === 'UNAUTHORIZED') {
          return reply.code(403).send({ error: error.message });
        }
        if (
          error.message === 'DUPLICATE_RATING' ||
          error.message === 'INVALID_SCORE'
        ) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/ratings
   * Get all ratings with pagination
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all ratings with pagination',
        tags: ['Ratings'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: PaginationQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const page = request.query.page || 1;
        const limit = request.query.limit || 20;
        const result = await ratingService.getAllRatings(page, limit);
        return reply.send(result);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/ratings/:id
   * Get rating by ID
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get rating by ID',
        tags: ['Ratings'],
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
        const rating = await ratingService.getRatingById(request.params.id);

        if (!rating) {
          return reply.code(404).send({ error: 'RATING_NOT_FOUND' });
        }

        return reply.send(rating);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/ratings/task/:taskId
   * Get all ratings for a task
   */
  fastify.get(
    '/task/:taskId',
    {
      schema: {
        description: 'Get all ratings for a task',
        tags: ['Ratings'],
        params: {
          type: 'object',
          properties: {
            taskId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { taskId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const ratings = await ratingService.getRatingsByTaskId(request.params.taskId);
        return reply.send(ratings);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/ratings/given-by/:userId
   * Get ratings given by a user
   */
  fastify.get(
    '/given-by/:userId',
    {
      schema: {
        description: 'Get ratings given by a user',
        tags: ['Ratings'],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const ratings = await ratingService.getRatingsGivenByUser(request.params.userId);
        return reply.send(ratings);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/ratings/received-by/:userId
   * Get ratings received by a user
   */
  fastify.get(
    '/received-by/:userId',
    {
      schema: {
        description: 'Get ratings received by a user',
        tags: ['Ratings'],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const ratings = await ratingService.getRatingsReceivedByUser(
          request.params.userId
        );
        return reply.send(ratings);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/ratings/stats/:userId
   * Get worker rating statistics
   */
  fastify.get(
    '/stats/:userId',
    {
      schema: {
        description: 'Get worker rating statistics',
        tags: ['Ratings'],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            includeRecent: { type: 'boolean', default: false },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { userId: string };
        Querystring: { includeRecent?: boolean };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const includeRecent = request.query.includeRecent || false;
        const stats = await ratingService.getWorkerRatingStats(
          request.params.userId,
          includeRecent
        );
        return reply.send(stats);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );
}

