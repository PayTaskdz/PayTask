import { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import { taskService } from '../services/task.service';
import { userService } from '../services/user.service';
import { SolanaService } from '../services/solanaService';
import { config } from '../config/env';
import { z } from 'zod';
import { fystackService, ASSET_CONFIG, DEFAULT_SOLANA_ASSET_ID } from '../services/fystack.service';

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
// Validation schemas
const createWalletSchema = z.object({
  walletName: z.string().min(1).max(100),
  fystackWalletId: z.string().optional(),
  fystackWorkspaceId: z.string().optional(),
  addresses: z.any().optional(),
  isActive: z.boolean().default(true)
});

const updateWalletNameSchema = z.object({
  name: z.string().min(1).max(100)
});

const withdrawSchema = z.object({
  recipientAddress: z.string().min(1),
  amount: z.number().positive(),
  assetId: z.string().min(1)
});

export const walletRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const solanaService = new SolanaService();
  // ============ Helper Functions ============
  
  // Find wallet by userId and walletId with access control
  async function findWalletByUserIdAndWalletId(userId: string, walletId: string) {
    const wallet = await fastify.prisma.wallet.findFirst({
      where: { id: walletId, userId, isActive: true },
      include: { user: true },
    });

    if (!wallet) {
      throw new Error('Wallet not found or access denied');
    }

    return wallet;
  }
  // Sync transaction to database
  async function syncTransactionToDatabase(wallet: any, latestTx: any) {
    return await fastify.prisma.transaction.upsert({
      where: { hash: latestTx.signature },
      update: {
        fromAddress: latestTx.fromAddress,
        toAddress: latestTx.toAddress,
        amount: latestTx.amount,
        type: latestTx.type,
        status: latestTx.status === 'success' ? 'confirmed' : 'failed',
        direction: latestTx.type === 'in' ? 'in' : 'out',
        fee: latestTx.metadata?.fee ? parseFloat(latestTx.metadata.fee) : null,
        blockTime: latestTx.blockTime,
        network: 'solana',
        assetSymbol: 'SOL',
        assetName: 'Solana'
      },
      create: {
        hash: latestTx.signature,
        walletId: wallet.id,
        fromAddress: latestTx.fromAddress,
        toAddress: latestTx.toAddress,
        amount: latestTx.amount,
        type: latestTx.type,
        status: latestTx.status === 'success' ? 'confirmed' : 'failed',
        direction: latestTx.type === 'in' ? 'in' : 'out',
        fee: latestTx.metadata?.fee ? parseFloat(latestTx.metadata.fee) : null,
        blockTime: latestTx.blockTime,
        network: 'solana',
        assetSymbol: 'SOL',
        assetName: 'Solana'
      }
    });
  }
  // Helper function for withdrawal verification
  async function verifyWithdrawalByPolling(
    walletId: string,
    transactionId: string,
    maxRetries: number = 10,
    delayMs: number = 5000
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const withdrawals = await fystackService.getWithdrawals(walletId, 15, 0);

        if (withdrawals?.length > 0) {
          const targetWithdrawal = withdrawals.find(w => w.id === transactionId) || withdrawals[0];

          if (targetWithdrawal.status === 'SUCCESS') {
            return true;
          } else if (targetWithdrawal.status === 'FAILED' || targetWithdrawal.status === 'REJECTED') {
            return false;
          }
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        fastify.log.error({ error }, `Polling attempt ${attempt} failed`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    return false;
  }
  // ============ Routes ============
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

        // Get user wallet from client_id in task
        const user = await userService.getUserById(task.clientId);
        if (!user) {
          return reply.code(404).send({
            success: false,
            error: 'User not found',
          });
        }

        // Calculate fee amount and total
        // const feeAmount = parseFloat(((task.amount * task.fee_percent) / 100).toFixed(2));
        // const totalAmount = parseFloat((task.amount + feeAmount).toFixed(2));
        const totalAmount = parseFloat(task.budget || '0'); // No fee for escrow

        // Check if user has wallet address
        if (!user.walletAddress) {
          return reply.code(400).send({
            success: false,
            error: 'User wallet address not found',
          });
        }

        // Fetch user wallet USDC balance from blockchain
        const userBalance = await solanaService.getUsdcBalance(user.walletAddress);
        console.log(`Checking balance for wallet ${user.walletAddress}: ${userBalance} USDC`);

        // Check if user has enough balance
        if (userBalance < totalAmount) {
          return reply.code(400).send({
            success: false,
            error: 'Insufficient balance',
            details: {
              userWallet: user.walletAddress,
              currentBalance: userBalance,
              requiredAmount: totalAmount,
              shortage: parseFloat((totalAmount - userBalance).toFixed(2)),
            },
          });
        }

        // Mock: Transfer total amount to settlement wallet
        console.log(`[MOCK] Transferring ${totalAmount} USDC from user wallet ${user.walletAddress} to settlement wallet ${config.solana.settlementWalletPublicKey}`);

        // check transfer success then update status to task as payment_done
        await taskService.updateTaskStatus(taskId, 'completed');
        return reply.send({
          success: true,
          message: 'Escrow completed. Task Published',
          transfer: {
            fromWallet: user.walletAddress,
            toWallet: config.solana.settlementWalletPublicKey,
            totalAmount: totalAmount,
            note: 'Transfer to settlement wallet',
          },
          task: {
            taskId: task.id,
            userId: task.clientId,
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

        // Check if task is verified
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

        if (!recipient.walletAddress) {
          return reply.code(400).send({
            success: false,
            error: 'Recipient wallet address not found',
          });
        }

        // Send USDC from settlement wallet to worker wallet
        const transferAmount = parseFloat(task.reward);
        console.log(`Transferring ${transferAmount} USDC to recipient wallet ${recipient.walletAddress}`);
        const transferResult = await solanaService.transferToWallet(
          recipient.walletAddress,
          transferAmount
        );

        // Update task status to completed
        await taskService.updateTaskStatus(taskId, 'completed');

        return reply.send({
          success: true,
          message: 'Payout completed successfully',
          payout: {
            taskId: task.id,
            recipientUserId: recipient.userId,
            recipientWallet: recipient.walletAddress,
            amount: transferAmount,
            fromWallet: config.solana.settlementWalletPublicKey,
            signature: transferResult.signature,
          },
          task: {
            taskId: task.id,
            status: 'completed',
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
        if (user.walletAddress !== walletAddress) {
          return reply.code(400).send({
            success: false,
            error: 'Wallet address does not match user wallet',
            details: {
              providedWallet: walletAddress,
              userWallet: user.walletAddress,
            },
          });
        }

        // Fetch user wallet USDC balance from blockchain
        const userBalance = await solanaService.getUsdcBalance(user.walletAddress);
        console.log(`Checking balance for wallet ${user.walletAddress}: ${userBalance} USDC`);

        // Check if user has enough balance
        const claimAmount = parseFloat(amount.toFixed(2));
        if (userBalance < claimAmount) {
          return reply.code(400).send({
            success: false,
            error: 'Insufficient balance',
            details: {
              userWallet: user.walletAddress,
              currentBalance: userBalance,
              requiredAmount: claimAmount,
              shortage: parseFloat((claimAmount - userBalance).toFixed(2)),
            },
          });
        }

        // Mock: Transfer amount to recipient (wallet address)
        console.log(`[MOCK] Claiming ${claimAmount} USDC from user wallet ${user.walletAddress} to recipient ${walletAddress}`);

        return reply.send({
          success: true,
          message: 'Claim completed successfully',
          claim: {
            userId: user.userId,
            fromWallet: user.walletAddress,
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

        // Refund only the task amount (fee is not refunded)
        const refundAmount = (Number(task.reward) || 0) * (Number(task.qty) || 0);

        // Transfer refund from settlement wallet to user wallet
        console.log(`[MOCK] Refunding ${refundAmount} USDC from settlement wallet ${config.solana.settlementWalletPublicKey} to user wallet ${user.walletAddress}`);

        // Update task status to refunded
        await taskService.updateTaskStatus(taskId, 'refund');

        return reply.send({
          success: true,
          message: 'Refund completed successfully',
          refund: {
            taskId: task.id,
            userId: user.userId,
            userWallet: user.walletAddress,
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
  // Create wallet
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Create a new wallet',
      tags: ['Wallets'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['walletName'],
        properties: {
          walletName: { type: 'string', minLength: 1, maxLength: 100 },
          fystackWalletId: { type: 'string' },
          fystackWorkspaceId: { type: 'string' },
          addresses: { type: 'object' },
          isActive: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const createWalletDto = createWalletSchema.parse(request.body);

      // If fystackWalletId is provided, use it (wallet already created in auth service)
      // Otherwise create a new Fystack wallet
      let fystackWallet;
      if (createWalletDto.fystackWalletId) {
        fystackWallet = {
          walletId: createWalletDto.fystackWalletId,
          workspaceId: createWalletDto.fystackWorkspaceId,
          addresses: createWalletDto.addresses,
        };
      } else {
        fystackWallet = await fystackService.createWalletForUser(createWalletDto.walletName);
      }

      const savedWallet = await fastify.prisma.wallet.create({
        data: {
          walletName: createWalletDto.walletName,
          isActive: createWalletDto.isActive,
          userId: request.user.userId,
          fystackWalletId: fystackWallet.walletId,
          fystackWorkspaceId: fystackWallet.workspaceId || '',
          addresses: fystackWallet.addresses,
        },
      });

      fastify.log.info(`Wallet created with addresses: ${JSON.stringify(savedWallet.addresses)}`);

      reply.code(201).send(savedWallet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }

      fastify.log.error({ error }, 'Create wallet error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user wallets
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get user wallets',
      tags: ['Wallets'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const wallets = await fastify.prisma.wallet.findMany({
        where: { userId: request.user.userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      reply.send(wallets);
    } catch (error) {
      fastify.log.error({ error }, 'Get wallets error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get specific wallet
  fastify.get('/:walletId', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get wallet details',
      tags: ['Wallets'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          walletId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { walletId } = request.params as { walletId: string };
      const wallet = await findWalletByUserIdAndWalletId(request.user.userId, walletId);
      reply.send(wallet);
    } catch (error) {
      if (error instanceof Error && error.message === 'Wallet not found or access denied') {
        return reply.code(404).send({ error: 'Wallet not found' });
      }
      fastify.log.error({ error }, 'Get wallet error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get USDC-Test balance from Solana blockchain
  fastify.get('/:walletId/usdc-balance', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get USDC-Test balance from Solana blockchain',
      tags: ['Wallets'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          walletId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { walletId } = request.params as { walletId: string };
      const wallet = await findWalletByUserIdAndWalletId(request.user.userId, walletId);

      // Get Solana address from wallet addresses
      const addresses = wallet.addresses as any || {};
      const solanaAddress = addresses.solana;

      if (!solanaAddress) {
        fastify.log.warn(`No Solana address found for wallet ${walletId}`);
        return reply.send({
          balance: '0',
          asset: {
            id: null,
            symbol: 'USDC',
            name: 'USDC-Test',
          },
        });
      }

      fastify.log.info(`Getting USDC-Test balance from Solana blockchain for wallet ${walletId} (address: ${solanaAddress})`);

      try {
        const usdcDevConfig = ASSET_CONFIG.USDC_DEV;

        // Get token balance directly from Solana blockchain
        const balance = await solanaService.getTokenBalance(
          solanaAddress,
          usdcDevConfig.address
        );

        reply.send({
          balance: balance.toString(),
          asset: {
            id: usdcDevConfig.address,
            symbol: usdcDevConfig.symbol,
            name: usdcDevConfig.name,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, `Failed to get USDC-Test balance from Solana for wallet ${walletId}`);
        // Return 0 balance instead of throwing error to maintain API compatibility
        reply.send({
          balance: '0',
          asset: {
            id: null,
            symbol: 'USDC',
            name: 'USDC-Test',
          },
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Wallet not found or access denied') {
        return reply.code(404).send({ error: 'Wallet not found' });
      }
      fastify.log.error({ error }, 'Get USDC balance error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get deposit address for wallet
  fastify.get('/:walletId/deposit-address', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get deposit address for wallet',
      tags: ['Wallets'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          walletId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          asset_id: { type: 'string' }
        },
        required: ['asset_id']
      }
    }
  }, async (request, reply) => {
    try {
      const { walletId } = request.params as { walletId: string };
      const { asset_id } = request.query as { asset_id: string };

      const wallet = await findWalletByUserIdAndWalletId(request.user.userId, walletId);

      fastify.log.info(`Getting deposit address for wallet ${walletId}, asset ${asset_id}`);

      const depositAddress = await fystackService.getDepositAddress(
        wallet.fystackWalletId,
        asset_id
      );

      reply.send(depositAddress);
    } catch (error) {
      if (error instanceof Error && error.message === 'Wallet not found or access denied') {
        return reply.code(404).send({ error: 'Wallet not found' });
      }
      fastify.log.error({ error }, `Failed to get deposit address for wallet`);
      reply.code(500).send({ error: 'Failed to get deposit address' });
    }
  });

  // Sync Solana address for wallet
  fastify.post('/:walletId/sync-solana-address', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Sync Solana address for wallet',
      tags: ['Wallets'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          walletId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { walletId } = request.params as { walletId: string };
      const wallet = await findWalletByUserIdAndWalletId(request.user.userId, walletId);

      fastify.log.info(`Syncing Solana address for wallet ${walletId}`);
      fastify.log.info(`Using fystackWalletId: ${wallet.fystackWalletId}`);
      fastify.log.info(`Using assetId: ${DEFAULT_SOLANA_ASSET_ID}`);

      // Get Solana deposit address from Fystack using proper asset ID
      const depositAddress = await fystackService.getDepositAddress(
        wallet.fystackWalletId,
        DEFAULT_SOLANA_ASSET_ID
      );

      // Update wallet addresses with Solana address
      const currentAddresses = wallet.addresses as any || {};
      const updatedAddresses = {
        ...currentAddresses,
        solana: depositAddress.address,
      };

      await fastify.prisma.wallet.update({
        where: { id: walletId },
        data: { addresses: updatedAddresses },
      });

      fastify.log.info(`Successfully synced Solana address for wallet ${walletId}: ${depositAddress.address}`);
      reply.send({ message: 'Solana address synced successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Wallet not found or access denied') {
        return reply.code(404).send({ error: 'Wallet not found' });
      }
      fastify.log.error({ error }, `Failed to sync Solana address for wallet`);
      reply.code(500).send({ error: 'Failed to sync Solana address' });
    }
  });

  // Get wallet transactions from database
  fastify.get('/:walletId/transactions', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get transaction history from database',
      tags: ['Wallets'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          walletId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { walletId } = request.params as { walletId: string };
      const wallet = await findWalletByUserIdAndWalletId(request.user.userId, walletId);

      // Get transactions from database
      const transactions = await fastify.prisma.transaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { blockTime: 'desc' },
      });

      // Format transactions to focus on essential information
      const formattedTransactions = transactions.map(tx => ({
        id: tx.id,
        hash: tx.hash,
        amount: tx.amount,
        assetSymbol: tx.assetSymbol,
        assetName: tx.assetName,
        type: tx.type,
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        blockTime: tx.blockTime,
        network: tx.network,
        // Calculate amount in readable format
        displayAmount: `${tx.amount} ${tx.assetSymbol}`,
        // Determine transaction direction relative to wallet
        direction: tx.type === 'IN' ? 'Received' : 'Sent',
        // Format timestamp
        timestamp: tx.blockTime.toISOString(),
        // Transaction status (completed since it's in our DB)
        status: 'Completed'
      }));

      reply.send({
        transactions: formattedTransactions,
        total: formattedTransactions.length
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Wallet not found or access denied') {
        return reply.code(404).send({ error: 'Wallet not found' });
      }
      fastify.log.error({ error }, 'Get transactions error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Withdraw funds from wallet
  fastify.post('/:walletId/withdraw', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Withdraw funds from a wallet with blockchain verification',
      tags: ['Wallets'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          walletId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['recipientAddress', 'amount', 'assetId'],
        properties: {
          recipientAddress: { type: 'string', minLength: 1 },
          amount: { type: 'number', minimum: 0 },
          assetId: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { walletId } = request.params as { walletId: string };
      const withdrawDto = withdrawSchema.parse(request.body);

      const wallet = await findWalletByUserIdAndWalletId(request.user.userId, walletId);

      const withdrawalRequest = {
        recipientAddress: withdrawDto.recipientAddress,
        amount: withdrawDto.amount,
        assetId: withdrawDto.assetId,
      };

      try {
        const result = await fystackService.createWithdrawal(
          wallet.fystackWalletId,
          withdrawalRequest,
        );

        // Verify the withdrawal by polling the Fystack API
        const isVerified = await verifyWithdrawalByPolling(
          wallet.fystackWalletId,
          result.transactionId
        );

        if (isVerified) {

          // Wait for transaction confirmation then sync
          await new Promise(resolve => setTimeout(resolve, 3000));

          try {
            const solanaAddress = (wallet.addresses as any)?.solana;
            if (solanaAddress) {
              const solanaTransactions = await solanaService.getTransactionHistory(solanaAddress, 1);
              if (solanaTransactions?.length > 0) {
                await syncTransactionToDatabase(wallet, solanaTransactions[0]);
              }
            }
          } catch (syncError) {
            fastify.log.error({ error: syncError }, `Failed to sync transaction for wallet ${walletId}`);
          }

          reply.send({
            success: true,
            transactionId: result.transactionId,
            amount: withdrawalRequest.amount,
            asset: withdrawalRequest.assetId,
            toAddress: withdrawalRequest.recipientAddress,
            network: 'solana',
            status: 'completed',
            message: 'Withdrawal completed successfully'
          });
        } else {
          reply.send({
            success: false,
            transactionHash: null,
            amount: withdrawalRequest.amount,
            asset: withdrawalRequest.assetId,
            toAddress: withdrawalRequest.recipientAddress,
            network: 'solana',
            status: 'failed',
            message: 'Withdrawal verification failed'
          });
        }
      } catch (error) {
        fastify.log.error({ error }, `Withdrawal failed for wallet ${walletId}`);
        reply.send({
          success: false,
          transactionHash: null,
          amount: withdrawalRequest.amount,
          asset: withdrawalRequest.assetId,
          toAddress: withdrawalRequest.recipientAddress,
          network: 'solana',
          status: 'failed',
          message: 'Withdrawal failed to execute'
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }
      if (error instanceof Error && error.message === 'Wallet not found or access denied') {
        return reply.code(404).send({ error: 'Wallet not found' });
      }
      fastify.log.error({ error }, 'Withdraw error');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}