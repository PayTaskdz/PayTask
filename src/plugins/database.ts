import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';
import * as argon2 from 'argon2';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

// Database seeding function (preserved from NestJS version)
async function seedDatabase(prisma: PrismaClient, logger: any) {
  // Check if users already exist
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    logger.info('Database already seeded, skipping...');
    return;
  }

  logger.info('Seeding database with sample data...');

  // Create sample users
  const sampleUsers = [
    {
      email: 'admin@example.com',
      username: 'admin',
      password: 'admin123',
      role: 'worker' as const,
      walletName: 'Admin Wallet',
    },
    {
      email: 'user1@example.com',
      username: 'user1',
      password: 'password123',
      role: 'client' as const,
      walletName: 'User1 Wallet',
    },
    {
      email: 'user2@example.com',
      username: 'user2',
      password: 'password123',
      role: 'client' as const,
      walletName: 'User2 Wallet',
    },
  ];

  for (const userData of sampleUsers) {
    const passwordHash = await argon2.hash(userData.password);

    const savedUser = await prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        passwordHash,
        role: userData.role,
        isActive: true,
      },
    });
    logger.info(`Created user: ${userData.username}`);

    // Create wallet for the user (with mock FyStack data for development)
    await prisma.wallet.create({
      data: {
        userId: savedUser.id,
        fystackWalletId: `fystack_wallet_${savedUser.id}`,
        fystackWorkspaceId: `fystack_workspace_${savedUser.id}`,
        addresses: {
          ethereum: `0x${Math.random().toString(16).substring(2, 42)}`,
          bitcoin: `bc1${Math.random().toString(36).substring(2, 41)}`,
        },
        walletName: userData.walletName,
        isActive: true,
      },
    });
    logger.info(`Created wallet for ${userData.username}: ${userData.walletName}`);
  }

  logger.info('Database seeding completed!');
}

const databasePlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

  // Test database connection
  try {
    await prisma.$connect();
    fastify.log.info('Database connected successfully');

    // Seed database (preserved from NestJS logic)
    await seedDatabase(prisma, fastify.log);
  } catch (error) {
    fastify.log.error({ error }, 'Failed to connect to database');
    throw error;
  }

  // Add prisma to fastify instance
  fastify.decorate('prisma', prisma);

  // Close connection on app shutdown
  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
    instance.log.info('Database connection closed');
  });
};

export { databasePlugin };
export default fp(databasePlugin);
