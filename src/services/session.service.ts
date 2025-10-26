import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

// Session interface
export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  isActive: boolean;
  userAgent?: string;
  ipAddress?: string;
}

// Session management class (preserving NestJS logic)
export class SessionService {
  private readonly DEFAULT_EXPIRES_IN = 24 * 60 * 60; // 24 hours in seconds

  async createSession(
    prisma: PrismaClient,
    sessionData: {
      userId: string;
      userAgent?: string;
      ipAddress?: string;
      expiresIn?: number;
    }
  ): Promise<{ token: string; session: Session }> {
    const token = this.generateOpaqueToken();
    const expiresIn = sessionData.expiresIn || this.DEFAULT_EXPIRES_IN;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const sessionData_db = {
      id: uuidv4(),
      userId: sessionData.userId,
      token,
      expiresAt,
      createdAt: new Date(),
      isActive: true,
      userAgent: sessionData.userAgent || '',
      ipAddress: sessionData.ipAddress || '',
    };

    const createdSession = await prisma.session.create({
      data: sessionData_db,
    });

    const session: Session = {
      id: createdSession.id,
      userId: createdSession.userId,
      token: createdSession.token,
      expiresAt: createdSession.expiresAt,
      createdAt: createdSession.createdAt,
      isActive: createdSession.isActive,
      userAgent: createdSession.userAgent || '',
      ipAddress: createdSession.ipAddress || '',
    };

    return { token, session };
  }

  async validateToken(prisma: PrismaClient, token: string): Promise<{
    isValid: boolean;
    session?: Session;
    user?: any;
  }> {
    const sessionData = await prisma.session.findFirst({
      where: {
        token: token,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!sessionData) {
      return { isValid: false };
    }

    const session: Session = {
      id: sessionData.id,
      userId: sessionData.userId,
      token: sessionData.token,
      expiresAt: sessionData.expiresAt,
      createdAt: sessionData.createdAt,
      isActive: sessionData.isActive,
      userAgent: sessionData.userAgent || '',
      ipAddress: sessionData.ipAddress || '',
    };

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      await this.invalidateSession(prisma, session.id);
      return { isValid: false };
    }

    return {
      isValid: true,
      session,
      user,
    };
  }

  async invalidateSession(prisma: PrismaClient, sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false }
    });
  }

  async invalidateUserSessions(prisma: PrismaClient, userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: {
        userId: userId,
        isActive: true
      },
      data: { isActive: false }
    });
  }

  async getUserSessions(prisma: PrismaClient, userId: string): Promise<Session[]> {
    const sessions = await prisma.session.findMany({
      where: {
        userId: userId,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    return sessions.map(s => ({
      id: s.id,
      userId: s.userId,
      token: s.token,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      isActive: s.isActive,
      userAgent: s.userAgent || '',
      ipAddress: s.ipAddress || '',
    }));
  }

  async cleanupExpiredSessions(prisma: PrismaClient): Promise<void> {
    await prisma.session.updateMany({
      where: {
        expiresAt: {
          lte: new Date()
        }
      },
      data: { isActive: false }
    });
  }

  // Generate a cryptographically secure opaque token
  private generateOpaqueToken(): string {
    const randomBytes = crypto.randomBytes(32);
    return randomBytes
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Get session statistics
  async getSessionStats(prisma: PrismaClient): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  }> {
    const now = new Date();

    const totalSessions = await prisma.session.count();

    const activeSessions = await prisma.session.count({
      where: {
        isActive: true,
        expiresAt: {
          gt: now
        }
      }
    });

    const expiredSessions = await prisma.session.count({
      where: {
        expiresAt: {
          lte: now
        }
      }
    });

    return {
      totalSessions,
      activeSessions,
      expiredSessions,
    };
  }
}

// Global session service instance
export const sessionService = new SessionService();
