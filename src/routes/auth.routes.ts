import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sessionService } from '../services/session.service';
import { fystackService } from '../services/fystack.service';

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['WORKER', 'CLIENT']).optional().default('CLIENT')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const tokenIntrospectionSchema = z.object({
  token: z.string()
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register endpoint
  fastify.post('/register', {
    schema: {
      description: 'Register a new user',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['worker', 'client'], default: 'client' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                tokenType: { type: 'string' },
                expiresIn: { type: 'number' },
                expiresAt: { type: 'string' },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    username: { type: 'string' },
                    role: { type: 'string' },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string' }
                  }
                },
                wallet: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    addresses: { type: 'object' },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string' }
                  }
                },
                session: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    createdAt: { type: 'string' },
                    expiresAt: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { username, email, password } = registerSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await fastify.prisma.user.findFirst({
        where: {
          OR: [
            { username },
            { email }
          ]
        }
      });

      if (existingUser) {
        return reply.code(400).send({
          success: false,
          error: 'User already exists',
          message: 'User with this username or email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await fastify.prisma.user.create({
        data: {
          username,
          email,
          passwordHash: hashedPassword,
          role: registerSchema.parse(request.body).role as any
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      fastify.log.info(`User created: ${user.email}, starting wallet creation...`);

      // Auto-create wallet (using FyStack service - matching NestJS logic)
      let wallet = null;
      try {
        const fystackResult = await fystackService.createWalletForUser(user.username);

        wallet = await fastify.prisma.wallet.create({
          data: {
            userId: user.id,
            fystackWalletId: fystackResult.walletId,
            fystackWorkspaceId: fystackResult.workspaceId,
            addresses: fystackResult.addresses,
            walletName: `${user.username}'s Wallet`,
            isActive: true,
          },
        });
        fastify.log.info(`Wallet created successfully for user: ${user.email}`);
      } catch (walletError: any) {
        fastify.log.error({ error: walletError }, `Failed to create wallet for user ${user.email}`);
        // Continue with registration even if wallet creation fails
      }

      // Create session for the new user
      const userAgent = request.headers['user-agent'] || '';
      const ipAddress = request.ip;
      const { token, session } = await sessionService.createSession(fastify.prisma, {
        userId: user.id,
        userAgent,
        ipAddress,
      });

      reply.code(201).send({
        success: true,
        message: 'User registered successfully',
        data: {
          accessToken: token,
          tokenType: 'Bearer',
          expiresIn: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
          expiresAt: session.expiresAt.toISOString(),
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
          },
          wallet: wallet ? {
            id: wallet.id,
            name: wallet.walletName,
            addresses: wallet.addresses,
            isActive: wallet.isActive,
            createdAt: wallet.createdAt.toISOString(),
          } : null,
          session: {
            id: session.id,
            createdAt: session.createdAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
          }
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          message: 'Invalid input data',
          details: error.errors
        });
      }

      fastify.log.error({ error }, 'Registration error');
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred during registration'
      });
    }
  });

  // Login endpoint
  fastify.post('/login', {
    schema: {
      description: 'Login user',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      // Find user with wallet info
      const user = await fastify.prisma.user.findUnique({
        where: { email },
        include: {
          wallet: {
            where: { isActive: true },
            take: 1
          }
        }
      });

      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Create session (matching NestJS logic)
      const userAgent = request.headers['user-agent'] || '';
      const ipAddress = request.ip;
      const { token, session } = await sessionService.createSession(fastify.prisma, {
        userId: user.id,
        userAgent,
        ipAddress,
      });

      const wallet = user.wallet && user.wallet.length > 0 ? user.wallet[0] : null;

      reply.send({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: token,
          tokenType: 'Bearer',
          expiresIn: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
          expiresAt: session.expiresAt.toISOString(),
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
          },
          wallet: wallet ? {
            id: wallet.id,
            name: wallet.walletName,
            addresses: wallet.addresses,
            isActive: wallet.isActive,
            createdAt: wallet.createdAt.toISOString(),
          } : null,
          session: {
            id: session.id,
            createdAt: session.createdAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
          }
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          message: 'Invalid input data',
          details: error.errors
        });
      }

      fastify.log.error({ error }, 'Login error');
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred during login'
      });
    }
  });

  // Logout endpoint
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Logout user',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const validation = await sessionService.validateToken(fastify.prisma, token);
        if (validation.isValid && validation.session) {
          await sessionService.invalidateSession(fastify.prisma, validation.session.id);
        }
      }

      reply.send({ message: 'Logout successful' });
    } catch (error) {
      fastify.log.error({ error }, 'Logout error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user info
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get current user information',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true
        }
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      reply.send({ user });
    } catch (error) {
      fastify.log.error({ error }, 'Get user error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Logout all sessions endpoint
  fastify.post('/logout-all', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Logout all sessions for current user',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      await sessionService.invalidateUserSessions(fastify.prisma, request.user.userId);
      reply.send({ message: 'All sessions logged out successfully' });
    } catch (error) {
      fastify.log.error({ error }, 'Logout all error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Refresh token endpoint
  fastify.post('/refresh', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Refresh access token',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            tokenType: { type: 'string' },
            expiresIn: { type: 'number' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const currentToken = request.headers.authorization?.replace('Bearer ', '');
      if (!currentToken) {
        return reply.code(401).send({ error: 'No token provided' });
      }

      const validation = await sessionService.validateToken(fastify.prisma, currentToken);
      if (!validation.isValid || !validation.session || !validation.user) {
        return reply.code(401).send({ error: 'Invalid token' });
      }

      // Invalidate current session
      await sessionService.invalidateSession(fastify.prisma, validation.session.id);

      // Create new session
      const userAgent = request.headers['user-agent'] || '';
      const ipAddress = request.ip;
      const { token, session } = await sessionService.createSession(fastify.prisma, {
        userId: validation.user.id,
        userAgent,
        ipAddress,
      });

      reply.send({
        accessToken: token,
        tokenType: 'Bearer',
        expiresIn: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
        user: {
          id: validation.user.id,
          email: validation.user.email,
          username: validation.user.username,
          role: validation.user.role,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Refresh token error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Token introspection endpoint
  fastify.post('/introspect', {
    schema: {
      description: 'Token introspection for other services',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            active: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                username: { type: 'string' },
                role: { type: 'string' },
                isActive: { type: 'boolean' }
              }
            },
            session: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                expiresAt: { type: 'string' },
                createdAt: { type: 'string' },
                userAgent: { type: 'string' },
                ipAddress: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { token } = tokenIntrospectionSchema.parse(request.body);
      const validation = await sessionService.validateToken(fastify.prisma, token);

      if (!validation.isValid) {
        return reply.send({ active: false });
      }

      reply.send({
        active: true,
        user: validation.user,
        session: validation.session ? {
          id: validation.session.id,
          expiresAt: validation.session.expiresAt.toISOString(),
          createdAt: validation.session.createdAt.toISOString(),
          userAgent: validation.session.userAgent,
          ipAddress: validation.session.ipAddress,
        } : undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }

      fastify.log.error({ error }, 'Token introspection error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user sessions endpoint
  fastify.get('/sessions', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get all active sessions for current user',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              createdAt: { type: 'string' },
              expiresAt: { type: 'string' },
              userAgent: { type: 'string' },
              ipAddress: { type: 'string' },
              isActive: { type: 'boolean' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const sessions = await sessionService.getUserSessions(fastify.prisma, request.user.userId);
      reply.send(sessions.map(session => ({
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        isActive: session.isActive
      })));
    } catch (error) {
      fastify.log.error({ error }, 'Get sessions error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Invalidate specific session endpoint
  fastify.delete('/sessions/:sessionId', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Invalidate a specific session',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' }
        },
        required: ['sessionId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };

      // Verify the session belongs to the current user
      const userSessions = await sessionService.getUserSessions(fastify.prisma, request.user.userId);
      const sessionExists = userSessions.some(s => s.id === sessionId);

      if (!sessionExists) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      await sessionService.invalidateSession(fastify.prisma, sessionId);
      reply.send({ message: 'Session invalidated successfully' });
    } catch (error) {
      fastify.log.error({ error }, 'Invalidate session error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
};

export { authRoutes };
