import { FastifyPluginAsync } from 'fastify';
import { NotificationService } from '../services/notification.service';
import { NotificationStatus } from '@prisma/client';

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // Get user notifications
  fastify.get(
    '/notifications',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get user notifications with optional filters',
        tags: ['Notifications'],
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'sent', 'read'],
              description: 'Filter by notification status',
            },
            type: {
              type: 'string',
              description: 'Filter by notification type',
            },
            limit: {
              type: 'number',
              default: 50,
              description: 'Number of notifications to return',
            },
            offset: {
              type: 'number',
              default: 0,
              description: 'Offset for pagination',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              notifications: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    toUserId: { type: 'string' },
                    type: { type: 'string' },
                    content: { type: ['string', 'null'] },
                    status: { type: 'string' },
                    meta: { type: ['object', 'null'] },
                    createdAt: { type: 'string' },
                    toUser: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                      },
                    },
                  },
                },
              },
              total: { type: 'number' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { status, type, limit, offset } = request.query as any;

      const result = await NotificationService.getUserNotifications({
        userId,
        status: status as NotificationStatus,
        type,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      });

      return reply.send(result);
    }
  );

  // Get unread notification count
  fastify.get(
    '/notifications/unread-count',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get count of unread notifications',
        tags: ['Notifications'],
        response: {
          200: {
            type: 'object',
            properties: {
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const count = await NotificationService.getUnreadCount(userId);

      return reply.send({ count });
    }
  );

  // Mark notification as read
  fastify.patch(
    '/notifications/:id/read',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Mark a notification as read',
        tags: ['Notifications'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Notification ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params as { id: string };

      const notification = await NotificationService.markAsRead(id, userId);

      return reply.send({
        id: notification.id,
        status: notification.status,
      });
    }
  );

  // Mark all notifications as read
  fastify.patch(
    '/notifications/read-all',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Mark all notifications as read',
        tags: ['Notifications'],
        response: {
          200: {
            type: 'object',
            properties: {
              count: { type: 'number', description: 'Number of notifications marked as read' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const result = await NotificationService.markAllAsRead(userId);

      return reply.send({ count: result.count });
    }
  );

  // Delete notification
  fastify.delete(
    '/notifications/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete a notification',
        tags: ['Notifications'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Notification ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params as { id: string };

      await NotificationService.deleteNotification(id, userId);

      return reply.send({
        success: true,
        message: 'Notification deleted successfully',
      });
    }
  );

  // Delete all read notifications
  fastify.delete(
    '/notifications/read',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Delete all read notifications',
        tags: ['Notifications'],
        response: {
          200: {
            type: 'object',
            properties: {
              count: { type: 'number', description: 'Number of notifications deleted' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const result = await NotificationService.deleteAllRead(userId);

      return reply.send({ count: result.count });
    }
  );

  // Create notification (admin/system only)
  fastify.post(
    '/notifications',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Create a new notification (Admin only)',
        tags: ['Notifications'],
        body: {
          type: 'object',
          required: ['toUserId', 'type'],
          properties: {
            toUserId: { type: 'string', description: 'User ID to send notification to' },
            type: { type: 'string', description: 'Notification type' },
            content: { type: 'string', description: 'Notification content' },
            meta: { type: 'object', description: 'Additional metadata' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              toUserId: { type: 'string' },
              type: { type: 'string' },
              content: { type: ['string', 'null'] },
              status: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Check if user is admin
      if (request.user.role !== 'admin') {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only admins can create notifications',
        });
      }

      const { toUserId, type, content, meta } = request.body as any;

      const notification = await NotificationService.createNotification({
        toUserId,
        type,
        content,
        meta,
      });

      return reply.code(201).send(notification);
    }
  );
};

export default notificationRoutes;
