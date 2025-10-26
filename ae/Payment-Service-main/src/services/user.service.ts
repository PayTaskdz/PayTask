import prisma from '../../config/prisma';

export interface User {
  id?: number;
  userId: string;
  walletAddress: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserService {
  /**
   * Create a new user
   */
  async createUser(user: User): Promise<User> {
    try {
      const created = await prisma.user.create({
        data: {
          userId: user.userId,
          walletAddress: user.walletAddress,
        },
      });

      return {
        id: created.id,
        userId: created.userId,
        walletAddress: created.walletAddress,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        throw new Error('User with this user_id already exists');
      }
      throw error;
    }
  }

  /**
   * Get user by userId
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      userId: user.userId,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Get user by wallet address
   */
  async getUserByWallet(walletAddress: string): Promise<User | null> {
    const user = await prisma.user.findFirst({
      where: { walletAddress },
    });

    if (!user) return null;

    return {
      id: user.id,
      userId: user.userId,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      id: user.id,
      userId: user.userId,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  /**
   * Delete user by userId
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { userId },
      });
      return true;
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record not found
        return false;
      }
      throw error;
    }
  }
}

export const userService = new UserService();
