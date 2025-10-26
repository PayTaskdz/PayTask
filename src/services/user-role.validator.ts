import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

/**
 * User role validation helper
 * Provides centralized role validation for services
 */
export class UserRoleValidator {
  /**
   * Validate that user exists and return their role
   * @throws Error if user is not found
   */
  static async getUserRole(userId: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx || prisma;
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return user;
  }

  /**
   * Validate that user is a client
   * @throws Error if user is not found or not a client
   */
  static async validateClientRole(userId: string, tx?: Prisma.TransactionClient) {
    const user = await this.getUserRole(userId, tx);

    if (user.role !== 'client') {
      throw new Error('USER_NOT_CLIENT');
    }

    return user;
  }

  /**
   * Validate that user is a worker
   * @throws Error if user is not found or not a worker
   */
  static async validateWorkerRole(userId: string, tx?: Prisma.TransactionClient) {
    const user = await this.getUserRole(userId, tx);

    if (user.role !== 'worker') {
      throw new Error('USER_NOT_WORKER');
    }

    return user;
  }

  /**
   * Check if user is a client (returns boolean)
   */
  static async isClient(userId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    try {
      const user = await this.getUserRole(userId, tx);
      return user.role === 'client';
    } catch {
      return false;
    }
  }

  /**
   * Check if user is a worker (returns boolean)
   */
  static async isWorker(userId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    try {
      const user = await this.getUserRole(userId, tx);
      return user.role === 'worker';
    } catch {
      return false;
    }
  }
}
