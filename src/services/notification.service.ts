import { prisma } from '../config/prisma';
import { NotificationStatus } from '@prisma/client';

export interface CreateNotificationInput {
  toUserId: string;
  type: string;
  content?: string;
  meta?: Record<string, any>;
}

export interface NotificationFilter {
  userId: string;
  status?: NotificationStatus;
  type?: string;
  limit?: number;
  offset?: number;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(input: CreateNotificationInput) {
    return await prisma.notification.create({
      data: {
        toUserId: input.toUserId,
        type: input.type,
        content: input.content,
        meta: input.meta,
        status: NotificationStatus.pending,
      },
      include: {
        toUser: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get user notifications with filters
   */
  static async getUserNotifications(filter: NotificationFilter) {
    const { userId, status, type, limit = 50, offset = 0 } = filter;

    const where: any = {
      toUserId: userId,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
        include: {
          toUser: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        toUserId: userId,
        status: {
          in: [NotificationStatus.pending, NotificationStatus.sent],
        },
      },
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    // Verify the notification belongs to the user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        toUserId: userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found or unauthorized');
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.read },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: {
        toUserId: userId,
        status: {
          in: [NotificationStatus.pending, NotificationStatus.sent],
        },
      },
      data: {
        status: NotificationStatus.read,
      },
    });
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string, userId: string) {
    // Verify the notification belongs to the user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        toUserId: userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found or unauthorized');
    }

    return await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Delete all read notifications for a user
   */
  static async deleteAllRead(userId: string) {
    return await prisma.notification.deleteMany({
      where: {
        toUserId: userId,
        status: NotificationStatus.read,
      },
    });
  }

  /**
   * Helper: Send task assignment notification
   */
  static async notifyTaskAssignment(taskId: string, workerId: string, taskTitle: string) {
    return await this.createNotification({
      toUserId: workerId,
      type: 'task_assignment',
      content: `You have been assigned to task: ${taskTitle}`,
      meta: {
        taskId,
        taskTitle,
      },
    });
  }

  /**
   * Helper: Send payment notification
   */
  static async notifyPayment(userId: string, amount: number, taskTitle: string) {
    return await this.createNotification({
      toUserId: userId,
      type: 'payment',
      content: `You received $${amount.toFixed(2)} for completing "${taskTitle}"`,
      meta: {
        amount,
        taskTitle,
      },
    });
  }

  /**
   * Helper: Send submission review notification
   */
  static async notifySubmissionReview(
    workerId: string,
    taskTitle: string,
    status: 'approved' | 'rejected',
    feedback?: string
  ) {
    return await this.createNotification({
      toUserId: workerId,
      type: 'submission_review',
      content:
        status === 'approved'
          ? `Your submission for "${taskTitle}" has been approved`
          : `Your submission for "${taskTitle}" was rejected. ${feedback || ''}`,
      meta: {
        taskTitle,
        status,
        feedback,
      },
    });
  }

  /**
   * Helper: Send deadline reminder notification
   */
  static async notifyDeadlineReminder(workerId: string, taskTitle: string, deadline: Date) {
    return await this.createNotification({
      toUserId: workerId,
      type: 'deadline',
      content: `Task "${taskTitle}" is due soon`,
      meta: {
        taskTitle,
        deadline: deadline.toISOString(),
      },
    });
  }

  /**
   * Helper: Send new task available notification
   */
  static async notifyNewTaskAvailable(userId: string, taskTitle: string, taskId: string) {
    return await this.createNotification({
      toUserId: userId,
      type: 'task_alert',
      content: `A new task is available: "${taskTitle}"`,
      meta: {
        taskId,
        taskTitle,
      },
    });
  }
}
