import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Asset configuration
export const ASSET_CONFIG = {
  SOLANA: {
    id: 'd10f85c1-a89d-439f-b488-57cd06b064d5',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
  },
  USDC_DEV: {
    address: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
    symbol: 'USDC-DEV',
    name: 'USD Coin Dev',
    decimals: 6,
  },
};

export const DEFAULT_SOLANA_ASSET_ID = ASSET_CONFIG.SOLANA.id;

export interface FystackWalletResult {
  workspaceId: string;
  walletId: string;
  addresses: {
    ethereum?: string;
    bitcoin?: string;
    solana?: string;
    tron?: string;
  };
  sessionCookie: string;
}

export interface FystackBalance {
  network: string;
  token: string;
  balance: string;
  usdValue?: string;
}

export interface FystackWithdrawalRequest {
  recipientAddress: string;
  amount: number;
  assetId: string;
}

export interface FystackWithdrawalResult {
  transactionId: string;
  status: string;
  hash?: string;
}

export interface FystackWithdrawal {
  id: string;
  wallet_id: string;
  wallet_name: string;
  amount: string;
  status: string;
  recipient_address: string;
  asset: any;
  creator: any;
  approvals: any[];
  created_at: string;
  notes: string;
}

export class FystackService {
  private axiosInstance: AxiosInstance | null;
  private sessionCookie: string = '';
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || console;

    const baseUrl = process.env.FYSTACK_API_URL;
    const timeout = parseInt(process.env.FYSTACK_TIMEOUT || '30000');

    if (!baseUrl) {
      this.logger.warn('FYSTACK_API_URL is not configured. FystackService will be disabled.');
      this.axiosInstance = null;
    } else {
      this.axiosInstance = axios.create({
        baseURL: baseUrl,
        timeout: timeout,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  }

  async initialize(): Promise<void> {
    if (!this.axiosInstance) return;

    const email = process.env.FYSTACK_EMAIL;
    const password = process.env.FYSTACK_PASSWORD;
    const workspaceId = process.env.FYSTACK_WORKSPACE_ID;

    if (!email || !password || !workspaceId || email === 'YOUR_FYSTACK_EMAIL_HERE') {
      this.logger.warn('Fystack service account is not configured. FystackService will be disabled.');
      return;
    }

    await this.ensureAuthenticated();
  }

  /**
   * Check if FyStack service is available and connected
   */
  async checkConnection(): Promise<{ connected: boolean; message: string }> {
    if (!this.axiosInstance) {
      return { connected: false, message: 'FyStack service is disabled (no API URL configured)' };
    }

    const email = process.env.FYSTACK_EMAIL;
    const password = process.env.FYSTACK_PASSWORD;
    const workspaceId = process.env.FYSTACK_WORKSPACE_ID;

    if (!email || !password || !workspaceId || email === 'YOUR_FYSTACK_EMAIL_HERE') {
      return { connected: false, message: 'FyStack credentials not configured' };
    }

    try {
      await this.ensureAuthenticated();
      return { connected: true, message: 'FyStack connected successfully' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { connected: false, message: `FyStack connection failed: ${errorMsg}` };
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.sessionCookie) {
      return; // Already authenticated
    }

    const email = process.env.FYSTACK_EMAIL;
    const password = process.env.FYSTACK_PASSWORD;
    const workspaceId = process.env.FYSTACK_WORKSPACE_ID;

    // Retry mechanism to handle service startup race conditions
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        if (!this.axiosInstance) {
          throw new Error('Axios instance is not initialized');
        }

        const signInResponse = await this.axiosInstance.post('/authentication/sign-in', { email, password });
        let cookie = this.extractSessionCookie(signInResponse);

        const sessionResponse = await this.axiosInstance.post('/authentication/start-session', { workspace_id: workspaceId }, { headers: { Cookie: cookie } });
        this.sessionCookie = this.extractSessionCookie(sessionResponse) || cookie;

        return; // Exit on success
      } catch (error) {
        if (attempt === 5) {
          this.logger.error('Failed to authenticate Fystack service account after 5 attempts');
          this.sessionCookie = '';
          throw new Error('Failed to authenticate Fystack service account');
        } else {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
        }
      }
    }
  }

  async createWalletForUser(username: string): Promise<FystackWalletResult> {
    if (!this.axiosInstance) {
      this.logger.error('FystackService axiosInstance is null. Service is disabled.');
      throw new Error('FystackService is disabled.');
    }

    await this.ensureAuthenticated();

    try {
      const workspaceId = process.env.FYSTACK_WORKSPACE_ID;

      const walletPayload = {
        name: `${username} Wallet`,
        wallet_type: 'mpc',
        workspace_id: workspaceId,
      };

      const walletResponse = await this.axiosInstance.post('/wallets', walletPayload, { headers: { Cookie: this.sessionCookie } });
      const wallet = walletResponse.data.data;
      const newWalletId = wallet.wallet_id;

      // Automatically update the wallet settings post-creation (non-blocking)
      const settingsToUpdate = {
        auto_approval_limit_usd: 999999999999, // A very large number
        threshold: 1,
        disabled: false,
      };

      // Don't await this - let it run in background and don't fail wallet creation if it fails
      this.updateWalletSettings(newWalletId, settingsToUpdate).catch(error => {
        this.logger.warn(`Settings update failed for wallet ${newWalletId}, but wallet creation was successful:`, error.message);
      });

      // Get deposit address for Solana with retry logic
      const addresses: any = {};

      try {
        const solanaAddressResult = await this.getDepositAddressWithRetry(newWalletId, DEFAULT_SOLANA_ASSET_ID);
        addresses.solana = solanaAddressResult.address;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to get Solana address for wallet ${newWalletId}:`, errorMsg);
      }

      return {
        workspaceId: workspaceId || '',
        walletId: newWalletId,
        addresses: addresses,
        sessionCookie: this.sessionCookie,
      };
    } catch (error) {
      this.logger.error(`Failed to create Fystack wallet for ${username}:`, error);
      throw new Error('Failed to create wallet');
    }
  }

  async checkWalletStatus(walletId: string): Promise<any> {
    await this.ensureAuthenticated();

    if (!this.axiosInstance) {
      throw new Error('Axios instance is not initialized');
    }

    try {
      const response = await this.axiosInstance.get(
        `/wallets/${walletId}`,
        { headers: { Cookie: this.sessionCookie } },
      );
      return response.data;
    } catch (error) {
      const errorResponse = (error as any)?.response;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to check wallet status for ${walletId}:`, errorResponse?.data || errorMsg);
      throw error;
    }
  }

  async getWalletOverview(walletId: string): Promise<any[]> {
    await this.ensureAuthenticated();

    const limit = 100;
    let offset = 0;
    let allAssets = [];
    let hasMore = true;

    if (!this.axiosInstance) {
      throw new Error('Axios instance is not initialized');
    }

    while (hasMore) {
      try {
        const response = await this.axiosInstance.get(
          `/wallets/${walletId}/overview`,
          {
            params: { offset, limit },
            headers: { Cookie: this.sessionCookie },
          },
        );

        const assets = response.data.data;

        if (assets && Array.isArray(assets) && assets.length > 0) {
          allAssets.push(...assets);
          offset += limit;
        } else {
          hasMore = false;
        }
      } catch (error) {
        const errorResponse = (error as any)?.response;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to get overview for wallet ${walletId}:`, errorResponse?.data || errorMsg);
        throw new Error('Failed to get wallet overview');
      }
    }

    return allAssets;
  }

  async createWithdrawal(
    walletId: string,
    withdrawalRequest: FystackWithdrawalRequest,
  ): Promise<FystackWithdrawalResult> {
    await this.ensureAuthenticated();

    try {
      const payload = {
        recipient_address: withdrawalRequest.recipientAddress,
        amount: withdrawalRequest.amount.toString(),
        asset_id: withdrawalRequest.assetId,
        notes: "",
      };

      if (!this.axiosInstance) {
        throw new Error('Axios instance is not initialized');
      }

      const response = await this.axiosInstance.post(
        `/wallets/${walletId}/withdrawal`,
        payload,
        { headers: { Cookie: this.sessionCookie } },
      );

      const withdrawalData = response.data.data;

      return {
        transactionId: withdrawalData.id,
        status: withdrawalData.status,
        hash: withdrawalData.transaction?.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to create withdrawal for wallet ${walletId}:`, error);
      throw new Error('Failed to create withdrawal');
    }
  }

  async getWithdrawals(walletId: string, limit: number = 15, offset: number = 0): Promise<FystackWithdrawal[]> {
    await this.ensureAuthenticated();

    if (!this.axiosInstance) {
      throw new Error('Axios instance is not initialized');
    }

    try {
      const response = await this.axiosInstance.get(
        `/wallets/${walletId}/withdrawals`,
        {
          params: { limit, offset },
          headers: { Cookie: this.sessionCookie },
        },
      );
      return response.data.data;
    } catch (error) {
      const errorResponse = (error as any)?.response;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get withdrawals for wallet ${walletId}:`, errorResponse?.data || errorMsg);
      throw new Error('Failed to get withdrawals');
    }
  }

  async updateWalletSettings(
    walletId: string,
    settings: { auto_approval_limit_usd: number; threshold: number; disabled: boolean },
  ): Promise<void> {
    await this.ensureAuthenticated();

    // Retry logic for wallet that might not be immediately available
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.axiosInstance) {
          throw new Error('Axios instance is not initialized');
        }

        const walletResponse = await this.axiosInstance.get(
          `/wallets/${walletId}`,
          { headers: { Cookie: this.sessionCookie } },
        );

        const walletData = walletResponse.data.data || walletResponse.data;
        const walletName = walletData.name || 'Wallet';

        const settingsWithName = {
          ...settings,
          name: walletName,
        };

        await this.axiosInstance.patch(
          `/wallets/${walletId}/settings`,
          settingsWithName,
          { headers: { Cookie: this.sessionCookie } },
        );

        return; // Success, exit the retry loop

      } catch (error: any) {
        const isNotFoundError = error.response?.data?.message?.includes('Not found') ||
                               error.response?.status === 404;

        if (isNotFoundError && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        this.logger.error(`Failed to update settings for wallet ${walletId}:`, error.response?.data || error.message);

        // If this is the last attempt or not a "not found" error, stop retrying
        if (attempt === maxRetries || !isNotFoundError) {
          break;
        }
      }
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getDepositAddressWithRetry(walletId: string, assetId: string, maxRetries: number = 5, delayMs: number = 2000): Promise<{ address: string }> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          await this.sleep(delayMs);
        }

        const result = await this.getDepositAddress(walletId, assetId);
        return result;
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries) {
          break;
        }
      }
    }

    throw lastError;
  }

  async getDepositAddress(walletId: string, assetId: string): Promise<{ address: string }> {
    await this.ensureAuthenticated();

    if (!this.axiosInstance) {
      throw new Error('Axios instance is not initialized');
    }

    try {
      const response = await this.axiosInstance.get(
        `/wallets/${walletId}/deposit-address`,
        {
          params: { asset_id: assetId },
          headers: { Cookie: this.sessionCookie },
        },
      );
      return response.data.data;
    } catch (error) {
      const errorResponse = (error as any)?.response;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get deposit address for wallet ${walletId}:`, errorResponse?.data || errorMsg);
      throw new Error('Failed to get deposit address');
    }
  }

  private extractSessionCookie(response: AxiosResponse): string {
    const setCookieHeader = response.headers['set-cookie'];
    return setCookieHeader ? setCookieHeader.join('; ') : '';
  }
}

// Global FyStack service instance
export const fystackService = new FystackService();
