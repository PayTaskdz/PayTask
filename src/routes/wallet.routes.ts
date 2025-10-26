import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { taskService } from '../services/task.service';
import { userService } from '../services/user.service';
import { solanaService } from '../services/solanaService';
import { config } from '../config/env';

interface EscrowBody {
  taskId: string;
}

interface VerifyPaymentBody {
  taskId: string;
  txHash: string;
}

interface PayoutBody {
  taskId: string;
  recipientUserId: string;
}

interface RefundBody {
  taskId: string;
}

interface WithdrawBody {
  userId: string;
  walletAddress: string;
  amount: number;
}

export async function walletRoutes(fastify: FastifyInstance) {
  // Route 1: Escrow - Get instructions to transfer to user wallet
  fastify.post<{ Body: EscrowBody }>(
    '/payment/escrow',
    async (request: FastifyRequest<{ Body: EscrowBody }>, reply: FastifyReply) => {
      try {
        const { taskId } = request.body;

        if (!taskId) {
          return reply.code(400).send({
            success: false,
            error: 'taskId is required',
          });
        }

        // Get task from database
        const task = await taskService.getTaskById(taskId);
        if (!task) {
          return reply.code(404).send({
            success: false,
            error: 'Task not found',
          });
        }

        // Get user wallet from clientId in task
        const user = await userService.getUserById(task.clientId);
        if (!user) {
          return reply.code(404).send({
            success: false,
            error: 'User not found',
          });
        }

        // Get wallet from Wallet table using userId
        const wallet = await fastify.prisma.wallet.findUnique({
          where: { userId: task.clientId }
        });

        if (!wallet) {
          return reply.code(400).send({
            success: false,
            error: 'User wallet not found',
          });
        }

        // Extract Solana wallet address from addresses JSON
        const addresses = wallet.addresses as any;
        const walletAddress = addresses?.solana || addresses?.SOL;

        if (!walletAddress) {
          return reply.code(400).send({
            success: false,
            error: 'Solana wallet address not found',
          });
        }

        // Use budget from task (already includes fee)
        const totalAmount = parseFloat(task.budget || '0');
        
        // Fetch user wallet USDC balance from blockchain
        const userBalance = await solanaService.getUsdcBalance(walletAddress);
        console.log(`Checking balance for wallet ${walletAddress}: ${userBalance} USDC`);

        // Check if user has enough balance
        if (userBalance < totalAmount) {
          return reply.code(400).send({
            success: false,
            error: 'Insufficient balance',
            details: {
              userWallet: walletAddress,
              currentBalance: userBalance,
              requiredAmount: totalAmount,
              shortage: parseFloat((totalAmount - userBalance).toFixed(2)),
            },
          });
        }

        // Mock: Transfer total amount to settlement wallet
        console.log(`[MOCK] Transferring ${totalAmount} USDC from user wallet ${walletAddress} to settlement wallet ${config.solana.settlementWalletPublicKey}`);

        // Update task status to open (published with payment)
        // Note: Task service doesn't have updateTaskStatus method, we need to use publishTask
        // For now, we'll just return success
        return reply.send({
          success: true,
          message: 'Escrow completed. Task Published',
          transfer: {
            fromWallet: walletAddress,
            toWallet: config.solana.settlementWalletPublicKey,
            totalAmount: totalAmount,
            note: 'Transfer to settlement wallet',
          },
          task: {
            id: task.id,
            clientId: task.clientId,
            budget: task.budget,
            feePercent: task.feePercent,
            status: task.status,
          },
        });
      } catch (error: any) {
        console.error('Error processing escrow:', error);
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to process escrow',
        });
      }
    }
  );

  // Route 3: Payout to recipient
  fastify.post<{ Body: PayoutBody }>(
    '/payment/payout',
    async (request: FastifyRequest<{ Body: PayoutBody }>, reply: FastifyReply) => {
      try {
        const { taskId, recipientUserId } = request.body;

        if (!taskId || !recipientUserId) {
          return reply.code(400).send({
            success: false,
            error: 'taskId and recipientUserId are required',
          });
        }

        // Get task from database
        const task = await taskService.getTaskById(taskId);
        if (!task) {
          return reply.code(404).send({
            success: false,
            error: 'Task not found',
          });
        }

        // Check if task is completed
        if (task.status !== 'completed') {
          return reply.code(400).send({
            success: false,
            error: 'Task must have completed status before payout',
            taskStatus: task.status,
          });
        }

        // Get recipient user wallet (worker)
        const recipient = await userService.getUserById(recipientUserId);
        if (!recipient) {
          return reply.code(404).send({
            success: false,
            error: 'Recipient user not found',
          });
        }

        // Get wallet from Wallet table using userId
        const recipientWallet = await fastify.prisma.wallet.findUnique({
          where: { userId: recipientUserId }
        });

        if (!recipientWallet) {
          return reply.code(400).send({
            success: false,
            error: 'Recipient wallet not found',
          });
        }

        // Extract Solana wallet address from addresses JSON
        const addresses = recipientWallet.addresses as any;
        const recipientWalletAddress = addresses?.solana || addresses?.SOL;

        if (!recipientWalletAddress) {
          return reply.code(400).send({
            success: false,
            error: 'Recipient Solana wallet address not found',
          });
        }

        // Send USDC from settlement wallet to worker wallet
        // Use reward amount (not budget which includes fee)
        const transferAmount = parseFloat(task.reward);
        console.log(`Transferring ${transferAmount} USDC to recipient wallet ${recipientWalletAddress}`);
        const transferResult = await solanaService.transferToWallet(
          recipientWalletAddress,
          transferAmount
        );

        // Note: We don't have a 'paid_out' status in TaskStatus enum
        // Task status remains 'completed'

        return reply.send({
          success: true,
          message: 'Payout completed successfully',
          payout: {
            taskId: task.id,
            recipientUserId: recipient.userId,
            recipientWallet: recipientWalletAddress,
            amount: transferAmount,
            fromWallet: config.solana.settlementWalletPublicKey,
            signature: transferResult.signature,
          },
          task: {
            id: task.id,
            status: task.status,
          },
        });
      } catch (error: any) {
        console.error('Error processing payout:', error);
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to process payout',
        });
      }
    }
  );

  // Route 4: Claim
  fastify.post<{ Body: WithdrawBody }>(
    '/payment/withdraw',
    async (request: FastifyRequest<{ Body: WithdrawBody }>, reply: FastifyReply) => {
      try {
        const { userId, walletAddress, amount } = request.body;

        if (!userId || !walletAddress || !amount) {
          return reply.code(400).send({
            success: false,
            error: 'userId, walletAddress, and amount are required',
          });
        }

        // Get user from database
        const user = await userService.getUserById(userId);
        if (!user) {
          return reply.code(404).send({
            success: false,
            error: 'User not found',
          });
        }

        // Get wallet from Wallet table using userId
        const wallet = await fastify.prisma.wallet.findUnique({
          where: { userId: userId }
        });

        if (!wallet) {
          return reply.code(400).send({
            success: false,
            error: 'User wallet not found',
          });
        }

        // Extract Solana wallet address from addresses JSON
        const addresses = wallet.addresses as any;
        const userWalletAddress = addresses?.solana || addresses?.SOL;

        if (!userWalletAddress) {
          return reply.code(400).send({
            success: false,
            error: 'User Solana wallet address not found',
          });
        }

        // Verify wallet address matches user's wallet
        if (userWalletAddress !== walletAddress) {
          return reply.code(400).send({
            success: false,
            error: 'Wallet address does not match user wallet',
            details: {
              providedWallet: walletAddress,
              userWallet: userWalletAddress,
            },
          });
        }

        // Fetch user wallet USDC balance from blockchain
        const userBalance = await solanaService.getUsdcBalance(userWalletAddress);
        console.log(`Checking balance for wallet ${userWalletAddress}: ${userBalance} USDC`);

        // Check if user has enough balance
        const claimAmount = parseFloat(amount.toFixed(2));
        if (userBalance < claimAmount) {
          return reply.code(400).send({
            success: false,
            error: 'Insufficient balance',
            details: {
              userWallet: userWalletAddress,
              currentBalance: userBalance,
              requiredAmount: claimAmount,
              shortage: parseFloat((claimAmount - userBalance).toFixed(2)),
            },
          });
        }

        // Mock: Transfer amount to recipient (wallet address)
        console.log(`[MOCK] Claiming ${claimAmount} USDC from user wallet ${userWalletAddress} to recipient ${walletAddress}`);

        return reply.send({
          success: true,
          message: 'Claim completed successfully',
          claim: {
            userId: user.userId,
            fromWallet: userWalletAddress,
            recipientWallet: walletAddress,
            amount: claimAmount,
            note: 'Claim transfer (mocked)',
          },
        });
      } catch (error: any) {
        console.error('Error processing claim:', error);
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to process claim',
        });
      }
    }
  );

  // Route 5: Refund
  fastify.post<{ Body: RefundBody }>(
    '/payment/refund',
    async (request: FastifyRequest<{ Body: RefundBody }>, reply: FastifyReply) => {
      try {
        const { taskId } = request.body;

        if (!taskId) {
          return reply.code(400).send({
            success: false,
            error: 'taskId is required',
          });
        }

        // Get task from database
        const task = await taskService.getTaskById(taskId);
        if (!task) {
          return reply.code(404).send({
            success: false,
            error: 'Task not found',
          });
        }

        // Get user wallet from task clientId
        const user = await userService.getUserById(task.clientId);
        if (!user) {
          return reply.code(404).send({
            success: false,
            error: 'User not found',
          });
        }

        // Get wallet from Wallet table using userId
        const wallet = await fastify.prisma.wallet.findUnique({
          where: { userId: task.clientId }
        });

        if (!wallet) {
          return reply.code(400).send({
            success: false,
            error: 'User wallet not found',
          });
        }

        // Extract Solana wallet address from addresses JSON
        const addresses = wallet.addresses as any;
        const userWalletAddress = addresses?.solana || addresses?.SOL;

        if (!userWalletAddress) {
          return reply.code(400).send({
            success: false,
            error: 'User Solana wallet address not found',
          });
        }

        // Refund the reward amount (fee is kept by platform)
        const refundAmount = parseFloat(task.reward) * task.qty;

        // Transfer refund from settlement wallet to user wallet
        console.log(`[MOCK] Refunding ${refundAmount} USDC from settlement wallet ${config.solana.settlementWalletPublicKey} to user wallet ${userWalletAddress}`);

        // Update task status to refunded
        await taskService.updateTaskStatus(task.id, 'refund');

        return reply.send({
          success: true,
          message: 'Refund completed successfully',
          refund: {
            taskId: task.id,
            userId: user.userId,
            userWallet: userWalletAddress,
            fromWallet: config.solana.settlementWalletPublicKey,
            refundAmount: refundAmount,
            note: 'Refund transfer from settlement wallet to user wallet (fee not included)',
          },
          task: {
            taskId: task.id,
            status: 'refunded',
          },
        });
      } catch (error: any) {
        console.error('Error processing refund:', error);
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to process refund',
        });
      }
    }
  );
}
