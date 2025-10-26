import { Connection, PublicKey, ConfirmedSignatureInfo, ParsedTransactionWithMeta } from '@solana/web3.js';

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
  metadata?: {
    fee: string;
    feeInLamports: number;
    computeUnitsConsumed?: number;
    instructionCount: number;
    isSuccessful: boolean;
    confirmationStatus: string;
    programIds?: string[];
    instructionTypes?: string[];
  };
}

export class SolanaService {
  private connection: Connection;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://solana-devnet.g.alchemy.com/v2/vHX215j9gH01Qc94rX2eEAsLeYohIu9X';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async getTransactionHistory(address: string, limit: number = 100): Promise<SolanaTransactionData[]> {
    try {
      const publicKey = new PublicKey(address);
      
      // Get confirmed signatures for the address
      const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });
      
      const transactions: SolanaTransactionData[] = [];
      
      for (const signatureInfo of signatures) {
        try {
          const transaction = await this.connection.getParsedTransaction(signatureInfo.signature, {
            maxSupportedTransactionVersion: 0
          });
          
          if (transaction && transaction.blockTime) {
            const txData = this.parseTransaction(transaction, signatureInfo, address);
            if (txData) {
              transactions.push(txData);
            }
          }
        } catch (error) {
          console.error(`Error parsing transaction ${signatureInfo.signature}:`, error);
          // Continue with next transaction
        }
      }
      
      return transactions;
    } catch (error) {
      console.error('Error fetching Solana transaction history:', error);
      throw new Error('Failed to fetch transaction history from Solana');
    }
  }

  private parseTransaction(
    transaction: ParsedTransactionWithMeta,
    signatureInfo: ConfirmedSignatureInfo,
    walletAddress: string
  ): SolanaTransactionData | null {
    try {
      const { signature, slot, blockTime, err } = signatureInfo;

      if (!transaction.meta || !blockTime) {
        return null;
      }

      // Determine transaction status - more accurate check
      const status = err ? 'failed' : 'success';

      // Parse pre and post balances to determine amount and direction
      const accountKeys = transaction.transaction.message.accountKeys;
      const preBalances = transaction.meta.preBalances;
      const postBalances = transaction.meta.postBalances;

      let amount = '0';
      let fromAddress = '';
      let toAddress = '';
      let direction = 'OUT';

      // Find the wallet's account index
      const walletIndex = accountKeys.findIndex(key =>
        key.pubkey.toString() === walletAddress
      );

      if (walletIndex !== -1) {
        const preBalance = preBalances[walletIndex];
        const postBalance = postBalances[walletIndex];
        const balanceChange = postBalance - preBalance;

        // Account for transaction fees in calculation
        const fee = transaction.meta.fee || 0;

        if (balanceChange > 0) {
          direction = 'IN';
          amount = (balanceChange / 1e9).toFixed(9); // More precision for SOL
          fromAddress = this.findSender(accountKeys, preBalances, postBalances, walletIndex);
          toAddress = walletAddress;
        } else if (balanceChange < 0) {
          direction = 'OUT';
          // For outgoing transactions, subtract the fee to get actual transfer amount
          const actualTransferAmount = Math.abs(balanceChange) - fee;
          amount = (actualTransferAmount / 1e9).toFixed(9);
          fromAddress = walletAddress;
          toAddress = this.findReceiver(accountKeys, preBalances, postBalances, walletIndex);
        }
      }

      return {
        externalId: signature,
        walletId: walletAddress,
        type: direction, // Use IN/OUT instead of complex type determination
        amount,
        status,
        fromAddress,
        toAddress,
        blockTime: new Date(blockTime * 1000),
        slot,
        signature,
        metadata: {
          fee: (transaction.meta.fee / 1e9).toFixed(9), // Convert fee to SOL
          feeInLamports: transaction.meta.fee,
          computeUnitsConsumed: transaction.meta.computeUnitsConsumed || 0,
          instructionCount: transaction.transaction.message.instructions.length,
          isSuccessful: !err,
          confirmationStatus: 'finalized',
          programIds: transaction.transaction.message.instructions
            .map(ix => 'programId' in ix ? ix.programId.toString() : 'Unknown')
            .filter((id, index, arr) => arr.indexOf(id) === index), // Remove duplicates
          instructionTypes: transaction.transaction.message.instructions
            .map(ix => 'parsed' in ix && ix.parsed?.type ? ix.parsed.type : 'Unknown')
        }
      };
    } catch (error) {
      console.error('Error parsing individual transaction:', error);
      return null;
    }
  }

  private findSender(accountKeys: any[], preBalances: number[], postBalances: number[], excludeIndex: number): string {
    // Find the account with the largest negative balance change (excluding fees)
    let maxDecrease = 0;
    let senderIndex = -1;

    for (let i = 0; i < accountKeys.length; i++) {
      if (i !== excludeIndex && !accountKeys[i].signer) { // Skip system accounts
        const balanceChange = postBalances[i] - preBalances[i];
        if (balanceChange < 0 && Math.abs(balanceChange) > maxDecrease) {
          maxDecrease = Math.abs(balanceChange);
          senderIndex = i;
        }
      }
    }

    return senderIndex !== -1 ? accountKeys[senderIndex].pubkey.toString() : 'Unknown';
  }

  private findReceiver(accountKeys: any[], preBalances: number[], postBalances: number[], excludeIndex: number): string {
    // Find the account with the largest positive balance change
    let maxIncrease = 0;
    let receiverIndex = -1;

    for (let i = 0; i < accountKeys.length; i++) {
      if (i !== excludeIndex && !accountKeys[i].signer) { // Skip system accounts
        const balanceChange = postBalances[i] - preBalances[i];
        if (balanceChange > 0 && balanceChange > maxIncrease) {
          maxIncrease = balanceChange;
          receiverIndex = i;
        }
      }
    }

    return receiverIndex !== -1 ? accountKeys[receiverIndex].pubkey.toString() : 'Unknown';
  }



  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw new Error('Failed to fetch balance from Solana');
    }
  }

  async getTokenBalance(address: string, tokenMintAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const tokenMint = new PublicKey(tokenMintAddress);

      // Get token accounts for this wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: tokenMint
      });

      if (tokenAccounts.value.length === 0) {
        return 0; // No token account found
      }

      // Get the balance from the first token account
      const tokenAccount = tokenAccounts.value[0];
      const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;

      return balance || 0;
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0; // Return 0 instead of throwing to maintain API compatibility
    }
  }

  async getAccountInfo(address: string) {
    try {
      const publicKey = new PublicKey(address);
      return await this.connection.getAccountInfo(publicKey);
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw new Error('Failed to fetch account info from Solana');
    }
  }
}
