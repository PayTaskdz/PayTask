import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { config } from '../config';
import bs58 from 'bs58';

export class SolanaService {
  private connection: Connection;
  private settlementWallet: Keypair;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    
    // Initialize settlement wallet from private key
    if (config.solana.settlementWalletPrivateKey) {
      try {
        const privateKeyBytes = bs58.decode(config.solana.settlementWalletPrivateKey);
        this.settlementWallet = Keypair.fromSecretKey(privateKeyBytes);
        console.log('Settlement wallet initialized:', this.settlementWallet.publicKey.toString());
      } catch (error) {
        console.error('Failed to initialize settlement wallet:', error);
        throw new Error('Invalid settlement wallet private key');
      }
    } else {
      throw new Error('Settlement wallet private key not configured');
    }
  }


  /**
   * Get settlement wallet balance
   */
  async getSettlementBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.settlementWallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Get USDC token balance for a wallet
   */
  async getUsdcBalance(walletAddress: string): Promise<number> {
    try {
      const walletPublicKey = new PublicKey(walletAddress);
      const usdcMint = new PublicKey(config.solana.usdcMintAddress);

      // Get associated token account address
      const tokenAccountAddress = await getAssociatedTokenAddress(
        usdcMint,
        walletPublicKey
      );

      try {
        // Get token account balance
        const tokenAccountInfo = await this.connection.getTokenAccountBalance(tokenAccountAddress);
        
        if (tokenAccountInfo.value.uiAmount !== null) {
          return tokenAccountInfo.value.uiAmount;
        }
        return 0;
      } catch (error) {
        // Token account doesn't exist, balance is 0
        console.log(`No USDC token account found for ${walletAddress}`);
        return 0;
      }
    } catch (error) {
      console.error('Error getting USDC balance:', error);
      throw new Error('Failed to get USDC balance');
    }
  }

  /**
   * Send USDC tokens from settlement wallet to a recipient
   */
  async sendUsdcFromSettlement(
    recipientPublicKey: string,
    amountInUsdc: number
  ): Promise<{ signature: string; amount: number }> {
    try {
      const recipient = new PublicKey(recipientPublicKey);
      const usdcMint = new PublicKey(config.solana.usdcMintAddress);

      // USDC has 6 decimals
      const amountInSmallestUnit = Math.floor(amountInUsdc * 1_000_000);
      console.log(`Preparing to send ${amountInUsdc} USDC (${amountInSmallestUnit} smallest unit) to ${recipientPublicKey}`);

      // Get or create associated token accounts
      const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.settlementWallet,
        usdcMint,
        this.settlementWallet.publicKey
      );

      const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.settlementWallet,
        usdcMint,
        recipient
      );

      // Create transfer instruction
      const transaction = new Transaction().add(
        createTransferInstruction(
          fromTokenAccount.address,
          toTokenAccount.address,
          this.settlementWallet.publicKey,
          amountInSmallestUnit
        )
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.settlementWallet.publicKey;

      // Sign and send transaction
      transaction.sign(this.settlementWallet);
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize()
      );

      // Confirm transaction
      await this.connection.confirmTransaction(signature, 'confirmed');

      console.log(`Sent ${amountInUsdc} USDC to ${recipientPublicKey}, signature: ${signature}`);

      return {
        signature,
        amount: amountInUsdc,
      };
    } catch (error) {
      console.error('Error sending USDC from settlement wallet:', error);
      throw new Error('Failed to send USDC from settlement wallet');
    }
  }

  /**
   * Transfer USDC from settlement wallet to user wallet
   * Helper method for payout and refund operations
   */
  async transferToWallet(
    recipientWallet: string,
    amount: number
  ): Promise<{ signature: string; amount: number }> {
    try {
      const result = await this.sendUsdcFromSettlement(recipientWallet, amount);
      console.log(`Transferred ${amount} USDC from settlement wallet to ${recipientWallet}, signature: ${result.signature}`);
      return result;
    } catch (error) {
      console.error('Error transferring from settlement wallet:', error);
      throw new Error('Failed to transfer from settlement wallet');
    }
  }
}

export const solanaService = new SolanaService();
