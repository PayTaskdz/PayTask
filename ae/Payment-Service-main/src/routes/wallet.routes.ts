import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { taskService } from '../db/tables/task';
import { userService } from '../db/tables/user';
import { solanaService } from '../services/solanaService';
import { config } from '../config';

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

        // Get user wallet from user_id in task
        const user = await userService.getUserById(task.user_id);
        if (!user) {
          return reply.code(404).send({
            success: false,
            error: 'User not found',
          });
        }

        // Calculate fee amount and total
        // const feeAmount = parseFloat(((task.amount * task.fee_percent) / 100).toFixed(2));
        // const totalAmount = parseFloat((task.amount + feeAmount).toFixed(2));
        const totalAmount = task.budget; // No fee for escrow
        // Fetch user wallet USDC balance from blockchain
        const userBalance = await solanaService.getUsdcBalance(user.wallet_address);
        console.log(`Checking balance for wallet ${user.wallet_address}: ${userBalance} USDC`);

        // Check if user has enough balance
        if (userBalance < totalAmount) {
          return reply.code(400).send({
            success: false,
            error: 'Insufficient balance',
            details: {
              userWallet: user.wallet_address,
              currentBalance: userBalance,
              requiredAmount: totalAmount,
              shortage: parseFloat((totalAmount - userBalance).toFixed(2)),
            },
          });
        }

        // Mock: Transfer total amount to settlement wallet
        console.log(`[MOCK] Transferring ${totalAmount} USDC from user wallet ${user.wallet_address} to settlement wallet ${config.solana.settlementWalletPublicKey}`);

        // check transfer success then update status to task as payment_done
        await taskService.updateTaskStatus(taskId, 'payment_done');
        return reply.send({
          success: true,
          message: 'Escrow completed. Task Published',
          transfer: {
            fromWallet: user.wallet_address,
            toWallet: config.solana.settlementWalletPublicKey,
            totalAmount: totalAmount,
            note: 'Transfer to settlement wallet',
          },
          task: {
            taskId: task.task_id,
            userId: task.user_id,
            budget: task.budget,
            feePercent: task.fee_percent,
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

        // Check if task is verified
        if (task.status !== 'payment_done') {
          return reply.code(400).send({
            success: false,
            error: 'Task must have payment_done status before payout',
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

        // Send USDC from settlement wallet to worker wallet
        const transferAmount = task.amount;
        console.log(`Transferring ${transferAmount} USDC to recipient wallet ${recipient.wallet_address}`);
        const transferResult = await solanaService.transferToWallet(
          recipient.wallet_address,
          transferAmount
        );

        // Update task status to paid_out
        await taskService.updateTaskStatus(taskId, 'paid_out');

        return reply.send({
          success: true,
          message: 'Payout completed successfully',
          payout: {
            taskId: task.task_id,
            recipientUserId: recipient.user_id,
            recipientWallet: recipient.wallet_address,
            amount: transferAmount,
            fromWallet: config.solana.settlementWalletPublicKey,
            signature: transferResult.signature,
          },
          task: {
            taskId: task.task_id,
            status: 'paid_out',
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

        // Verify wallet address matches user's wallet
        if (user.wallet_address !== walletAddress) {
          return reply.code(400).send({
            success: false,
            error: 'Wallet address does not match user wallet',
            details: {
              providedWallet: walletAddress,
              userWallet: user.wallet_address,
            },
          });
        }

        // Fetch user wallet USDC balance from blockchain
        const userBalance = await solanaService.getUsdcBalance(user.wallet_address);
        console.log(`Checking balance for wallet ${user.wallet_address}: ${userBalance} USDC`);

        // Check if user has enough balance
        const claimAmount = parseFloat(amount.toFixed(2));
        if (userBalance < claimAmount) {
          return reply.code(400).send({
            success: false,
            error: 'Insufficient balance',
            details: {
              userWallet: user.wallet_address,
              currentBalance: userBalance,
              requiredAmount: claimAmount,
              shortage: parseFloat((claimAmount - userBalance).toFixed(2)),
            },
          });
        }

        // Mock: Transfer amount to recipient (wallet address)
        console.log(`[MOCK] Claiming ${claimAmount} USDC from user wallet ${user.wallet_address} to recipient ${walletAddress}`);

        return reply.send({
          success: true,
          message: 'Claim completed successfully',
          claim: {
            userId: user.user_id,
            fromWallet: user.wallet_address,
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

        // Get user wallet from task user_id
        const user = await userService.getUserById(task.user_id);
        if (!user) {
          return reply.code(404).send({
            success: false,
            error: 'User not found',
          });
        }

        // Refund only the task amount (fee is not refunded)
        const refundAmount = task.amount * task.quantity;

        // Transfer refund from settlement wallet to user wallet
        console.log(`[MOCK] Refunding ${refundAmount} USDC from settlement wallet ${config.solana.settlementWalletPublicKey} to user wallet ${user.wallet_address}`);

        // Update task status to refunded
        await taskService.updateTaskStatus(taskId, 'refunded');

        return reply.send({
          success: true,
          message: 'Refund completed successfully',
          refund: {
            taskId: task.task_id,
            userId: user.user_id,
            userWallet: user.wallet_address,
            fromWallet: config.solana.settlementWalletPublicKey,
            refundAmount: refundAmount,
            note: 'Refund transfer from settlement wallet to user wallet (fee not included)',
          },
          task: {
            taskId: task.task_id,
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
