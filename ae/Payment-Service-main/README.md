# Backend Payment Service

A backend service for processing Solana-based payments with task-based workflow management.

## Features

- **Task-Based Payment Flow**: Create tasks with amounts and fees
- **Fund Instructions**: Get settlement wallet address and amount to transfer
- **Payment Verification**: Verify on-chain transactions match expected amounts
- **Automated USDC Payouts**: Send USDC funds minus fees to recipient wallets

## Tech Stack

- **TypeScript**: Type-safe development
- **Fastify**: Fast and efficient web framework
- **Solana Web3.js**: Interact with Solana blockchain
- **PostgreSQL**: Reliable database storage
- **dotenv**: Environment configuration management

## Project Structure

```
back-end-payment/
├── src/
│   ├── config/
│   │   └── index.ts          # Configuration management
│   ├── db/
│   │   ├── db.ts             # Database connection handler
│   │   └── tables/
│   │       └── task.ts       # Task table schema & service
│   ├── routes/
│   │   ├── index.ts          # Route registration
│   │   └── wallet.ts         # Payment-related routes
│   ├── services/
│   │   ├── encryptionService.ts  # AES-256 encryption service
│   │   └── solanaService.ts      # Solana blockchain interactions
│   └── index.ts              # Application entry point
├── .env.example              # Environment variables template
├── package.json
└── tsconfig.json
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=payment_db
DB_USER=postgres
DB_PASSWORD=your_password

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
USDC_MINT_ADDRESS=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr

# Settlement Wallet (both public and private keys)
SETTLEMENT_WALLET_PUBLIC_KEY=your_settlement_wallet_public_key_here
SETTLEMENT_WALLET_PRIVATE_KEY=your_settlement_wallet_private_key_here

# Encryption (Use a strong 32-character key for production)
ENCRYPTION_KEY=your-32-character-secret-key-here

# Server Configuration
PORT=3000
HOST=0.0.0.0
```

### 3. Setup PostgreSQL Database

Make sure PostgreSQL is installed and running. The database will be created automatically when you start the server.

### 4. Run the Application

```bash
npm run dev
```


