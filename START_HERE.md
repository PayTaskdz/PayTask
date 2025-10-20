# 🚀 START HERE - PayTask Worker API

## You're 3 Steps Away from Running Your API!

---

## Step 1️⃣: Start Database Services

### Option A: Docker (Easiest) ⭐

```bash
# Start PostgreSQL
docker run --name paytask-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=paytask \
  -p 5432:5432 \
  -d postgres:14

# Start Redis
docker run --name paytask-redis \
  -p 6379:6379 \
  -d redis:6-alpine
```

### Option B: Local Installation
See QUICKSTART.md for local installation instructions.

---

## Step 2️⃣: Configure Environment

Create a `.env` file in the `paytask-backend-worker` directory:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/paytask?schema=public"
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

CORS_ORIGINS=http://localhost:3000,http://localhost:3001
CACHE_TTL=300
```

💡 **Tip:** Copy from `ENV_TEMPLATE.txt` for all options

---

## Step 3️⃣: Initialize & Run

```bash
# Initialize database
npm run prisma:migrate

# Add sample data (8 tasks)
npm run prisma:seed

# Start the server 🎉
npm run dev
```

---

## ✅ Verify It's Working

### 1. Open Swagger Documentation
http://localhost:3000/api-docs

### 2. Check Health
http://localhost:3000/health

### 3. Test Task Discovery
http://localhost:3000/api/tasks/discover

You should see 8 sample tasks!

---

## 🎯 Quick Tests

### Test 1: Get All Tasks
```bash
curl http://localhost:3000/api/tasks/discover
```

### Test 2: Filter by Category
```bash
curl "http://localhost:3000/api/tasks/discover?category=transcription"
```

### Test 3: Sort by Reward
```bash
curl "http://localhost:3000/api/tasks/discover?sortBy=reward&order=desc"
```

---

## 📚 Next Steps

1. ✅ **Explore Swagger UI** - Try all the endpoints interactively
2. ✅ **Read PROJECT_SUMMARY.md** - Understand what you have
3. ✅ **Open Prisma Studio** - View your data: `npm run prisma:studio`
4. ✅ **Read README.md** - Full API documentation

---

## 🆘 Troubleshooting

### Server won't start?
```bash
# Check if ports are free
netstat -an | findstr "3000"  # Windows
lsof -i :3000                 # Mac/Linux

# Check if PostgreSQL is running
docker ps

# Check if Redis is running
docker ps
```

### Database connection error?
- Verify PostgreSQL is running: `docker ps`
- Check DATABASE_URL in `.env`

### Redis connection error?
- Verify Redis is running: `docker ps`
- Check REDIS_HOST and REDIS_PORT in `.env`

### "Prisma Client not generated"?
```bash
npm run prisma:generate
```

---

## 🎉 That's It!

Your Fastify backend with Swagger is now running at:
- **API:** http://localhost:3000
- **Docs:** http://localhost:3000/api-docs

Enjoy exploring the API! 🚀

