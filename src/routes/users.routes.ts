import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as argon2 from 'argon2';

// Validation schemas
const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().optional()
});

// User profile interface matching NestJS
interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: Date;
  isActive: boolean;
}

const userRoutes: FastifyPluginAsync = async (fastify) => {

  // Helper functions matching NestJS service
  async function findById(id: string) {
    return await fastify.prisma.user.findFirst({
      where: { id, isActive: true },
    });
  }

  async function validatePassword(user: any, password: string): Promise<boolean> {
    try {
      return await argon2.verify(user.passwordHash, password);
    } catch (error) {
      return false;
    }
  }

  function toUserProfile(user: any): UserProfile {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      isActive: user.isActive,
    };
  }

  async function getUserProfile(id: string): Promise<UserProfile> {
    const user = await findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return toUserProfile(user);
  }

  async function updateUser(id: string, updates: Partial<{ email: string; username: string }>): Promise<UserProfile> {
    const user = await findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check for conflicts if updating email or username
    if (updates.email || updates.username) {
      const orConditions = [];
      if (updates.email) orConditions.push({ email: updates.email });
      if (updates.username) orConditions.push({ username: updates.username });

      const conflictUser = await fastify.prisma.user.findFirst({
        where: {
          OR: orConditions,
        },
      });

      if (conflictUser && conflictUser.id !== id) {
        throw new Error('Email or username already exists');
      }
    }

    // Update user - only include defined values
    const updateData: Record<string, any> = {};
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.username !== undefined) updateData.username = updates.username;

    const updatedUser = await fastify.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return toUserProfile(updatedUser);
  }

  async function deactivateUser(id: string): Promise<void> {
    try {
      await fastify.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      throw new Error('User not found');
    }
  }

  async function getAllUsers(): Promise<UserProfile[]> {
    const users = await fastify.prisma.user.findMany({
      where: { isActive: true },
    });
    return users.map(user => toUserProfile(user));
  }

  // Get current user profile
  fastify.get('/profile', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get current user profile',
      tags: ['Users'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const userProfile = await getUserProfile(request.user.userId);
      reply.send(userProfile);
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return reply.code(404).send({ error: 'User not found' });
      }
      fastify.log.error({ error }, 'Get profile error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update current user profile
  fastify.put('/profile', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Update current user profile',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const validatedData = updateProfileSchema.parse(request.body);
      // Filter out undefined values
      const filteredData: { email?: string; username?: string } = {};
      if (validatedData.email !== undefined) filteredData.email = validatedData.email;
      if (validatedData.username !== undefined) filteredData.username = validatedData.username;

      const updatedUser = await updateUser(request.user.userId, filteredData);
      reply.send(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return reply.code(404).send({ error: 'User not found' });
        }
        if (error.message === 'Email or username already exists') {
          return reply.code(409).send({ error: 'Email or username already exists' });
        }
      }
      fastify.log.error({ error }, 'Update profile error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Deactivate current user account
  fastify.delete('/profile', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Deactivate current user account',
      tags: ['Users'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      await deactivateUser(request.user.userId);
      reply.send({ message: 'Account deactivated successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return reply.code(404).send({ error: 'User not found' });
      }
      fastify.log.error({ error }, 'Deactivate account error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get all users (admin)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get all users (admin)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }]
    }
  }, async (_request, reply) => {
    try {
      const users = await getAllUsers();
      reply.send(users);
    } catch (error) {
      fastify.log.error({ error }, 'Get all users error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user by ID
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get user by ID',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userProfile = await getUserProfile(id);
      reply.send(userProfile);
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return reply.code(404).send({ error: 'User not found' });
      }
      fastify.log.error({ error }, 'Get user by ID error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });


};

export { userRoutes };
