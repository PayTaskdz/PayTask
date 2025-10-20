# Quick Start Guide 🚀

Get the PayTask Worker API running in 5 minutes!

## Prerequisites

Before starting, make sure you have:
- ✅ Node.js 18+ installed
- ✅ PostgreSQL running (local or Docker)
- ✅ Redis running (local or Docker)

## Option 1: Quick Start with Docker (Recommended)

### 1. Start PostgreSQL and Redis with Docker:

```bash
# PostgreSQL
docker run --name paytask-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=paytask -p 5432:5432 -d postgres:14

# Redis
docker run --name paytask-redis -p 6379:6379 -d redis:6-alpine
```

### 2. Configure Environment:

```bash
# Create .env file (already done if you used the example)
echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/paytask?schema=public" > .env
echo "REDIS_HOST=localhost" >> .env
echo "REDIS_PORT=6379" >> .env
echo "PORT=3000" >> .env
```

### 3. Set Up Database:

```bash
# Run migrations
npm run prisma:migrate

# Seed with sample data
npm run prisma:seed
```

### 4. Start the Server:

```bash
npm run dev
```

### 5. Test the API:

Open your browser to:
- 📚 **Swagger Docs**: http://localhost:3000/api-docs
- 💚 **Health Check**: http://localhost:3000/health
- 🔍 **Task Discovery**: http://localhost:3000/api/tasks/discover

---

## Option 2: Without Docker

### 1. Install PostgreSQL and Redis locally:

**Windows:**
- PostgreSQL: https://www.postgresql.org/download/windows/
- Redis: https://github.com/microsoftarchive/redis/releases (or use WSL)

**Mac:**
```bash
brew install postgresql@14 redis
brew services start postgresql@14
brew services start redis
```

**Linux:**
```bash
sudo apt update
sudo apt install postgresql-14 redis-server
sudo systemctl start postgresql
sudo systemctl start redis
```

### 2. Create Database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE paytask;
\q
```

### 3. Configure Environment:

Create `.env` file:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/paytask?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
NODE_ENV=development
```

### 4. Set Up Database:

```bash
npm run prisma:migrate
npm run prisma:seed
```

### 5. Start the Server:

```bash
npm run dev
```

---

## Testing the API

### Using cURL:

```bash
# Get all available tasks
curl "http://localhost:3000/api/tasks/discover"

# Filter by category
curl "http://localhost:3000/api/tasks/discover?category=transcription"

# Filter by reward range
curl "http://localhost:3000/api/tasks/discover?minReward=20&maxReward=50"

# Sort by reward
curl "http://localhost:3000/api/tasks/discover?sortBy=reward&order=desc"
```

### Using Swagger UI:

1. Open http://localhost:3000/api-docs
2. Find the `/api/tasks/discover` endpoint
3. Click "Try it out"
4. Add your filters (optional)
5. Click "Execute"

### Using VS Code REST Client:

Open `test-api.http` file and click "Send Request" on any endpoint.

---

## What You Should See

### Task Discovery Response:

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "title": "Transcribe 10-minute audio file",
        "description": "Clear English audio transcription needed...",
        "category": "transcription",
        "reward": "15.50",
        "qty": 1,
        "deadline": "2025-10-25T10:00:00.000Z",
        "status": "open",
        "createdAt": "2025-10-18T...",
        "client": {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "country": "UK"
        },
        "escrow": {
          "amount": "17.05",
          "status": "held"
        },
        "_count": {
          "assignments": 0
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

---

## Troubleshooting

### "ECONNREFUSED" Error:
- **PostgreSQL**: Check if running: `docker ps` or `pg_isready`
- **Redis**: Check if running: `docker ps` or `redis-cli ping`

### "Unable to determine transport target for pino-pretty":
```bash
npm install pino-pretty --save-dev
```

### Prisma Client Errors:
```bash
npm run prisma:generate
```

### Database Not Found:
```bash
npm run prisma:migrate
```

### Port Already in Use:
Change `PORT=3001` in `.env` file

---

## Next Steps

1. ✅ Explore the Swagger documentation
2. ✅ Test different query parameters
3. ✅ View data in Prisma Studio: `npm run prisma:studio`
4. ✅ Read the full API documentation in README.md
5. ✅ Check SETUP.md for detailed configuration

---

## Sample Data

After running `npm run prisma:seed`, you'll have:
- **1 Client User** (client@example.com)
- **1 Worker User** (worker@example.com)
- **8 Tasks** in various categories:
  - transcription
  - data-entry
  - translation
  - categorization
  - research
  - moderation
  - customer-support

All tasks are in "open" status with "held" escrow, ready to be discovered!

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build           # Build for production
npm start               # Start production server

# Database
npm run prisma:migrate  # Run migrations
npm run prisma:seed     # Seed database
npm run prisma:studio   # Open Prisma Studio
npm run prisma:reset    # Reset database (careful!)

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format with Prettier
```

---

## Support

Having issues? Check:
1. Environment variables in `.env`
2. PostgreSQL and Redis are running
3. Database migrations completed
4. Node.js version is 18+

For more help, see SETUP.md or README.md

