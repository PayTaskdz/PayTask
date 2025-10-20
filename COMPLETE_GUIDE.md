# 📚 PayTask Backend Worker - Complete Guide

> Comprehensive documentation for the PayTask Worker Backend API built with Fastify + TypeScript

---

## 📑 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Setup & Installation](#setup--installation)
4. [API Endpoints](#api-endpoints)
5. [Core Features](#core-features)
6. [Testing Guide](#testing-guide)
7. [Troubleshooting](#troubleshooting)
8. [Seed Data Reference](#seed-data-reference)

---

# 🚀 Quick Start

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis

## 1-Minute Setup

```bash
# 1. Clone & Install
cd paytask-backend-worker
npm install

# 2. Setup Environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Setup Database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 4. Start Server
npm run dev
```

**Open Swagger:** http://localhost:3000/docs

---

# 📋 Project Overview

## Tech Stack

- **Framework:** Fastify + TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Cache:** Redis
- **File Upload:** @fastify/multipart
- **File Storage:** AWS S3 (with local fallback)
- **Image Processing:** Sharp
- **Job Queue:** Bull
- **API Docs:** Swagger/OpenAPI
- **Validation:** Zod

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Fastify   │ ← REST API + Swagger
└──────┬──────┘
       │
   ┌───┴───┐
   ▼       ▼
┌──────┐ ┌──────┐
│Redis │ │Prisma│
│Cache │ │ ORM  │
└──────┘ └───┬──┘
             ▼
        ┌──────────┐
        │PostgreSQL│
        └──────────┘
```

## Key Features

✅ **Task Discovery** - Browse and filter available tasks  
✅ **Assignment System** - Accept tasks with concurrency control (max 3)  
✅ **Submission System** - Submit work with automated QA checks  
✅ **Early Bonus** - Get bonus points for early submission (capped at 5.0)  
✅ **Optimistic Lock** - Race condition prevention (first wins)  
✅ **Redis Caching** - Fast data retrieval  
✅ **Swagger UI** - Interactive API documentation  

---

# ⚙️ Setup & Installation

## Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/paytask"

# Server
PORT=3000
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS S3 (optional - defaults to local storage)
AWS_ENABLED=false
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=paytask-uploads

# Bull Queue
BULL_REDIS_HOST=localhost
BULL_REDIS_PORT=6379
```

## Database Setup

### 1. Create Database
```bash
createdb paytask
```

### 2. Run Migrations
```bash
npm run prisma:migrate
```

### 3. Seed Data
```bash
npm run prisma:seed
```

**Seed creates:**
- 1 Client user
- 2 Worker users (with profiles)
- 10 Tasks (8 available, 2 pre-assigned)
- 10 Escrows (all held)
- 2 Pre-existing assignments

## Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build TypeScript
npm run start            # Start production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed database
npm run prisma:reset     # Reset & reseed database
npm run prisma:studio    # Open Prisma Studio
```

---

# 🌐 API Endpoints

Base URL: `http://localhost:3000`

## Tasks APIs

### 1. GET `/api/tasks/discover`
Browse available tasks with filtering and pagination

**Query Parameters:**
- `category` (string, optional) - Filter by category
- `minReward` (number, optional) - Minimum reward in USD
- `maxReward` (number, optional) - Maximum reward in USD
- `sortBy` (enum, optional) - Sort field: `createdAt`, `reward`, `deadline`
- `order` (enum, optional) - Sort order: `asc`, `desc`
- `page` (integer, optional) - Page number (default: 1)
- `limit` (integer, optional) - Items per page (default: 20, max: 100)

**Example:**
```http
GET /api/tasks/discover?category=transcription&minReward=10&sortBy=reward&order=desc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "title": "Transcribe 10-minute audio file",
        "category": "transcription",
        "reward": "15.50",
        "deadline": "2025-10-25T10:00:00.000Z",
        "status": "open",
        "client": {
          "id": "client-uuid",
          "email": "client@example.com"
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

### 2. GET `/api/tasks/all`
Get all tasks without filters

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "...",
      "reward": "15.50",
      "status": "open"
    }
  ]
}
```

---

### 3. GET `/api/tasks/:taskId`
Get task details by ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "title": "Transcribe 10-minute audio file",
    "description": "Clear English audio transcription needed",
    "category": "transcription",
    "reward": "15.50",
    "qty": 1,
    "deadline": "2025-10-25T10:00:00.000Z",
    "status": "open",
    "client": {
      "email": "client@example.com"
    },
    "escrow": {
      "amount": "17.05",
      "status": "held"
    }
  }
}
```

---

## Assignment APIs

### 4. POST `/api/tasks/assignments/accept`
Worker accepts an available task (with optimistic locking)

**🔒 Optimistic Lock:** If multiple workers accept same task simultaneously, only first succeeds!

**Request Body:**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}
```

**Validations:**
- ✓ Worker has < 3 active assignments
- ✓ Task status = 'open'
- ✓ Escrow status = 'held'
- ✓ Task not fully assigned
- ✓ Worker hasn't accepted this task

**Success Response (201):**
```json
{
  "success": true,
  "message": "Task accepted successfully",
  "data": {
    "id": "assignment-uuid",
    "taskId": "550e8400-e29b-41d4-a716-446655440010",
    "workerId": "550e8400-e29b-41d4-a716-446655440004",
    "status": "in_progress",
    "startedAt": "2025-10-18T10:30:00Z",
    "dueAt": "2025-10-20T10:30:00Z",
    "task": {
      "title": "Transcribe 10-minute audio file",
      "reward": "15.50"
    }
  }
}
```

**Error Responses:**

**400 - Concurrency Cap:**
```json
{
  "success": false,
  "error": {
    "message": "Maximum concurrent assignments (3) reached",
    "code": "CONCURRENCY_CAP"
  }
}
```

**409 - Race Condition (Optimistic Lock):**
```json
{
  "success": false,
  "error": {
    "message": "Task already assigned to another worker (race condition detected)",
    "code": "DOUBLE_ACCEPTANCE",
    "details": {
      "hint": "Another worker accepted this task at the same time. Please try another task.",
      "timestamp": "2025-10-20T..."
    }
  }
}
```

---

### 5. GET `/api/tasks/assignments/my-assignments`
Get all assignments for a worker (simple version)

**Query Parameters:**
- `workerId` (string, required) - Worker UUID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "assignment-uuid",
      "taskId": "task-uuid",
      "status": "in_progress",
      "startedAt": "2025-10-18T10:30:00Z",
      "dueAt": "2025-10-20T10:30:00Z",
      "task": {
        "title": "Transcribe audio",
        "reward": "15.50"
      }
    }
  ]
}
```

---

### 6. GET `/api/tasks/assignments/list`
Get worker's assignments with pagination and filtering

**Query Parameters:**
- `workerId` (string, required) - Worker UUID
- `status` (enum, optional) - Filter by: `in_progress`, `late`, `completed`, `expired`
- `page` (integer, optional) - Page number (default: 1)
- `limit` (integer, optional) - Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "assignment-uuid",
        "status": "in_progress",
        "dueAt": "2025-10-20T10:30:00Z",
        "task": {
          "title": "Transcribe audio",
          "reward": "15.50"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

---

## Submission APIs

### 7. POST `/api/submissions/create`
Submit completed work with automated QA checks and early bonus

**Request Body:**
```json
{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440020",
  "payloadUrl": "https://storage.paytask.com/submissions/file123.txt",
  "payloadHash": "sha256:a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "metadata": {
    "fileSize": 2048,
    "fileName": "transcription.txt",
    "mimeType": "text/plain"
  }
}
```

**QA Checks:**
1. ✅ **Completeness** - File not empty (fileSize > 0)
2. ✅ **Duplicate** - Hash doesn't exist in database
3. ✅ **Format** - Valid MIME type (text, pdf, image, audio, video, zip)
4. ✅ **Size** - File ≤ 100MB
5. ✅ **Hash** - Valid sha256 format

**Early Bonus Calculation:**
```
hoursEarly = (dueAt - submittedAt) / 3600
rawBonus = hoursEarly × 0.1
bonusPoints = min(rawBonus, 5.0)  // Capped at 5.0!
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Submission created successfully",
  "data": {
    "id": "submission-uuid",
    "assignmentId": "550e8400-e29b-41d4-a716-446655440020",
    "payloadUrl": "https://storage.paytask.com/submissions/file123.txt",
    "payloadHash": "sha256:a3b2c1d4e5f6...",
    "qaFlags": {
      "passed": true,
      "checks": {
        "completeness": true,
        "duplicate": false,
        "format": true,
        "size": true
      }
    },
    "status": "submitted",
    "submittedAt": "2025-10-19T08:30:00Z",
    "earlySubmission": true,
    "hoursEarly": 26.5,
    "bonusPoints": 2.7
  }
}
```

**Error Responses:**

**400 - Late Submission:**
```json
{
  "success": false,
  "error": {
    "message": "Submission deadline has passed",
    "code": "LATE_SUBMISSION"
  }
}
```

**400 - QA Failed:**
```json
{
  "success": false,
  "error": {
    "message": "Submission failed quality checks",
    "code": "QA_FAILED"
  }
}
```

**409 - Duplicate Submission:**
```json
{
  "success": false,
  "error": {
    "message": "This assignment already has a submission",
    "code": "DUPLICATE_SUBMISSION"
  }
}
```

---

### 8. GET `/api/submissions/:submissionId`
Get submission details by ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "submission-uuid",
    "qaFlags": {
      "passed": true,
      "checks": { ... }
    },
    "assignment": {
      "task": {
        "title": "Transcribe audio",
        "reward": "15.50"
      },
      "worker": {
        "email": "worker@example.com"
      }
    }
  }
}
```

---

## Statistics APIs

### 9. GET `/api/stats/tasks`
Get task statistics overview

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "byStatus": {
      "open": 8,
      "completed": 0,
      "cancelled": 0
    },
    "byCategory": {
      "transcription": 3,
      "data_entry": 2
    }
  }
}
```

---

### 10. GET `/api/stats/categories`
Get available task categories

**Response:**
```json
{
  "success": true,
  "data": [
    "transcription",
    "data_entry",
    "translation",
    "categorization"
  ]
}
```

---

### 11. POST `/api/stats/cache/clear`
Clear all cache (admin tool)

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

---

# 🎯 Core Features

## 1. Task Discovery System

### Filtering
- ✅ By category
- ✅ By reward range (min/max)
- ✅ Only open tasks
- ✅ Only funded tasks (escrow held)
- ✅ Exclude already accepted

### Sorting
- ✅ By created date
- ✅ By reward amount
- ✅ By deadline
- ✅ Ascending/Descending

### Pagination
- ✅ Page-based (1-indexed)
- ✅ Configurable limit (max 100)
- ✅ Total count & pages

### Caching
- ✅ Redis cache (5 min TTL)
- ✅ Cache invalidation on changes

---

## 2. Assignment System

### Concurrency Control
- ✅ Max 3 active assignments per worker
- ✅ Atomic transaction
- ✅ Real-time validation

### Optimistic Lock (First Wins)

**Problem:** Multiple workers accept same task simultaneously

**Solution:** Double-check pattern with transaction

```
Timeline:
10:00:00.000 - Worker A: Start transaction
10:00:00.001 - Worker B: Start transaction
10:00:00.002 - Worker A: Check → 0 assignments ✓
10:00:00.003 - Worker A: Double-check → 0 ✓
10:00:00.004 - Worker A: Create assignment ✓
10:00:00.005 - Worker A: Commit ✓ WINNER!
10:00:00.006 - Worker B: Check → 1 assignment
10:00:00.007 - Worker B: Double-check → 1 ✗
10:00:00.008 - Worker B: DOUBLE_ACCEPTANCE error
10:00:00.009 - Worker B: Rollback

Result:
✅ Worker A: 201 Created
❌ Worker B: 409 Conflict
```

**Benefits:**
- ✅ Data integrity guaranteed
- ✅ No double-booking
- ✅ Fair first-come-first-served
- ✅ Graceful conflict handling

---

## 3. Submission System

### Automated QA Checks

**5 Automatic Validations:**

1. **Completeness Check**
   - Validates fileSize > 0
   - Fails if: fileSize === 0

2. **Duplicate Check**
   - Checks if payloadHash exists
   - Fails if: Another submission has same hash

3. **Format Check**
   - Validates MIME type
   - Allowed: text/plain, application/pdf, image/jpeg, image/png, audio/mpeg, video/mp4, application/zip
   - Fails if: MIME type not in allowed list

4. **Size Check**
   - Validates fileSize ≤ 100MB
   - Fails if: fileSize > 104,857,600 bytes

5. **Hash Validation**
   - Ensures hash format correct
   - Fails if: Hash doesn't start with `sha256:`

**All checks must pass for submission to succeed!**

---

### Early Submission Bonus

**Formula:**
```javascript
hoursEarly = (dueAt - submittedAt) / 3600
rawBonus = hoursEarly × 0.1
bonusPoints = min(rawBonus, 5.0)  // Capped at 5.0!
```

**Examples:**
| Hours Early | Raw Calculation | Final Bonus | Notes |
|-------------|-----------------|-------------|-------|
| 10 hours | 10 × 0.1 = 1.0 | **1.0** | Normal |
| 26 hours | 26 × 0.1 = 2.6 | **2.6** | Normal |
| 50 hours | 50 × 0.1 = 5.0 | **5.0** | At cap |
| 100 hours | 100 × 0.1 = 10.0 | **5.0** | Capped! |

**Why Cap at 5.0?**
- Prevents gaming the system
- Fair for all workers
- Encourages consistent performance
- Balanced reputation economy

**System Actions:**
1. Calculate bonus points
2. Update WorkerProfile:
   - `reputation += bonusPoints`
   - `earlySubmissions += 1`
3. Update Assignment status to 'completed'
4. Create notification (future feature)

---

## 4. Redis Caching

**Cached Endpoints:**
- `/api/tasks/discover` - 5 minutes
- `/api/tasks/all` - 5 minutes
- `/api/tasks/:taskId` - 5 minutes
- `/api/tasks/assignments/my-assignments` - 2 minutes
- `/api/stats/tasks` - 5 minutes
- `/api/stats/categories` - 10 minutes

**Cache Invalidation:**
- Manual: `POST /api/stats/cache/clear`
- Auto: On data changes (accept task, submit work)
- TTL: Automatic expiration

---

# 🧪 Testing Guide

## Test with Swagger UI

**URL:** http://localhost:3000/docs

### Quick Test Flow:

1. **Browse Tasks**
   - Go to "Tasks" section
   - Try `GET /api/tasks/all`
   - Copy a task ID

2. **Accept Task**
   - Go to "Assignments" section
   - Try `POST /api/tasks/assignments/accept`
   - Use workerId: `550e8400-e29b-41d4-a716-446655440004`
   - Paste task ID
   - Execute → Get assignment ID

3. **Submit Work**
   - Go to "Submissions" section
   - Try `POST /api/submissions/create`
   - Use assignment ID from step 2
   - Execute → See QA results & bonus

---

## Test with REST Client

**File:** `test-api.http`

```http
@baseUrl = http://localhost:3000

### Browse tasks
GET {{baseUrl}}/api/tasks/discover?category=transcription

### Accept task
POST {{baseUrl}}/api/tasks/assignments/accept
Content-Type: application/json

{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}

### Submit work
POST {{baseUrl}}/api/submissions/create
Content-Type: application/json

{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440020",
  "payloadUrl": "https://storage.paytask.com/submissions/test.txt",
  "payloadHash": "sha256:abc123def456",
  "metadata": {
    "fileSize": 2048,
    "fileName": "work.txt",
    "mimeType": "text/plain"
  }
}
```

---

## Test Concurrent Requests

**File:** `test-concurrent-accept.http`

Test optimistic lock by running these simultaneously:

```http
### Worker A
POST http://localhost:3000/api/tasks/assignments/accept
Content-Type: application/json

{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}

### Worker B (run at same time!)
POST http://localhost:3000/api/tasks/assignments/accept
Content-Type: application/json

{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440006"
}
```

**Expected:**
- One worker: ✅ 201 Created
- Other worker: ❌ 409 Conflict (DOUBLE_ACCEPTANCE)

---

## Test Data

### Seeded Worker IDs

**Worker 1:**
```
ID: 550e8400-e29b-41d4-a716-446655440004
Email: worker@example.com
Has: 1 pre-assigned task
Assignment ID: 550e8400-e29b-41d4-a716-446655440020
```

**Worker 2:**
```
ID: 550e8400-e29b-41d4-a716-446655440006
Email: worker2@example.com
Has: 1 pre-assigned task
Assignment ID: 550e8400-e29b-41d4-a716-446655440021
```

### Seeded Task IDs

**Available Tasks (8):**
- `550e8400-e29b-41d4-a716-446655440010` - Transcribe audio
- `550e8400-e29b-41d4-a716-446655440011` - Data entry
- `550e8400-e29b-41d4-a716-446655440012` - Translation
- `550e8400-e29b-41d4-a716-446655440013` - Image categorization
- `550e8400-e29b-41d4-a716-446655440014` - Product research
- `550e8400-e29b-41d4-a716-446655440015` - Podcast transcription
- `550e8400-e29b-41d4-a716-446655440016` - Content moderation
- `550e8400-e29b-41d4-a716-446655440017` - Email support

**Pre-assigned Tasks (2):**
- `550e8400-e29b-41d4-a716-446655440018` - Worker 1's task
- `550e8400-e29b-41d4-a716-446655440019` - Worker 2's task

---

# 🐛 Troubleshooting

## Common Issues

### Issue 1: Empty Response from API

**Symptom:** API returns `{"success": true, "data": []}`

**Causes:**
1. Database not seeded
2. Wrong worker ID
3. Redis cache empty

**Solutions:**
```bash
# Reseed database
npm run prisma:reset --force
npm run prisma:seed

# Clear Redis cache
POST http://localhost:3000/api/stats/cache/clear

# Use correct worker IDs
550e8400-e29b-41d4-a716-446655440004  # Worker 1
550e8400-e29b-41d4-a716-446655440006  # Worker 2
```

---

### Issue 2: DOUBLE_ACCEPTANCE Error

**Symptom:** `409 Conflict - DOUBLE_ACCEPTANCE`

**Cause:** Race condition - another worker accepted the same task

**Solution:**
- This is expected behavior (optimistic lock working!)
- Try accepting a different task
- Refresh task list to see available tasks

---

### Issue 3: QA_FAILED on Submission

**Symptom:** `400 Bad Request - QA_FAILED`

**Check these:**
1. **File size > 0** (not empty)
2. **Hash unique** (not duplicate)
3. **Valid MIME type** (in allowed list)
4. **File size ≤ 100MB**
5. **Hash format** (starts with `sha256:`)

**Allowed MIME types:**
- `text/plain`
- `application/pdf`
- `image/jpeg`
- `image/png`
- `audio/mpeg`
- `video/mp4`
- `application/zip`

---

### Issue 4: CONCURRENCY_CAP Error

**Symptom:** `400 Bad Request - CONCURRENCY_CAP`

**Cause:** Worker already has 3 active assignments

**Solution:**
1. Complete existing assignments
2. Submit work for current tasks
3. Or test with a different worker ID

---

### Issue 5: Server Won't Start

**Symptom:** `Error: listen EADDRINUSE: address already in use`

**Solution:**
```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

---

### Issue 6: Prisma Client Error

**Symptom:** `@prisma/client did not initialize yet`

**Solution:**
```bash
npm run prisma:generate
npm run build
```

---

### Issue 7: Redis Connection Error

**Symptom:** `Error: Redis connection to localhost:6379 failed`

**Solution:**
```bash
# Check Redis is running
redis-cli ping  # Should return PONG

# Start Redis if needed
# Windows: Use Redis for Windows
# Mac: brew services start redis
# Linux: sudo systemctl start redis
```

---

## Debug Tips

### Enable Debug Logs

```bash
# Set in .env
NODE_ENV=development
```

### Check Database

```bash
# Open Prisma Studio
npm run prisma:studio

# Opens at http://localhost:5555
```

### Check Redis Cache

```bash
redis-cli
> KEYS *  # List all keys
> GET "tasks:discover:page:1:limit:20"  # Check specific cache
> FLUSHALL  # Clear all cache
```

### View API Logs

Server logs show:
- Request details
- Query parameters
- Response data
- Error stack traces

Watch terminal where `npm run dev` is running.

---

# 📊 Seed Data Reference

## Summary

- **Users:** 3 total
  - 1 Client
  - 2 Workers (with profiles)
- **Tasks:** 10 total
  - 8 Available (open)
  - 2 Pre-assigned
- **Escrows:** 10 (all held)
- **Assignments:** 2 pre-existing

## Detailed Data

### Users

**Client:**
```
ID: 550e8400-e29b-41d4-a716-446655440002
Email: client@example.com
Role: client
Country: UK
```

**Worker 1:**
```
ID: 550e8400-e29b-41d4-a716-446655440004
Email: worker@example.com
Role: worker
Country: US
Profile:
  - Skills: ["transcription", "data_entry"]
  - Languages: ["en", "es"]
  - Reputation: 0
  - Completed: 0
  - Early submissions: 0
Has Assignment: 550e8400-e29b-41d4-a716-446655440020
```

**Worker 2:**
```
ID: 550e8400-e29b-41d4-a716-446655440006
Email: worker2@example.com
Role: worker
Country: CA
Profile:
  - Skills: ["categorization", "research"]
  - Languages: ["en", "fr"]
  - Reputation: 0
  - Completed: 0
  - Early submissions: 0
Has Assignment: 550e8400-e29b-41d4-a716-446655440021
```

---

### Available Tasks

**1. Transcribe 10-minute audio file**
```
ID: 550e8400-e29b-41d4-a716-446655440010
Category: transcription
Reward: $15.50
Deadline: 2025-10-25T10:00:00Z
```

**2. Data entry from scanned documents**
```
ID: 550e8400-e29b-41d4-a716-446655440011
Category: data_entry
Reward: $12.00
Deadline: 2025-10-26T14:00:00Z
```

**3. Translate English to Spanish**
```
ID: 550e8400-e29b-41d4-a716-446655440012
Category: translation
Reward: $20.00
Deadline: 2025-10-27T16:00:00Z
```

**4. Image categorization - 100 images**
```
ID: 550e8400-e29b-41d4-a716-446655440013
Category: categorization
Reward: $8.50
Deadline: 2025-10-28T12:00:00Z
```

**5. Product research - 20 items**
```
ID: 550e8400-e29b-41d4-a716-446655440014
Category: research
Reward: $25.00
Deadline: 2025-10-29T18:00:00Z
```

**6. Transcribe 30-minute podcast**
```
ID: 550e8400-e29b-41d4-a716-446655440015
Category: transcription
Reward: $35.00
Deadline: 2025-10-30T20:00:00Z
```

**7. Social media content moderation**
```
ID: 550e8400-e29b-41d4-a716-446655440016
Category: moderation
Reward: $18.00
Deadline: 2025-10-31T15:00:00Z
```

**8. Email customer support responses**
```
ID: 550e8400-e29b-41d4-a716-446655440017
Category: support
Reward: $30.00
Deadline: 2025-11-01T09:00:00Z
```

---

### Pre-assigned Tasks

**Worker 1's Task:**
```
Task ID: 550e8400-e29b-41d4-a716-446655440018
Title: Already assigned task
Assignment ID: 550e8400-e29b-41d4-a716-446655440020
Status: in_progress
Due: 2025-11-02T10:00:00Z
```

**Worker 2's Task:**
```
Task ID: 550e8400-e29b-41d4-a716-446655440019
Title: Product categorization for e-commerce
Assignment ID: 550e8400-e29b-41d4-a716-446655440021
Status: in_progress
Due: 2025-11-05T16:00:00Z
```

---

# 🎓 Best Practices

## For Testing

1. **Always use seeded IDs** for consistent testing
2. **Clear cache** before testing filters
3. **Reset database** if data becomes inconsistent
4. **Use Swagger UI** for interactive testing
5. **Check logs** for debugging

## For Development

1. **Run Prisma Studio** to view database
2. **Use TypeScript** for type safety
3. **Follow Fastify patterns** for routes
4. **Cache frequently accessed data**
5. **Handle errors gracefully**

## For Production

1. **Enable AWS S3** for file storage
2. **Use environment variables** for secrets
3. **Set up monitoring** (logs, metrics)
4. **Configure rate limiting**
5. **Enable CORS** for frontend

---

# 📚 Additional Resources

## Useful Commands

```bash
# Development
npm run dev              # Start with hot reload
npm run build            # Build TypeScript
npm run start            # Production start

# Database
npm run prisma:studio    # Visual database editor
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:migrate   # Apply migrations
npm run prisma:seed      # Populate test data
npm run prisma:reset     # Reset & reseed

# Testing
npm test                 # Run tests (if configured)
npm run lint             # Run ESLint
```

## File Structure

```
paytask-backend-worker/
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── seed.ts               # Seed data script
│   └── migrations/           # Migration history
├── src/
│   ├── config/               # Configuration
│   │   ├── env.ts
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   ├── s3.ts
│   │   └── bull.ts
│   ├── routes/               # API routes
│   │   ├── task.routes.ts
│   │   ├── assignment.routes.ts
│   │   ├── submission.routes.ts
│   │   └── stats.routes.ts
│   ├── services/             # Business logic
│   │   ├── task.service.ts
│   │   ├── assignment.service.ts
│   │   ├── submission.service.ts
│   │   └── stats.service.ts
│   ├── types/                # TypeScript types
│   │   ├── task.types.ts
│   │   ├── assignment.types.ts
│   │   ├── submission.types.ts
│   │   └── common.types.ts
│   ├── app.ts                # Fastify app setup
│   └── server.ts             # Server entry point
├── test-api.http             # REST client tests
├── test-concurrent-accept.http  # Race condition tests
├── .env                      # Environment variables
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── COMPLETE_GUIDE.md         # This file!
```

---

# 🎉 Summary

This PayTask Worker Backend provides:

✅ **Complete Task Workflow**
- Browse tasks with filters
- Accept with concurrency control
- Submit with QA validation

✅ **Advanced Features**
- Optimistic locking (race condition prevention)
- Early submission bonus (capped at 5.0)
- Redis caching for performance
- Automated QA checks

✅ **Developer Experience**
- Swagger UI for testing
- Comprehensive documentation
- Seed data for development
- Type-safe with TypeScript

✅ **Production Ready**
- Error handling
- Data validation
- Transaction safety
- Scalable architecture

---

## Quick Links

- **API Docs:** http://localhost:3000/docs
- **Prisma Studio:** http://localhost:5555
- **GitHub:** (your-repo-url)

---

## Support

For issues or questions:
1. Check this guide's [Troubleshooting](#troubleshooting) section
2. Review API [Response Codes](#api-endpoints)
3. Check server logs for details
4. Open an issue on GitHub

---

**Last Updated:** October 2025  
**Version:** 1.0.0  
**License:** MIT

---

Made with ❤️ for PayTask

