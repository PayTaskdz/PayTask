# PayTask - Decentralized Task Marketplace

> Kết nối người giao việc và người nhận việc, thanh toán tức thì bằng USDC trên Solana blockchain.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.0-black)](https://www.fastify.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-blue)](https://www.postgresql.org/)
[![Solana](https://img.shields.io/badge/Solana-Devnet-purple)](https://solana.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

---

## 🎯 PayTask Là Gì?

PayTask là nền tảng marketplace **phi tập trung** giúp:

- 👔 **Clients** đăng công việc và tìm worker có kỹ năng
- 👷 **Workers** tìm việc phù hợp và kiếm USDC
- 💰 **Thanh toán tự động** sau khi hoàn thành công việc
- 🔐 **Bảo mật** với blockchain và smart escrow

### ✨ Điểm Khác Biệt

| Tính năng | PayTask | Freelance truyền thống |
|-----------|---------|------------------------|
| Thanh toán | ⚡ Tức thì (USDC) | 🐌 3-14 ngày |
| Phí giao dịch | 🎯 Thấp (~1-2%) | 💸 Cao (20-30%) |
| Bảo mật | 🔐 Blockchain | ⚠️ Trung gian |
| Tranh chấp | 🤖 Tự động | 📧 Email support |
| QA kiểm tra | ✅ Tự động | 👀 Thủ công |

---

## 🚀 Bắt Đầu Nhanh (5 phút)

### 1️⃣ Clone & Install

```bash
git clone https://github.com/PayTaskdz/PayTask.git
cd PayTask
npm install
```

### 2️⃣ Setup Database

```bash
# Copy environment
cp .env.example .env

# Run migrations
npx prisma migrate dev

# Seed test data
npx prisma db seed
```

### 3️⃣ Start Services

**Backend (Terminal 1):**

```bash
npm run dev
```

✅ API: <http://localhost:3000>

**Frontend (Terminal 2):**

```bash
cd frontend/frontendpaytask
npm install
npm run dev
```

✅ Web: <http://localhost:3001>

### 4️⃣ Test

- 🌐 Mở web: <http://localhost:3001>
- 📚 API docs: <http://localhost:3000/api-docs>
- 🔑 Login: `client1@paytask.com` / `password123`

---

## � Tài Liệu Chi Tiết

### 🎓 Cho User

- **[QUICK_START.md](./QUICK_START.md)** ⭐ Bắt đầu ngay!
  - Hướng dẫn cho Client (người giao việc)
  - Hướng dẫn cho Worker (người nhận việc)
  - Setup & troubleshooting

### � Cho Developer

- **[COMPLETE_GUIDE.md](./COMPLETE_GUIDE.md)** - Tài liệu kỹ thuật đầy đủ
- **[TASK_FLOW_INTEGRATION.md](./TASK_FLOW_INTEGRATION.md)** - Task flow architecture
- **[NOTIFICATION_API.md](./NOTIFICATION_API.md)** - Notification system
- **[POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md)** - API testing guide

---

## 🏗️ Kiến Trúc Hệ Thống

```ascii
┌─────────────────────────────────────────────────────────────┐
│                     PAYTASK ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │──────│   Backend    │──────│  Blockchain │
│  (Next.js)  │ HTTP │  (Fastify)   │ RPC  │   (Solana)  │
└─────────────┘      └──────────────┘      └─────────────┘
       │                    │                      │
       │                    ├──────┐               │
       │                    │      │               │
       │              ┌─────▼───┐  │         ┌────▼────┐
       │              │  Cache  │  │         │  USDC   │
       │              │ (Redis) │  │         │ Wallet  │
       │              └─────────┘  │         └─────────┘
       │                    │      │
       │              ┌─────▼───┐  │
       └──────────────│Database │◄─┘
                      │(Postgres)│
                      └──────────┘
```

### Tech Stack

**Backend:**

- ⚡ Fastify - Fast web framework
- 🗃️ Prisma - Type-safe ORM
- 🐘 PostgreSQL - Main database
- 🔴 Redis - Caching & sessions
- 🟣 Solana Web3.js - Blockchain integration
- 📦 Bull - Job queue

**Frontend:**

- ⚛️ Next.js 14 - React framework
- 🎨 TailwindCSS - Styling
- 🧩 shadcn/ui - UI components
- 🔄 React Query - Data fetching
- 📡 Axios - HTTP client

**Blockchain:**

- 💰 Solana - Layer 1 blockchain
- 🪙 USDC - Stablecoin payment
- 🔐 Solana wallet adapter

---

## � Demo Flow

### Client Journey

```
1. Đăng nhập → client1@paytask.com
2. Tạo task: "Nhập liệu 100 sản phẩm" - Reward: 50 USDC
3. Publish task → Hiển thị trên marketplace
4. Đợi worker submit
5. Review & Accept
6. 💰 Tự động chuyển 50 USDC cho worker
```

### Worker Journey

```
1. Đăng nhập → worker1@paytask.com
2. Browse tasks → Filter theo category, reward
3. Accept task → Bắt đầu làm việc
4. Upload file kết quả
5. Submit → Chờ review
6. 🎉 Nhận 50 USDC vào wallet
```

---

## 🔑 Features

### ✅ Core Features

- [x] Task discovery với advanced filters
- [x] Assignment system với optimistic locking
- [x] File upload & validation
- [x] QA checks tự động
- [x] Review & rating system
- [x] USDC payment integration
- [x] Real-time notifications
- [x] Wallet management

### 🚧 Coming Soon

- [ ] Multi-language support
- [ ] Mobile app
- [ ] Escrow smart contracts
- [ ] Dispute resolution system
- [ ] Advanced analytics dashboard
- [ ] Reputation-based rewards

---

## � API Endpoints

### Authentication

- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất

### Tasks

- `GET /api/tasks/discover` - Tìm tasks
- `POST /api/tasks` - Tạo task (Client)
- `POST /api/tasks/publish/:id` - Publish task
- `GET /api/tasks/:id` - Chi tiết task

### Assignments

- `POST /api/assignments/accept` - Accept task (Worker)
- `GET /api/assignments/user/:userId` - My assignments

### Submissions

- `POST /api/uploads/files` - Upload file
- `POST /api/submissions` - Submit work
- `GET /api/submissions/:id` - Submission details

### Reviews

- `POST /api/reviews/accept` - Accept & pay (Client)
- `POST /api/reviews/reject` - Reject submission

### Wallet

- `GET /api/users/me` - Profile & wallet balance
- `GET /api/wallet/transactions` - Transaction history

**📚 Full API docs:** <http://localhost:3000/api-docs>

---

## 🧪 Testing

### Postman Collection

Import 2 files:

- `PayTask-API-Fixed.postman_collection.json`
- `PayTask-Development.postman_environment.json`

### Test Accounts

**Clients:**

| Email | Password | Role |
|-------|----------|------|
| `client1@paytask.com` | `password123` | Client |
| `client2@paytask.com` | `password123` | Client |

**Workers:**

| Email | Password | Reputation |
|-------|----------|------------|
| `worker1@paytask.com` | `password123` | ⭐⭐⭐⭐ |
| `worker2@paytask.com` | `password123` | ⭐⭐⭐ |

### Run Tests

```bash
# Backend tests
npm test

# E2E tests
npm run test:e2e

# API tests (Postman)
./run-api-tests.sh   # Unix/Mac
run-api-tests.bat    # Windows
```

---

## � Security

### Authentication

- ✅ JWT tokens với refresh mechanism
- ✅ Password hashing (bcrypt)
- ✅ Session management (Redis)
- ✅ Rate limiting

### Payment Security

- ✅ Solana wallet encryption
- ✅ Transaction timeout protection
- ✅ Payment verification
- ✅ Signature validation

### Data Protection

- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection
- ✅ CORS configuration
- ✅ File upload validation

---

## 🛠️ Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Solana CLI (optional)

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/paytask"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Solana
SOLANA_NETWORK="devnet"
SETTLEMENT_WALLET_PRIVATE_KEY="your-private-key"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### Scripts

```bash
# Development
npm run dev              # Start backend
npm run dev:frontend     # Start frontend

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed data
npm run db:studio        # Open Prisma Studio

# Build
npm run build            # Build backend
npm run build:frontend   # Build frontend

# Production
npm start                # Start backend
npm run start:frontend   # Start frontend
```

---

## 📈 Monitoring

### Health Checks

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "uptime": 123.45,
  "checks": {
    "database": "connected",
    "redis": "connected",
    "blockchain": "connected"
  }
}
```

### Logs

```bash
# Backend logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Payment logs
tail -f logs/payment.log
```

---

## 🤝 Contributing

Chúng tôi hoan nghênh mọi đóng góp!

1. Fork repo
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Code Style

```bash
# Format code
npm run format

# Lint
npm run lint

# Type check
npm run type-check
```

---

## � License

MIT License - see [LICENSE](./LICENSE)

---

## 📞 Support

### Documentation

- 📖 [Quick Start Guide](./QUICK_START.md)
- 📖 [Complete Guide](./COMPLETE_GUIDE.md)
- 📖 [API Reference](http://localhost:3000/api-docs)

### Contact

- 📧 Email: support@paytask.com
- 💬 Discord: [Join server](https://discord.gg/paytask)
- 🐦 Twitter: [@PayTaskHQ](https://twitter.com/PayTaskHQ)
- 📺 YouTube: [PayTask Channel](https://youtube.com/@PayTask)

### Issues

Found a bug? [Open an issue](https://github.com/PayTaskdz/PayTask/issues)

---

## 🙏 Acknowledgments

Built with ❤️ using:

- [Fastify](https://www.fastify.io/)
- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Solana](https://solana.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---

## 🎯 Roadmap

### Q4 2025

- [x] MVP Launch
- [x] Basic task flow
- [x] USDC payments
- [ ] Mobile app beta

### Q1 2026

- [ ] Escrow smart contracts
- [ ] Multi-chain support
- [ ] Advanced analytics
- [ ] DAO governance

### Q2 2026

- [ ] Enterprise features
- [ ] API marketplace
- [ ] White-label solution

---

**⭐ Nếu thấy hữu ích, hãy cho repo một star!**

*Last Updated: October 31, 2025*
