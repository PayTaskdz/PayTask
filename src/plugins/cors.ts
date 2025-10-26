import { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import fp from 'fastify-plugin';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: (origin, callback) => {
      const hostname = new URL(origin || 'http://localhost').hostname;
      
      // Allow localhost and development origins
      if (hostname === 'localhost' || hostname === '127.0.0.1' || !origin) {
        callback(null, true);
        return;
      }
      
      // Allow production origins from environment
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (allowedOrigins.includes(origin || '')) {
        callback(null, true);
        return;
      }
      
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  });
};

export { corsPlugin };
export default fp(corsPlugin);
