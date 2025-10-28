import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { SolanaService } from '../services/solanaService';
import { z } from 'zod';
import { fystackService, ASSET_CONFIG, DEFAULT_SOLANA_ASSET_ID } from '../services/fystack.service';
// Validation schemas
const createWalletSchema = z.object({
  walletName: z.string().min(1).max(100),
  fystackWalletId: z.string().optional(),
  fystackWorkspaceId: z.string().optional(),
  addresses: z.any().optional(),
  isActive: z.boolean().default(true)
});

const withdrawSchema = z.object({
  amount: z.number().positive(),
  assetId: z.string().min(1),
  recipientAddress: z.string().min(1)
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
  // Process withdrawal
  async function processWithdrawal(
    wallet: any,
    withdrawalRequest: {
      recipientAddress: string;
      amount: number;
      assetId: string;
    }
  ) {
    try {
      fastify.log.info(`Processing withdrawal from settlement wallet to ${withdrawalRequest.recipientAddress}`);
      fastify.log.info(`Amount: ${withdrawalRequest.amount} USDC`);

      // Transfer USDC from settlement wallet to recipient using SolanaService
      const result = await solanaService.sendUsdcFromSettlement(
        withdrawalRequest.recipientAddress,
        withdrawalRequest.amount
      );

      fastify.log.info(`Withdrawal successful. Transaction signature: ${result.signature}`);

      // Save transaction to database
      try {
        await fastify.prisma.transaction.create({
          data: {
            hash: result.signature,
            walletId: wallet.id,
            fromAddress: solanaService.getSettlementWalletAddress(),
            toAddress: withdrawalRequest.recipientAddress,
            amount: result.amount.toString(),
            type: 'OUT',
            status: 'confirmed',
            direction: 'out',
            network: 'solana',
            assetSymbol: 'USDC',
            assetName: 'USD Coin',
            blockTime: new Date(),
          }
        });
        fastify.log.info(`Transaction saved to database: ${result.signature}`);
      } catch (dbError) {
        fastify.log.error({ error: dbError }, 'Failed to save transaction to database');
        // Continue even if DB save fails
      }

      return {
        success: true,
        transactionId: result.signature,
        amount: withdrawalRequest.amount,
        asset: withdrawalRequest.assetId,
        toAddress: withdrawalRequest.recipientAddress,
        fromAddress: solanaService.getSettlementWalletAddress(),
        network: 'solana',
        status: 'completed',
        message: 'Withdrawal completed successfully'
      };
    } catch (error) {
      fastify.log.error({ error }, `Withdrawal failed for wallet ${wallet.id}`);
      return {
        success: false,
        transactionHash: null,
        amount: withdrawalRequest.amount,
        asset: withdrawalRequest.assetId,
        toAddress: withdrawalRequest.recipientAddress,
        network: 'solana',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Withdrawal failed to execute'
      };
    }
  }
  // ============ Routes ============

  // Create wallet
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Create a new wallet',
      tags: ['Wallet'],
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
      tags: ['Wallet'],
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
      tags: ['Wallet'],
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
      tags: ['Wallet'],
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
      tags: ['Wallet'],
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
      tags: ['Wallet'],
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
      tags: ['Wallet'],
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
      description: 'Withdraw funds from settlement wallet to user-specified address',
      tags: ['Wallet'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          walletId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['amount', 'assetId', 'recipientAddress'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          assetId: { type: 'string', minLength: 1 },
          recipientAddress: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { walletId } = request.params as { walletId: string };
      const withdrawDto = withdrawSchema.parse(request.body);

      const wallet = await findWalletByUserIdAndWalletId(request.user.userId, walletId);

      fastify.log.info(`User ${request.user.userId} withdrawing to address: ${withdrawDto.recipientAddress}`);

      const withdrawalRequest = {
        recipientAddress: withdrawDto.recipientAddress,
        amount: withdrawDto.amount,
        assetId: withdrawDto.assetId,
      };

      // Process withdrawal using helper function
      const result = await processWithdrawal(wallet, withdrawalRequest);
      reply.send(result);
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