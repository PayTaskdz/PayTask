import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import {
  CreateErrorLogRequest,
  ErrorLogResponse,
  ListErrorLogsQuery,
  ResolveErrorLogRequest,
  ErrorStatistics,
} from '../types/errors.types';

/**
 * Error Log Service
 * Handles error logging and monitoring using Prisma
 */
export class ErrorLogService {
  /**
   * Create error log
   */
  async createErrorLog(data: CreateErrorLogRequest): Promise<ErrorLogResponse> {
    console.log('🔵 Creating error log:', data.errorCode);

    const errorLog = await prisma.errorLog.create({
      data: {
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        errorStack: data.errorStack,
        endpoint: data.endpoint,
        method: data.method,
        userId: data.userId,
        requestBody: data.requestBody as any,
        requestParams: data.requestParams as any,
        requestQuery: data.requestQuery as any,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        severity: data.severity || 'error',
      },
    });

    return this.formatErrorLog(errorLog);
  }

  /**
   * Get error log by ID
   */
  async getErrorLogById(id: string): Promise<ErrorLogResponse | null> {
    console.log('🔵 Getting error log:', id);

    const errorLog = await prisma.errorLog.findUnique({
      where: { id },
    });

    if (!errorLog) {
      return null;
    }

    return this.formatErrorLog(errorLog);
  }

  /**
   * List error logs with filters
   */
  async listErrorLogs(query: ListErrorLogsQuery) {
    console.log('🔵 Listing error logs with filters:', query);

    const where: Prisma.ErrorLogWhereInput = {};

    if (query.severity) {
      where.severity = query.severity as any;
    }

    if (query.resolved !== undefined) {
      where.resolved = query.resolved;
    }

    if (query.errorCode) {
      where.errorCode = query.errorCode;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.endpoint) {
      where.endpoint = { contains: query.endpoint };
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const skip = (query.page - 1) * query.limit;

    const [total, data] = await Promise.all([
      prisma.errorLog.count({ where }),
      prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      data: data.map((log: any) => this.formatErrorLog(log)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Resolve error log
   */
  async resolveErrorLog(
    id: string,
    data: ResolveErrorLogRequest
  ): Promise<ErrorLogResponse> {
    console.log('🔵 Resolving error log:', id);

    const errorLog = await prisma.errorLog.findUnique({
      where: { id },
    });

    if (!errorLog) {
      throw new Error('ERROR_LOG_NOT_FOUND');
    }

    if (errorLog.resolved) {
      throw new Error('ERROR_ALREADY_RESOLVED');
    }

    const resolved = await prisma.errorLog.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: data.resolvedBy,
        notes: data.notes,
      },
    });

    return this.formatErrorLog(resolved);
  }

  /**
   * Get error statistics
   */
  async getErrorStatistics(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ErrorStatistics> {
    console.log('🔵 Getting error statistics');

    const where: Prisma.ErrorLogWhereInput = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [
      total,
      byCodeRaw,
      bySeverityRaw,
      byEndpointRaw,
      resolvedCount,
      unresolvedCount,
      recentErrors,
    ] = await Promise.all([
      prisma.errorLog.count({ where }),
      prisma.errorLog.groupBy({
        by: ['errorCode'],
        where,
        _count: true,
        orderBy: { _count: { errorCode: 'desc' } },
        take: 10,
      }),
      prisma.errorLog.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
      prisma.errorLog.groupBy({
        by: ['endpoint'],
        where: { ...where, endpoint: { not: null } },
        _count: true,
        orderBy: { _count: { endpoint: 'desc' } },
        take: 10,
      }),
      prisma.errorLog.count({ where: { ...where, resolved: true } }),
      prisma.errorLog.count({ where: { ...where, resolved: false } }),
      prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const bySeverity: any = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    bySeverityRaw.forEach((item: any) => {
      bySeverity[item.severity] = item._count;
    });

    return {
      total,
      byCode: byCodeRaw.map((item: any) => ({
        errorCode: item.errorCode,
        count: item._count,
      })),
      bySeverity,
      byEndpoint: byEndpointRaw.map((item: any) => ({
        endpoint: item.endpoint || 'unknown',
        count: item._count,
      })),
      resolved: resolvedCount,
      unresolved: unresolvedCount,
      recentErrors: recentErrors.map((log: any) => this.formatErrorLog(log)),
    };
  }

  /**
   * Delete old error logs
   */
  async deleteOldLogs(daysOld: number): Promise<number> {
    console.log('🔵 Deleting error logs older than', daysOld, 'days');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.errorLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log('✅ Deleted', result.count, 'old error logs');
    return result.count;
  }

  /**
   * Format error log for response
   */
  private formatErrorLog(log: any): ErrorLogResponse {
    return {
      id: log.id,
      errorCode: log.errorCode,
      errorMessage: log.errorMessage,
      errorStack: log.errorStack,
      endpoint: log.endpoint,
      method: log.method,
      userId: log.userId,
      requestBody: log.requestBody,
      requestParams: log.requestParams,
      requestQuery: log.requestQuery,
      userAgent: log.userAgent,
      ipAddress: log.ipAddress,
      severity: log.severity,
      resolved: log.resolved,
      resolvedAt: log.resolvedAt?.toISOString() || null,
      resolvedBy: log.resolvedBy,
      notes: log.notes,
      createdAt: log.createdAt.toISOString(),
    };
  }

  /**
   * Log error automatically from request context
   */
  async logError(
    error: Error,
    context?: {
      endpoint?: string;
      method?: string;
      userId?: string;
      requestBody?: any;
      requestParams?: any;
      requestQuery?: any;
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<void> {
    try {
      // Determine severity based on error type
      let severity: 'info' | 'warning' | 'error' | 'critical' = 'error';
      let errorCode = 'INTERNAL_ERROR';

      if (error.message.includes('VALIDATION')) {
        severity = 'warning';
        errorCode = 'VALIDATION_ERROR';
      } else if (error.message.includes('NOT_FOUND')) {
        severity = 'info';
        errorCode = error.message;
      } else if (
        error.message.includes('UNAUTHORIZED') ||
        error.message.includes('FORBIDDEN')
      ) {
        severity = 'warning';
        errorCode = error.message;
      } else if (error.message.includes('DATABASE') || error.message.includes('TRANSACTION')) {
        severity = 'critical';
        errorCode = 'DATABASE_ERROR';
      }

      await this.createErrorLog({
        errorCode,
        errorMessage: error.message,
        errorStack: error.stack,
        endpoint: context?.endpoint,
        method: context?.method,
        userId: context?.userId,
        requestBody: context?.requestBody,
        requestParams: context?.requestParams,
        requestQuery: context?.requestQuery,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
        severity,
      });
    } catch (logError) {
      // Don't let logging errors break the application
      console.error('❌ Failed to log error:', logError);
    }
  }
}

export const errorLogService = new ErrorLogService();
