import prisma from '../config/prisma';
import { UserRole } from '@prisma/client';

export interface UserInfo {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  walletAddress?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserInfo | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: {
          take: 1,
          where: { isActive: true },
          select: {
            addresses: true,
          },
        },
      },
    });

    if (!user) return null;

    // Extract wallet address from wallet addresses JSON
    let walletAddress: string | undefined;
    if (user.wallet && user.wallet.length > 0) {
      const addresses = user.wallet[0].addresses as any;
      // Assuming addresses is an object with network keys
      // Get first available address
      walletAddress = Object.values(addresses)[0] as string;
    }

    return {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      walletAddress,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserInfo | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        wallet: {
          take: 1,
          where: { isActive: true },
          select: {
            addresses: true,
          },
        },
      },
    });

    if (!user) return null;

    let walletAddress: string | undefined;
    if (user.wallet && user.wallet.length > 0) {
      const addresses = user.wallet[0].addresses as any;
      walletAddress = Object.values(addresses)[0] as string;
    }

    return {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      walletAddress,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<UserInfo | null> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        wallet: {
          take: 1,
          where: { isActive: true },
          select: {
            addresses: true,
          },
        },
      },
    });

    if (!user) return null;

    let walletAddress: string | undefined;
    if (user.wallet && user.wallet.length > 0) {
      const addresses = user.wallet[0].addresses as any;
      walletAddress = Object.values(addresses)[0] as string;
    }

    return {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      walletAddress,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Check if user exists
   */
  async userExists(userId: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { id: userId },
    });
    return count > 0;
  }
}

export const userService = new UserService();
