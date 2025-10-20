# PayTask Worker API

A Fastify-based backend API for task discovery, acceptance, and submission management for workers.

## 🚀 Features

- **Task Discovery**: Browse and filter available tasks
- **Fastify Framework**: High-performance Node.js web framework
- **PostgreSQL Database**: Reliable data storage with Prisma ORM
- **Redis Caching**: Fast response times with intelligent caching
- **File Upload Support**: Handle multipart file uploads
- **AWS S3 Integration**: Secure file storage
- **Image Processing**: Automatic image optimization with Sharp
- **Job Queue**: Background processing with Bull
- **Swagger Documentation**: Interactive API documentation
- **TypeScript**: Full type safety

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis 6+
- AWS Account (for S3)

## 🛠️ Installation

1. **Clone the repository**
```bash
cd paytask-backend-worker
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/paytask?schema=public"
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=paytask-submissions

CORS_ORIGINS=http://localhost:3000,http://localhost:3001
CACHE_TTL=300
```

4. **Generate Prisma Client**
```bash
npm run prisma:generate
```

5. **Run database migrations**
```bash
npm run prisma:migrate
```

6. **Seed the database (optional)**
```bash
npm run prisma:seed
```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **API Root**: http://localhost:3000/

## 🔍 API Endpoints

### Task Discovery

**Endpoint:** `GET /api/tasks/discover`

**Description:** List all available tasks with filtering and pagination

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| category | string | No | - | Task category filter |
| minReward | number | No | - | Minimum reward (USD) |
| maxReward | number | No | - | Maximum reward (USD) |
| sortBy | enum | No | createdAt | Sort field: createdAt, reward, deadline |
| order | enum | No | desc | Sort order: asc, desc |
| page | integer | No | 1 | Page number (1-based) |
| limit | integer | No | 20 | Items per page (max 100) |

**Example Request:**
```bash
curl "http://localhost:3000/api/tasks/discover?category=transcription&minReward=10&sortBy=reward&order=desc&page=1&limit=20"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Transcribe 10-minute audio file",
        "description": "Clear English audio transcription needed",
        "category": "transcription",
        "reward": "15.50",
        "qty": 1,
        "deadline": "2025-10-25T10:00:00Z",
        "status": "open",
        "createdAt": "2025-10-18T10:00:00Z",
        "client": {
          "id": "client-uuid",
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
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### Get Task by ID

**Endpoint:** `GET /api/tasks/:taskId`

**Description:** Get detailed information about a specific task

**Example Request:**
```bash
curl "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000"
```

## 🏗️ Project Structure

```
paytask-backend-worker/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Database seeding
├── src/
│   ├── config/
│   │   ├── env.ts            # Environment configuration
│   │   ├── prisma.ts         # Prisma client
│   │   ├── redis.ts          # Redis configuration
│   │   ├── s3.ts             # AWS S3 configuration
│   │   └── bull.ts           # Bull queue configuration
│   ├── types/
│   │   └── task.types.ts     # Type definitions
│   ├── services/
│   │   └── task.service.ts   # Business logic
│   ├── routes/
│   │   └── task.routes.ts    # API routes
│   ├── workers/
│   │   └── file-processor.ts # Background job processor
│   ├── app.ts                # Fastify app configuration
│   └── server.ts             # Server entry point
├── package.json
├── tsconfig.json
└── .env
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed the database
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🎯 Key Features Explained

### Task Discovery Logic

The task discovery endpoint implements the following business rules:

1. **Status Filtering**: Only shows tasks with `status = 'open'`
2. **Escrow Validation**: Only shows tasks with `escrow.status = 'held'`
3. **Worker Exclusion**: Excludes tasks the worker has already accepted (if authenticated)
4. **Category Filter**: Filter by task category
5. **Reward Range**: Filter by minimum and maximum reward
6. **Sorting**: Sort by createdAt, reward, or deadline
7. **Pagination**: Efficient pagination with configurable page size

### Caching Strategy

- Redis caching is implemented for task discovery results
- Cache key includes all query parameters for accurate cache hits
- Default TTL: 300 seconds (5 minutes)
- Cache is automatically cleared when tasks are updated

### File Processing

- Multipart file uploads are supported
- Images are automatically optimized using Sharp
- Files are stored in AWS S3
- Background processing using Bull queue

## 🔐 Security Features

- **Helmet.js**: Sets security headers
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Zod schema validation
- **Error Handling**: Comprehensive error handling

## 🐳 Docker Support (Optional)

Create a `docker-compose.yml` for local development:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: paytask
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## 📝 License

MIT

## 👥 Support

For issues and questions, please contact the PayTask Team.
