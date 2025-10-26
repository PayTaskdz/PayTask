import { FastifyInstance } from 'fastify';
import { walletRoutes } from './wallet.routes';

export async function registerRoutes(fastify: FastifyInstance) {
  // Register all route modules
  await fastify.register(walletRoutes);
  
  // Health check route
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });
}
