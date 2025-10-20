# Quick Setup Guide

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up PostgreSQL

Option A: Using Docker
```bash
docker run --name paytask-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=paytask -p 5432:5432 -d postgres:14
```

Option B: Install locally from https://www.postgresql.org/download/

### 3. Set Up Redis

Option A: Using Docker
```bash
docker run --name paytask-redis -p 6379:6379 -d redis:6-alpine
```

Option B: Install locally from https://redis.io/download

### 4. Configure Environment

Create `.env` file:
```bash
# Copy example
cp .env.example .env

# Edit with your settings
DATABASE_URL="postgresql://user:password@localhost:5432/paytask?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 5. Set Up Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Optional: Seed with sample data
npm run prisma:seed
```

### 6. Start Development Server

```bash
npm run dev
```

### 7. Access the API

- API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api-docs
- Health Check: http://localhost:3000/health

## Testing the Task Discovery Endpoint

### Example 1: Get all tasks
```bash
curl "http://localhost:3000/api/tasks/discover"
```

### Example 2: Filter by category
```bash
curl "http://localhost:3000/api/tasks/discover?category=transcription"
```

### Example 3: Filter by reward range
```bash
curl "http://localhost:3000/api/tasks/discover?minReward=10&maxReward=50"
```

### Example 4: Sort by reward
```bash
curl "http://localhost:3000/api/tasks/discover?sortBy=reward&order=desc"
```

### Example 5: With pagination
```bash
curl "http://localhost:3000/api/tasks/discover?page=1&limit=10"
```

### Example 6: Combined filters
```bash
curl "http://localhost:3000/api/tasks/discover?category=transcription&minReward=10&sortBy=reward&order=desc&page=1&limit=20"
```

## Troubleshooting

### Port Already in Use
```bash
# Change PORT in .env file
PORT=3001
```

### Database Connection Error
```bash
# Check PostgreSQL is running
docker ps
# Or
pg_isready

# Verify DATABASE_URL in .env
```

### Redis Connection Error
```bash
# Check Redis is running
docker ps
# Or
redis-cli ping

# Verify REDIS_HOST and REDIS_PORT in .env
```

### Prisma Client Not Generated
```bash
npm run prisma:generate
```

## Next Steps

1. Create sample tasks using Prisma Studio: `npm run prisma:studio`
2. Test the API using Swagger UI at http://localhost:3000/api-docs
3. Review the API documentation in README.md
4. Configure AWS S3 for file uploads (optional for now)

## Production Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use secure passwords for PostgreSQL and Redis
- Configure proper CORS origins
- Set up AWS S3 credentials
- Use environment-specific DATABASE_URL

### Recommended Production Setup
- Use PM2 for process management
- Set up NGINX as reverse proxy
- Enable SSL/TLS certificates
- Configure proper logging
- Set up monitoring (e.g., Sentry, DataDog)
- Use managed PostgreSQL and Redis services
