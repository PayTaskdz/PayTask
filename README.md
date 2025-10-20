# PayTask Backend Worker API

> High-performance worker task management API built with Fastify + TypeScript

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.0-black)](https://www.fastify.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.0-red)](https://redis.io/)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Setup database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Start server
npm run dev
```

**API Documentation:** http://localhost:3000/docs

---

## 📚 Complete Documentation

**👉 [Read the Complete Guide](./COMPLETE_GUIDE.md)**

The complete guide includes:
- ✅ Detailed API documentation
- ✅ Setup & installation guide
- ✅ Feature explanations
- ✅ Testing guide
- ✅ Troubleshooting
- ✅ Best practices

---

## 🎯 Key Features

- **Task Discovery** - Browse and filter available tasks with caching
- **Assignment System** - Accept tasks with optimistic locking (first wins)
- **Submission System** - Submit work with automated QA checks
- **Early Bonus** - Get bonus reputation for early submission (capped at 5.0)
- **Swagger UI** - Interactive API documentation
- **Redis Caching** - Fast data retrieval
- **Type Safe** - Full TypeScript support

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/discover` | Browse available tasks |
| GET | `/api/tasks/all` | Get all tasks |
| GET | `/api/tasks/:taskId` | Get task details |
| POST | `/api/tasks/assignments/accept` | Accept a task |
| GET | `/api/tasks/assignments/my-assignments` | Get worker assignments |
| GET | `/api/tasks/assignments/list` | List assignments with pagination |
| POST | `/api/submissions/create` | Submit completed work |
| GET | `/api/submissions/:id` | Get submission details |
| GET | `/api/stats/tasks` | Get task statistics |
| GET | `/api/stats/categories` | Get task categories |
| POST | `/api/stats/cache/clear` | Clear cache |

**Full API documentation:** [COMPLETE_GUIDE.md](./COMPLETE_GUIDE.md#api-endpoints)

---

## 🧪 Test IDs

### Worker IDs (Pre-seeded)
- Worker 1: `550e8400-e29b-41d4-a716-446655440004`
- Worker 2: `550e8400-e29b-41d4-a716-446655440006`

### Task IDs (Available)
- Task 1: `550e8400-e29b-41d4-a716-446655440010`
- Task 2: `550e8400-e29b-41d4-a716-446655440011`
- ... (8 available tasks total)

### Assignment IDs (Pre-assigned)
- Assignment 1: `550e8400-e29b-41d4-a716-446655440020`
- Assignment 2: `550e8400-e29b-41d4-a716-446655440021`

---

## 🛠️ Tech Stack

- **Framework:** Fastify 4.x
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 14+
- **ORM:** Prisma 5.x
- **Cache:** Redis 7.x
- **File Upload:** @fastify/multipart
- **Image Processing:** Sharp
- **Job Queue:** Bull
- **API Docs:** Swagger/OpenAPI
- **Validation:** Zod

---

## 📖 Documentation Files

- **[COMPLETE_GUIDE.md](./COMPLETE_GUIDE.md)** - Comprehensive documentation
- **[test-api.http](./test-api.http)** - REST client test cases
- **[test-concurrent-accept.http](./test-concurrent-accept.http)** - Race condition tests

---

## 🐛 Troubleshooting

### Empty Response?
- Check if database is seeded: `npm run prisma:seed`
- Use correct worker IDs (see Test IDs above)
- Clear cache: `POST /api/stats/cache/clear`

### Server Won't Start?
- Check if port 3000 is available
- Verify PostgreSQL is running
- Verify Redis is running

### More help?
See [Troubleshooting section](./COMPLETE_GUIDE.md#troubleshooting) in complete guide.

---

## 📄 License

MIT

---

## 🙋 Support

For detailed documentation, see **[COMPLETE_GUIDE.md](./COMPLETE_GUIDE.md)**
