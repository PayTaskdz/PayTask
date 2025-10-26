import { PrismaClient, TransactionStatus, TransactionDirection } from '@prisma/client';

interface SolanaTransactionData {
  externalId: string;
  walletId: string;
  type: string;
  amount: string;
  status: string;
  fromAddress: string;
  toAddress: string;
  blockTime: Date;
  slot: number;
  signature: string;
  metadata?: any;
}

export class TransactionsService {
  constructor(private prisma: PrismaClient) {}

  private mapStatusToEnum(status: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      'confirmed': TransactionStatus.confirmed,
      'pending': TransactionStatus.pending,
      'failed': TransactionStatus.failed,
      'pending_approval': TransactionStatus.pending_approval,
      // Handle uppercase variants as well
      'CONFIRMED': TransactionStatus.confirmed,
      'PENDING': TransactionStatus.pending,
      'FAILED': TransactionStatus.failed,
      'PENDING_APPROVAL': TransactionStatus.pending_approval,
    };

    return statusMap[status] || TransactionStatus.pending;
  }

  async syncTransactions(
    walletId: string,
    solanaTransactions: SolanaTransactionData[],
  ): Promise<void> {
    console.log(`Syncing ${solanaTransactions.length} Solana transactions for wallet ${walletId}`);

    for (const tx of solanaTransactions) {
      const mappedStatus = this.mapStatusToEnum(tx.status);
      
      await this.prisma.transaction.upsert({
        where: { hash: tx.signature },
        update: {
          status: mappedStatus,
          blockTime: tx.blockTime,
        },
        create: {
          walletId,
          hash: tx.signature,
          fromAddress: tx.fromAddress,
          toAddress: tx.toAddress,
          amount: tx.amount,
          network: 'Solana',
          assetSymbol: 'SOL',
          assetName: 'Solana',
          fee: '0', // Fee calculation can be added later if needed
          direction: tx.toAddress === walletId ? TransactionDirection.in : TransactionDirection.out,
          type: tx.type,
          status: mappedStatus,
          blockTime: tx.blockTime,
        },
      });
    }
  }

  async findByWalletId(walletId: string) {
    return this.prisma.transaction.findMany({
      where: { walletId },
      orderBy: { blockTime: 'desc' },
    });
  }

  async findByHash(hash: string) {
    return this.prisma.transaction.findUnique({
      where: { hash }
    });
  }

  async getTransactionStats(walletId: string) {
    const [totalTransactions, pendingCount, confirmedCount, failedCount] = await Promise.all([
      this.prisma.transaction.count({
        where: { walletId }
      }),
      this.prisma.transaction.count({
        where: { walletId, status: TransactionStatus.pending }
      }),
      this.prisma.transaction.count({
        where: { walletId, status: TransactionStatus.confirmed }
      }),
      this.prisma.transaction.count({
        where: { walletId, status: TransactionStatus.failed }
      })
    ]);

    return {
      total: totalTransactions,
      pending: pendingCount,
      confirmed: confirmedCount,
      failed: failedCount
    };
  }

  async getRecentTransactions(walletId: string, limit: number = 10) {
    return this.prisma.transaction.findMany({
      where: { walletId },
      orderBy: { blockTime: 'desc' },
      take: limit
    });
  }

  async deleteTransactionsByWalletId(walletId: string) {
    return this.prisma.transaction.deleteMany({
      where: { walletId }
    });
  }
}
