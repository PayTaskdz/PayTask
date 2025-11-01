import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { sessionService } from '../services/session.service';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: {
      userId: string;
      sessionId: string;
      role: 'client' | 'worker' | 'admin';
    };
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Authentication decorator using session-based opaque tokens (matching NestJS logic)
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      // Get token from Authorization header
      const token = request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        reply.code(401).send({ error: 'No token provided' });
        return;
      }

      // Validate token using session-based system
      const validation = await sessionService.validateToken(fastify.prisma, token);

      if (!validation.isValid || !validation.user) {
        reply.code(401).send({ error: 'Invalid or expired token' });
        return;
      }

      // Set user information on request
      request.user = {
        userId: validation.user.id,
        sessionId: validation.session?.id || '',
        role: validation.user.role
      };

    } catch (error) {
      fastify.log.error({ error }, 'Authentication error');
      reply.code(401).send({ error: 'Invalid token' });
    }
  });
};

export { authPlugin };
export default fp(authPlugin);