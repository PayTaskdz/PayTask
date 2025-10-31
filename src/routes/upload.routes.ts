import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { error } from 'console';

export const uploadRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const UPLOAD_DIR = join(process.cwd(), 'uploads');

  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  // Upload single or multiple files
  fastify.post('/files', {
    // preHandler: [fastify.authenticate], // ⚠️ Temporarily disabled for testing
    schema: {
      description: 'Upload files to server',
      tags: ['Upload'],
      // security: [{ bearerAuth: [] }], // ⚠️ Temporarily disabled for testing
      consumes: ['multipart/form-data'],
      response: {
        200: {
          description: 'Files uploaded successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  filename: { type: 'string' },
                  originalName: { type: 'string' },
                  url: { type: 'string' },
                  size: { type: 'number' },
                  mimeType: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Log authentication info
      fastify.log.info({
        userId: (request as any).user?.id,
        hasAuth: !!(request as any).user,
        headers: {
          authorization: request.headers.authorization ? 'present' : 'missing'
        }
      }, 'Upload request authentication');
      const uploadedFiles: any[] = [];
      const parts = request.parts();

      for await (const part of parts) {
        if (part.type === 'file') {
          const fileId = randomUUID();
          const ext = part.filename.split('.').pop() || 'bin';
          const filename = `${fileId}.${ext}`;
          const filepath = join(UPLOAD_DIR, filename);

          // Save file to disk
          const buffer = await part.toBuffer();
          await writeFile(filepath, buffer);
          console.log(error);
          uploadedFiles.push({
            filename,
            originalName: part.filename,
            url: `/api/uploads/files/${filename}`,
            size: buffer.length,
            mimeType: part.mimetype
          });

          fastify.log.info(`File uploaded: ${filename} (${buffer.length} bytes)`);
        }
      }

      return reply.send({
        success: true,
        files: uploadedFiles
      });
    } catch (error) {
      fastify.log.error({ error }, 'File upload error');
      return reply.code(500).send({
        success: false,
        error: 'Failed to upload files'
      });
    }
  });

  // Serve uploaded files
  fastify.get('/files/:filename', {
    schema: {
      description: 'Download uploaded file',
      tags: ['Upload'],
      params: {
        type: 'object',
        properties: {
          filename: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { filename } = request.params as { filename: string };
      const filepath = join(UPLOAD_DIR, filename);

      if (!existsSync(filepath)) {
        return reply.code(404).send({ error: 'File not found' });
      }

      const fileBuffer = await readFile(filepath);
      return reply.type('application/octet-stream').send(fileBuffer);
    } catch (error) {
      fastify.log.error({ error }, 'File download error');
      return reply.code(500).send({ error: 'Failed to download file' });
    }
  });
};
