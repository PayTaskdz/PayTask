import { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: string;
      sessionId: string;
      role: 'client' | 'worker' | 'admin';
    };
  }
}