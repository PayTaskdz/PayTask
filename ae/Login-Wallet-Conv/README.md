# Login Wallet Backend

Một backend API được xây dựng bằng **Fastify** cung cấp xác thực người dùng an toàn sử dụng **JWT tokens** và tích hợp với **Fystack** để quản lý ví MPC cùng với **Solana** cho các tương tác blockchain.

## 🌟 Tính năng chính

- ✅ **Xác thực an toàn**: Hệ thống JWT token để tăng cường bảo mật
- ✅ **Quản lý ví MPC**: Tích hợp với Fystack để tự động tạo và quản lý ví người dùng
- ✅ **Tương tác Solana**: Lấy số dư SOL và lịch sử giao dịch trực tiếp từ blockchain Solana
- ✅ **Quản lý phiên**: Hỗ trợ nhiều phiên người dùng, đăng xuất và đăng xuất tất cả
- ✅ **Cơ sở dữ liệu PostgreSQL**: Sử dụng Prisma ORM để lưu trữ dữ liệu bền vững
- ✅ **Mã hóa Argon2**: Mã hóa mật khẩu hiện đại để bảo vệ thông tin đăng nhập
- ✅ **Tài liệu Swagger**: Tài liệu API tương tác OpenAPI 3.0 cho tất cả endpoints
- ✅ **Docker-Ready**: Đi kèm với Dockerfile để thiết lập dễ dàng
- ✅ **Kiểm tra sức khỏe**: Endpoints để giám sát tình trạng dịch vụ

## 🛠 Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| **Framework** | Fastify |
| **Ngôn ngữ** | TypeScript |
| **Cơ sở dữ liệu** | PostgreSQL |
| **ORM** | Prisma |
| **Xác thực** | JWT Tokens |
| **Mã hóa mật khẩu** | Argon2 |
| **Dịch vụ ví** | Fystack MPC |
| **Blockchain** | Solana Web3.js |
| **Container hóa** | Docker |

## 🚀 Bắt đầu

### Yêu cầu

- [Node.js](https://nodejs.org/en/) (v18 trở lên)
- [Docker](https://www.docker.com/)
- PostgreSQL database
- Một instance đang chạy của [Fystack Self-Host Scripts](https://github.com/fystack/fystack-selfhost-scripts)

### 1. Clone Repository

```bash
git clone <your-repository-url>
cd login-wallet-backend
```

### 2. Cấu hình biến môi trường

Tạo file `.env` trong thư mục gốc:

```env
# Application
PORT=3000

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/login_wallet_db"

# JWT and Session
JWT_SECRET=your-strong-jwt-secret

# Fystack API
FYSTACK_API_URL=http://localhost:8150/api/v1
FYSTACK_EMAIL=your-fystack-email@example.com
FYSTACK_PASSWORD=your-fystack-password
FYSTACK_WORKSPACE_ID=your-fystack-workspace-id
FYSTACK_TIMEOUT=30000

# Solana
SOLANA_RPC_URL=https://solana-devnet.g.alchemy.com/v2/your-api-key
```

### 3. Cài đặt Dependencies

```bash
npm install
```

### 4. Chạy ứng dụng

**A. Sử dụng Docker (Khuyến nghị):**

```bash
# Build Docker image
docker build -t login-wallet-fastify .

# Run container
docker run -p 3000:3000 --env-file .env login-wallet-fastify
```

**B. Development cục bộ:**

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start với hot-reloading
npm run dev
```

### 5. Truy cập ứng dụng

- **API Server**: `http://localhost:3000`
- **Swagger UI**: `http://localhost:3000/api`
- **Health Check**: `http://localhost:3000/health`

## 🏗 Kiến trúc tổng quan

```
src/
├── routes/            # API routes và handlers
│   ├── auth.ts        # Authentication endpoints
│   ├── wallets.ts     # Wallet management endpoints
│   └── health.ts      # Health check endpoints
├── services/          # Business logic services
│   ├── fystack.service.ts  # Fystack MPC wallet integration
│   └── solana.service.ts   # Solana blockchain integration
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── plugins/           # Fastify plugins
└── server.ts          # Entry point của ứng dụng
```

## 📚 API Reference

Base URL: `http://localhost:3000`

Tất cả endpoints yêu cầu Bearer Token authentication trừ khi có ghi chú khác.

### 🔐 Authentication

| Method | Endpoint             | Mô tả | Auth Required |
| :----- | :------------------- | :---- | :-----------: |
| `POST` | `/auth/register`     | Đăng ký người dùng mới và tự động tạo ví MPC | ❌ |
| `POST` | `/auth/login`        | Đăng nhập và nhận access token | ❌ |
| `POST` | `/auth/logout`       | Đăng xuất phiên hiện tại | ✅ |
| `POST` | `/auth/logout-all`   | Đăng xuất tất cả phiên của người dùng | ✅ |
| `POST` | `/auth/refresh`      | Làm mới access token hết hạn | ✅ |
| `POST` | `/auth/introspect`   | Xác thực opaque token (cho microservices) | ❌ |
| `GET`  | `/auth/me`           | Lấy thông tin người dùng hiện tại | ✅ |
| `GET`  | `/auth/sessions`     | Lấy tất cả phiên hoạt động | ✅ |
| `DELETE`| `/auth/sessions/:sessionId`| Vô hiệu hóa phiên cụ thể | ✅ |

#### Request/Response Examples

**POST /auth/register**
```json
// Request
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "CLIENT" // optional, default: "CLIENT"
}

// Response (201)
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "expiresAt": "2024-01-01T12:00:00.000Z",
    "user": {
      "id": "user_123",
      "email": "john@example.com",
      "username": "john_doe",
      "role": "CLIENT",
      "isActive": true,
      "createdAt": "2024-01-01T11:00:00.000Z"
    },
    "wallet": {
      "id": "wallet_456",
      "name": "john_doe's Wallet",
      "addresses": {
        "solana": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
      },
      "isActive": true,
      "createdAt": "2024-01-01T11:00:00.000Z"
    },
    "session": {
      "id": "session_789",
      "createdAt": "2024-01-01T11:00:00.000Z",
      "expiresAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

**POST /auth/login**
```json
// Request
{
  "email": "john@example.com",
  "password": "securepassword123"
}

// Response (200)
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "expiresAt": "2024-01-01T12:00:00.000Z",
    "user": { /* user object */ },
    "wallet": { /* wallet object */ },
    "session": { /* session object */ }
  }
}
```

### [object Object]allets

| Method | Endpoint                           | Mô tả | Auth Required |
| :----- | :--------------------------------- | :---- | :-----------: |
| `POST` | `/wallets`                         | Tạo ví mới cho người dùng | ✅ |
| `GET`  | `/wallets`                         | Lấy danh sách ví của người dùng | ✅ |
| `GET`  | `/wallets/:walletId`               | Lấy chi tiết ví cụ thể | ✅ |
| `GET`  | `/wallets/:walletId/usdc-balance`  | Lấy số dư USDC-Test từ Solana blockchain | ✅ |
| `GET`  | `/wallets/:walletId/transactions`  | Lấy lịch sử giao dịch của ví | ✅ |
| `POST` | `/wallets/:walletId/withdraw`      | Rút tiền từ ví với xác thực blockchain | ✅ |
| `GET`  | `/wallets/:walletId/deposit-address`| Lấy địa chỉ deposit cho asset cụ thể | ✅ |
| `POST` | `/wallets/:walletId/sync-solana-address`| Đồng bộ địa chỉ Solana cho ví | ✅ |

#### Request/Response Examples

**POST /wallets**
```json
// Request
{
  "walletName": "My Trading Wallet"
}

// Response (201)
{
  "id": "wallet_456",
  "walletName": "My Trading Wallet",
  "userId": "user_123",
  "fystackWalletId": "fystack_wallet_789",
  "fystackWorkspaceId": "fystack_workspace_101",
  "addresses": {
    "solana": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  },
  "isActive": true,
  "createdAt": "2024-01-01T11:00:00.000Z",
  "updatedAt": "2024-01-01T11:00:00.000Z"
}
```

**GET /wallets/:walletId/usdc-balance**
```json
// Response (200)
{
  "balance": "1500.50",
  "asset": {
    "id": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "symbol": "USDC",
    "name": "USDC-Test"
  }
}
```

**POST /wallets/:walletId/withdraw**
```json
// Request
{
  "recipientAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "amount": 100.5,
  "assetId": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
}

// Response (200)
{
  "success": true,
  "transactionId": "tx_123456",
  "amount": 100.5,
  "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "toAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "network": "solana",
  "status": "completed",
  "message": "Withdrawal completed successfully"
}
```

**GET /wallets/:walletId/deposit-address?asset_id=SOL**
```json
// Response (200)
{
  "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "asset": {
    "id": "SOL",
    "symbol": "SOL",
    "name": "Solana"
  },
  "network": "solana"
}
```

###[object Object]Health Checks

| Method | Endpoint      | Mô tả | Auth Required |
| :----- | :------------ | :---- | :-----------: |
| `GET`  | `/health`     | Kiểm tra sức khỏe cơ bản của service | ❌ |
| `GET`  | `/health/ready`| Readiness probe cho Kubernetes | ❌ |
| `GET`  | `/health/live` | Liveness probe cho Kubernetes | ❌ |

#### Request/Response Examples

**GET /health**
```json
// Response (200)
{
  "status": "ok",
  "timestamp": "2024-01-01T11:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

**GET /health/ready**
```json
// Response (200)
{
  "status": "ready",
  "checks": {
    "database": "ok"
  }
}
```

## 🧪 Testing và Linting

```bash
# Linting
npm run lint

# Testing
npm run test

# Test coverage
npm run test:cov

# E2E testing
npm run test:e2e
```

## 🐳 Docker Commands

```bash
# Build và start tất cả services
docker-compose up --build -d

# Xem logs
docker-compose logs -f

# Stop tất cả services
docker-compose down

# Xóa volumes (cẩn thận - sẽ mất dữ liệu)
docker-compose down -v
```

## 📄 License

Dự án này được cấp phép theo MIT License.
