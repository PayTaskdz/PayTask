import { prisma } from '../config/prisma';
import { fystackService } from './fystack.service';
import { solanaService } from './solanaService';
import { FastifyInstance } from 'fastify';

class WalletService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  // Find wallet by userId and walletId with access control
  async findWalletByUserIdAndWalletId(userId: string, walletId: string) {
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId, isActive: true },
      include: { user: true },
    });

    if (!wallet) {
      throw new Error('Wallet not found or access denied');
    }

    return wallet;
  }
  
  // Find wallet by userId
  async findWalletByUserId(userId: string) {
    const wallet = await prisma.wallet.findFirst({
      where: { userId, isActive: true },
    });

    if (!wallet) {
      throw new Error('Wallet not found for this user');
    }

    return wallet;
  }

  // Sync transaction to database
  async syncTransactionToDatabase(wallet: any, latestTx: any) {
    return await prisma.transaction.upsert({
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
  async verifyWithdrawalByPolling(
    walletId: string,
    transactionId: string,
    maxRetries: number = 10,
    delayMs: number = 5000
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const withdrawals = await fystackService.getWithdrawals(walletId, 15, 0);

        if (withdrawals?.length > 0) {
          const targetWithdrawal = withdrawals.find((w: any) => w.id === transactionId) || withdrawals[0];

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
        this.fastify.log.error({ error }, `Polling attempt ${attempt} failed`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    return false;
  }

  // Process withdrawal logic
  async processWithdrawal(wallet: any, withdrawalRequest: { recipientAddress: string; amount: number; assetId: string; }) {
    try {
      const result = await fystackService.createWithdrawal(
        wallet.fystackWalletId,
        withdrawalRequest,
      );

      // Verify the withdrawal by polling the Fystack API
      const isVerified = await this.verifyWithdrawalByPolling(
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
              await this.syncTransactionToDatabase(wallet, solanaTransactions[0]);
            }
          }
        } catch (syncError) {
          this.fastify.log.error({ error: syncError }, `Failed to sync transaction for wallet ${wallet.id}`);
        }

        return {
          success: true,
          transactionId: result.transactionId,
          amount: withdrawalRequest.amount,
          asset: withdrawalRequest.assetId,
          toAddress: withdrawalRequest.recipientAddress,
          network: 'solana',
          status: 'completed',
          message: 'Withdrawal completed successfully'
        };
      } else {
        return {
          success: false,
          transactionHash: null,
          amount: withdrawalRequest.amount,
          asset: withdrawalRequest.assetId,
          toAddress: withdrawalRequest.recipientAddress,
          network: 'solana',
          status: 'failed',
          message: 'Withdrawal verification failed'
        };
      }
    } catch (error) {
      this.fastify.log.error({ error }, `Withdrawal failed for wallet ${wallet.id}`);
      return {
        success: false,
        transactionHash: null,
        amount: withdrawalRequest.amount,
        asset: withdrawalRequest.assetId,
        toAddress: withdrawalRequest.recipientAddress,
        network: 'solana',
        status: 'failed',
        message: 'Withdrawal failed to execute'
      };
    }
  }
}

export { WalletService };

