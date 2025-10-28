import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { taskService } from '../services/task.service';
import { userService } from '../services/user.service';
import { solanaService } from '../services/solanaService';
import { config } from '../config/env';

interface PayoutBody {
  taskId: string;
  recipientUserId: string;
}

export async function paymentRoutes(fastify: FastifyInstance) {
  // Route: Payout to recipient
  fastify.post<{ Body: PayoutBody }>(
    '/payment/payout',
    {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Payout to a worker for a completed task',
            tags: ['Payments'],
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['taskId', 'recipientUserId'],
                properties: {
                    taskId: { type: 'string', format: 'uuid' },
                    recipientUserId: { type: 'string', format: 'uuid' },
                },
            },
        },
    },
    async (request: FastifyRequest<{ Body: PayoutBody }>, reply: FastifyReply) => {
      try {
        const { taskId, recipientUserId } = request.body;

        // Get task from database
        const task = await taskService.getTaskById(taskId);
        if (!task) {
          return reply.code(404).send({
            success: false,
            error: 'Task not found',
          });
        }

        // Check if task is verified
        if (task.status !== 'active') { // Assuming 'completed' is the status before payout
          return reply.code(400).send({
            success: false,
            error: 'Task must be in completed status before payout',
            taskStatus: task.status,
          });
        }

        // Get recipient's solana wallet address
        const recipientWalletAddress = await userService.getUserSolanaAddress(recipientUserId);
        if (!recipientWalletAddress) {
          return reply.code(404).send({
            success: false,
            error: 'Recipient user wallet not found',
          });
        }

        // Send USDC from settlement wallet to worker wallet
        const transferAmount = parseFloat(task.reward);
        fastify.log.info(`Transferring ${transferAmount} USDC to recipient wallet ${recipientWalletAddress}`);
        
        const transferResult = await solanaService.transferToWallet(
          recipientWalletAddress,
          transferAmount
        );

        if (!transferResult.signature) {
            throw new Error('Payout transfer failed to return a transaction signature.');
        }

        // Update task status to paid_out
        await taskService.updateTaskStatus(taskId, 'paid');

        return reply.send({
          success: true,
          message: 'Payout completed successfully',
          payout: {
            taskId: task.id,
            recipientUserId: recipientUserId,
            recipientWallet: recipientWalletAddress,
            amount: transferAmount,
            fromWallet: config.solana.settlementWalletPublicKey,
            signature: transferResult.signature,
          },
          task: {
            taskId: task.id,
            status: 'paid',
          },
        });
      } catch (error: any) {
        fastify.log.error('Error processing payout:', error);
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to process payout',
        });
      }
    }
  );
}

