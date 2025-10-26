import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { errorLogService } from '../services/errorlog.service';

interface CreateErrorLogBody {
  errorCode: string;
  errorMessage: string;
  errorStack?: string;
  endpoint?: string;
  method?: string;
  userId?: string;
  requestBody?: any;
  requestParams?: any;
  requestQuery?: any;
  userAgent?: string;
  ipAddress?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

interface ListErrorLogsQuery {
  page?: number;
  limit?: number;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  resolved?: boolean;
  errorCode?: string;
  userId?: string;
  endpoint?: string;
  startDate?: string;
  endDate?: string;
}

interface ResolveErrorLogBody {
  resolvedBy: string;
  notes?: string;
}

export async function errorlogRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/errorlogs
   * Create a new error log
   */
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new error log',
        tags: ['Error Logs'],
        body: {
          type: 'object',
          required: ['errorCode', 'errorMessage'],
          properties: {
            errorCode: { type: 'string' },
            errorMessage: { type: 'string' },
            errorStack: { type: 'string' },
            endpoint: { type: 'string' },
            method: { type: 'string' },
            userId: { type: 'string', format: 'uuid' },
            requestBody: {},
            requestParams: {},
            requestQuery: {},
            userAgent: { type: 'string' },
            ipAddress: { type: 'string' },
            severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: CreateErrorLogBody }>,
      reply: FastifyReply
    ) => {
      try {
        const errorLog = await errorLogService.createErrorLog(request.body);
        return reply.code(201).send(errorLog);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/errorlogs
   * List error logs with filters
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'List error logs with filters',
        tags: ['Error Logs'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
            resolved: { type: 'boolean' },
            errorCode: { type: 'string' },
            userId: { type: 'string', format: 'uuid' },
            endpoint: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: ListErrorLogsQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const query = {
          page: request.query.page || 1,
          limit: request.query.limit || 20,
          ...request.query,
        };
        const result = await errorLogService.listErrorLogs(query as any);
        return reply.send(result);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/errorlogs/statistics
   * Get error statistics
   */
  fastify.get(
    '/statistics',
    {
      schema: {
        description: 'Get error statistics',
        tags: ['Error Logs'],
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const stats = await errorLogService.getErrorStatistics(request.query);
        return reply.send(stats);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/errorlogs/:id
   * Get error log by ID
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get error log by ID',
        tags: ['Error Logs'],
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
        const errorLog = await errorLogService.getErrorLogById(request.params.id);

        if (!errorLog) {
          return reply.code(404).send({ error: 'ERROR_LOG_NOT_FOUND' });
        }

        return reply.send(errorLog);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * PATCH /api/errorlogs/:id/resolve
   * Resolve an error log
   */
  fastify.patch(
    '/:id/resolve',
    {
      schema: {
        description: 'Resolve an error log',
        tags: ['Error Logs'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['resolvedBy'],
          properties: {
            resolvedBy: { type: 'string', format: 'uuid' },
            notes: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: ResolveErrorLogBody }>,
      reply: FastifyReply
    ) => {
      try {
        const errorLog = await errorLogService.resolveErrorLog(
          request.params.id,
          request.body
        );
        return reply.send(errorLog);
      } catch (error: any) {
        if (error.message === 'ERROR_LOG_NOT_FOUND') {
          return reply.code(404).send({ error: error.message });
        }
        if (error.message === 'ERROR_ALREADY_RESOLVED') {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * DELETE /api/errorlogs/cleanup
   * Delete old error logs
   */
  fastify.delete(
    '/cleanup',
    {
      schema: {
        description: 'Delete old error logs',
        tags: ['Error Logs'],
        querystring: {
          type: 'object',
          properties: {
            daysOld: { type: 'integer', default: 30 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { daysOld?: number } }>,
      reply: FastifyReply
    ) => {
      try {
        const daysOld = request.query.daysOld || 30;
        const count = await errorLogService.deleteOldLogs(daysOld);
        return reply.send({ message: `Deleted ${count} old error logs`, count });
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );
}

