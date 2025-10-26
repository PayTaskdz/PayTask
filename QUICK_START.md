# 🚀 PayTask Worker API - Quick Start Guide

## ✅ Server Status

```
✅ Server running on http://localhost:3000
📚 API Documentation: http://localhost:3000/api-docs
💚 Health Check: http://localhost:3000/health
✅ Database seeded with test data
```

---

## 🎯 Test Credentials

All accounts use password: **`password123`**

### 👔 Clients (Task Creators)

| Email | Username | Description |
|-------|----------|-------------|
| `client1@paytask.com` | Alice | Active client with tasks |
| `client2@paytask.com` | Bob | Has survey tasks |
| `client3@paytask.com` | Charlie | New client |

### 👷 Workers (Task Performers)

| Email | Username | Reputation | Active Tasks |
|-------|----------|------------|--------------|
| `worker1@paytask.com` | Diana | ⭐⭐⭐⭐ High | 2 |
| `worker2@paytask.com` | Eve | ⭐⭐⭐ Medium | 1 |
| `worker3@paytask.com` | Frank | ⭐⭐⭐⭐⭐ Highest | 0 |
| `worker4@paytask.com` | Grace | New Worker | 0 |

---

## 📊 Current Database State

### Tasks Available

| ID | Title | Category | Reward | Status | Client |
|----|-------|----------|--------|--------|--------|
| 1 | Image Classification | Image Tagging | $25 | Draft | Alice |
| 2 | Data Entry - Product Catalog | Data Entry | $30 | Open | Alice |
| 3 | Survey Response Collection | Surveys | $5 | Open | Bob |
| 4 | Website Testing | QA Testing | $15 | Active | Bob |
| 5 | Social Media Research | Research | $20 | Active | Charlie |
| 6 | Translation Task | Translation | $40 | Completed | Alice |
| 7 | Video Transcription | Transcription | $35 | Completed | Bob |
| 8 | Audio Transcription | Transcription | $30 | Completed | Charlie |

### Assignment Statistics

- **Total Assignments**: 5
- **Pending Review**: 3
- **Approved**: 2
- **Rejected**: 0

---

## 🧪 Quick API Tests

### 1. Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-26T06:35:55.000Z",
  "uptime": 123.45,
  "checks": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

### 2. Login as Client

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client1@paytask.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": {
    "accessToken": "tok_xxxxx...",
    "user": {
      "id": "uuid-xxx",
      "email": "client1@paytask.com",
      "username": "Alice",
      "role": "client"
    }
  }
}
```

**Save the `accessToken` for next requests!**

---

### 3. Discover Available Tasks

```bash
curl http://localhost:3000/api/tasks/discover?limit=5
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": "task-uuid-2",
      "title": "Data Entry - Product Catalog",
      "category": "Data Entry",
      "reward": 30.00,
      "status": "open",
      "deadline": "2025-10-31T..."
    },
    {
      "id": "task-uuid-3",
      "title": "Survey Response Collection",
      "category": "Surveys",
      "reward": 5.00,
      "qty": 50,
      "qtyCompleted": 0
    }
  ],
  "metadata": {
    "total": 2,
    "page": 1
  }
}
```

---

### 4. Get User Profile (Authenticated)

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": {
    "id": "uuid-xxx",
    "email": "client1@paytask.com",
    "username": "Alice",
    "role": "client",
    "wallet": {
      "id": "wallet-uuid",
      "balance": "1000.00",
      "addresses": {
        "ethereum": "0x1234...",
        "polygon": "0x5678..."
      }
    }
  }
}
```

---

## 🔄 Complete User Journey (Step-by-Step)

### Scenario: Bob (Client) posts a task → Diana (Worker) completes it

#### **Step 1: Bob Logs In**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client2@paytask.com",
    "password": "password123"
  }'
```

💾 **Save:** `bobToken` = response.data.accessToken

---

#### **Step 2: Bob Creates a Task**

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test API Integration",
    "description": "Write API integration tests for our REST endpoints",
    "category": "Development",
    "reward": 50.00,
    "qty": 1,
    "deadline": "2025-11-01T00:00:00Z"
  }'
```

💾 **Save:** `taskId` = response.data.id

---

#### **Step 3: Bob Locks Escrow**

```bash
curl -X POST http://localhost:3000/api/wallet/payment/escrow \
  -H "Authorization: Bearer BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "TASK_ID_FROM_STEP_2"
  }'
```

💾 **Save:** `txHash` = response.data.txHash

---

#### **Step 4: Bob Publishes Task**

```bash
curl -X POST http://localhost:3000/api/tasks/publish/TASK_ID \
  -H "Authorization: Bearer BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "TX_HASH_FROM_STEP_3"
  }'
```

✅ **Task is now OPEN and discoverable!**

---

#### **Step 5: Diana Logs In**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "worker1@paytask.com",
    "password": "password123"
  }'
```

💾 **Save:** `dianaToken` = response.data.accessToken  
💾 **Save:** `dianaUserId` = response.data.user.id

---

#### **Step 6: Diana Discovers Task**

```bash
curl http://localhost:3000/api/tasks/discover?category=Development \
  -H "Authorization: Bearer DIANA_TOKEN"
```

🔍 **Diana finds Bob's task in the list**

---

#### **Step 7: Diana Accepts Task**

```bash
curl -X POST http://localhost:3000/api/tasks/assignments/accept \
  -H "Authorization: Bearer DIANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "TASK_ID",
    "workerId": "DIANA_USER_ID"
  }'
```

💾 **Save:** `assignmentId` = response.data.id

✅ **Assignment created! Diana is now working on the task**

---

#### **Step 8: Diana Uploads Work File**

```bash
curl -X POST http://localhost:3000/api/submissions/upload \
  -H "Authorization: Bearer DIANA_TOKEN" \
  -F "file=@test-results.zip"
```

💾 **Save:** `fileUrl` = response.data.url  
💾 **Save:** `fileHash` = response.data.hash

---

#### **Step 9: Diana Creates Submission**

```bash
curl -X POST http://localhost:3000/api/submissions/create \
  -H "Authorization: Bearer DIANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignmentId": "ASSIGNMENT_ID",
    "payloadUrl": "FILE_URL",
    "payloadHash": "FILE_HASH",
    "notes": "Completed all API integration tests with 95% coverage"
  }'
```

💾 **Save:** `submissionId` = response.data.id

✅ **Submission created! Waiting for Bob's review**

---

#### **Step 10: Bob Reviews Submission**

```bash
curl -X POST http://localhost:3000/api/reviews/create \
  -H "Authorization: Bearer BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": "SUBMISSION_ID",
    "decision": "approve",
    "feedback": "Great work! Tests are comprehensive and well-documented.",
    "rating": 5
  }'
```

✅ **Review created! Assignment approved**

---

#### **Step 11: Bob Pays Diana**

```bash
curl -X POST http://localhost:3000/api/wallet/payment/payout \
  -H "Authorization: Bearer BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "TASK_ID",
    "recipientUserId": "DIANA_USER_ID"
  }'
```

✅ **Payment successful! Diana receives $50**

---

#### **Step 12: Both Rate Each Other**

**Bob rates Diana:**
```bash
curl -X POST http://localhost:3000/api/ratings/create \
  -H "Authorization: Bearer BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toUserId": "DIANA_USER_ID",
    "taskId": "TASK_ID",
    "score": 5,
    "comment": "Professional and delivered high-quality work!"
  }'
```

**Diana rates Bob:**
```bash
curl -X POST http://localhost:3000/api/ratings/create \
  -H "Authorization: Bearer DIANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toUserId": "BOB_USER_ID",
    "taskId": "TASK_ID",
    "score": 5,
    "comment": "Clear requirements and fast payment!"
  }'
```

✅ **Journey Complete! 🎉**

---

## 📚 Additional Resources

### Swagger UI (Interactive Docs)
🌐 http://localhost:3000/api-docs

### Postman Collection
📁 `PayTask-Worker-API.postman_collection.json`  
📁 `PayTask-Development.postman_environment.json`

**Import to Postman:**
1. Open Postman
2. Import both JSON files
3. Select "PayTask Development" environment
4. Start testing!

### Automated Tests
```bash
# Unix/Mac
chmod +x run-api-tests.sh
./run-api-tests.sh

# Windows
run-api-tests.bat
```

---

## 🐛 Troubleshooting

### ❌ "Unauthorized" Error
**Solution:** Make sure you:
1. Logged in first
2. Saved the `accessToken`
3. Added `Authorization: Bearer YOUR_TOKEN` header

### ❌ "Task not found"
**Solution:** 
1. Check the `taskId` is correct
2. Task must be in "open" status to be accepted
3. Use correct client/worker account

### ❌ "Worker already has 3 active tasks"
**Solution:** 
- Workers can only have max 3 active tasks
- Complete or cancel existing tasks first

### ❌ "Insufficient balance"
**Solution:**
- Check wallet balance: `GET /api/users/me`
- Seeded wallets have $1000 balance by default

---

## 🎨 Development Tips

### Watch Database Changes
```bash
npx prisma studio
```
Opens GUI at http://localhost:5555

### View Logs
```bash
# Server logs show all requests
# Check terminal where `npm run dev` is running
```

### Reset Database
```bash
npx prisma migrate reset
npx ts-node prisma/seed.ts
```

### Check Redis Cache
```bash
redis-cli
> KEYS *
> GET session:tok_xxxxx
```

---

## 📝 API Endpoints Summary

| Category | Endpoint | Method | Auth |
|----------|----------|--------|------|
| **Auth** | `/api/auth/register` | POST | No |
| | `/api/auth/login` | POST | No |
| | `/api/auth/logout` | POST | Yes |
| **Tasks** | `/api/tasks` | POST | Yes |
| | `/api/tasks/discover` | GET | No |
| | `/api/tasks/publish/:id` | POST | Yes |
| | `/api/tasks/:id` | GET/PUT/DELETE | Yes |
| **Assignments** | `/api/tasks/assignments/accept` | POST | Yes |
| | `/api/tasks/assignments/user/:userId` | GET | Yes |
| **Submissions** | `/api/submissions/upload` | POST | Yes |
| | `/api/submissions/create` | POST | Yes |
| **Reviews** | `/api/reviews/create` | POST | Yes |
| | `/api/reviews/submission/:id` | GET | Yes |
| **Wallet** | `/api/wallet/payment/escrow` | POST | Yes |
| | `/api/wallet/payment/payout` | POST | Yes |
| | `/api/wallet/payment/withdraw` | POST | Yes |
| | `/api/wallet/payment/refund` | POST | Yes |
| **Users** | `/api/users/me` | GET | Yes |
| | `/api/users/:id` | GET/PUT | Yes |
| **Ratings** | `/api/ratings/create` | POST | Yes |
| | `/api/ratings/user/:userId` | GET | No |
| **Stats** | `/api/stats/worker/:userId` | GET | Yes |
| | `/api/stats/client/:userId` | GET | Yes |
| **Health** | `/health` | GET | No |

---

**Happy Testing! 🚀**

Last Updated: October 26, 2025
