# 📮 Postman Testing Guide - PayTask Worker API

## 📦 Files Overview

```
📁 Client-Worker/
├── 📄 PayTask-Worker-API.postman_collection.json   ← Postman Collection
├── 📄 PayTask-Development.postman_environment.json ← Environment Variables
├── 📄 POSTMAN_GUIDE.md                            ← Detailed Usage Guide
├── 📄 run-api-tests.sh                            ← Unix/Mac Test Runner
└── 📄 run-api-tests.bat                           ← Windows Test Runner
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Start Server
```bash
npm run dev
```

### Step 2: Import to Postman
1. Open Postman
2. Click **Import** → Select both `.json` files
3. Select **PayTask Development** environment (top-right dropdown)

### Step 3: Test APIs
Click **Send** on any request! 🎉

---

## 📚 What's Included

### ✅ Complete API Coverage (40+ Requests)

- 🔐 **Authentication** (4)
  - Register, Login, Logout, Token Validation

- 📝 **Tasks** (8)
  - Create, Update, Publish, Discover, List, Cancel, Delete

- ✅ **Assignments** (4)
  - Accept, List, Get Details, Get by Task

- 📤 **Submissions** (4)
  - Upload File, Create, Get Details, Get by Assignment

- ✔️ **Reviews** (2)
  - Create Review, Get Reviews

- ⭐ **Ratings** (3)
  - Create, Get User Ratings, Get Task Ratings

- 📊 **Statistics** (3)
  - Worker Stats, Client Stats, Task Stats

- 💰 **Wallet** (4)
  - Lock Escrow, Payout, Withdraw, Refund

- 👤 **Users** (4)
  - Get Profile, Update, Deactivate, List All

- 🐛 **Error Logs** (3)
  - Create, List, Resolve

- 💚 **Health** (2)
  - Health Check, Root Info

---

## 🎯 Example: Complete User Journey

### 1️⃣ Register Client
```json
POST /api/auth/register
{
  "username": "client1",
  "email": "client1@paytask.com",
  "password": "password123",
  "role": "client"
}
```
✅ Auto-saves: `accessToken`, `userId`

### 2️⃣ Create & Publish Task
```json
POST /api/tasks
{
  "title": "Web Scraping Task",
  "reward": 10.50,
  "qty": 2
}
```
✅ Auto-saves: `taskId`

```json
POST /api/wallet/payment/escrow
{ "taskId": "{{taskId}}" }
```

```json
POST /api/tasks/publish/{{taskId}}
{ "txHash": "5YNm..." }
```

### 3️⃣ Register Worker & Accept Task
```json
POST /api/auth/register
{
  "username": "worker1",
  "email": "worker1@paytask.com",
  "role": "worker"
}
```

```json
POST /api/tasks/assignments/accept
{
  "taskId": "{{taskId}}",
  "workerId": "{{userId}}"
}
```
✅ Auto-saves: `assignmentId`

### 4️⃣ Submit Work
```json
POST /api/submissions/upload
[File Upload]
```
✅ Auto-saves: `fileUrl`, `fileHash`

```json
POST /api/submissions/create
{
  "assignmentId": "{{assignmentId}}",
  "payloadUrl": "{{fileUrl}}",
  "payloadHash": "{{fileHash}}"
}
```
✅ Auto-saves: `submissionId`

### 5️⃣ Review & Pay
```json
POST /api/reviews/create
{
  "submissionId": "{{submissionId}}",
  "decision": "approve"
}
```

```json
POST /api/wallet/payment/payout
{
  "taskId": "{{taskId}}",
  "recipientUserId": "{{workerUserId}}"
}
```

### 6️⃣ Rate Each Other
```json
POST /api/ratings/create
{
  "toUserId": "{{workerUserId}}",
  "taskId": "{{taskId}}",
  "score": 5
}
```

---

## 🤖 Automated Testing (Newman)

### Install Newman CLI
```bash
npm install -g newman
```

### Run All Tests (Unix/Mac)
```bash
chmod +x run-api-tests.sh
./run-api-tests.sh
```

### Run All Tests (Windows)
```cmd
run-api-tests.bat
```

### Manual Newman Run
```bash
newman run PayTask-Worker-API.postman_collection.json \
  -e PayTask-Development.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export newman-report.html
```

---

## 🎨 Postman Features

### Auto-Save Variables
Scripts automatically save response data:
- `accessToken` from login
- `userId` from registration
- `taskId` from create task
- `assignmentId` from accept task
- `submissionId` from submit
- `fileUrl`, `fileHash` from upload

### Test Scripts
Each request has test scripts:
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set('taskId', response.data.id);
}
```

### Pre-request Scripts
Auto-setup headers and auth tokens

---

## 📊 Environment Variables

| Variable | Description | Set By |
|----------|-------------|--------|
| `baseUrl` | API URL | Manual |
| `accessToken` | Auth token | Login/Register |
| `userId` | Current user ID | Login/Register |
| `taskId` | Task ID | Create Task |
| `assignmentId` | Assignment ID | Accept Task |
| `submissionId` | Submission ID | Submit Work |
| `fileUrl` | S3 file URL | Upload File |
| `fileHash` | SHA256 hash | Upload File |

---

## 🔍 Testing Tips

### Test Concurrent Acceptance
Open "Accept Task" → Click Send multiple times
→ Only first succeeds, others get `409 DOUBLE_ACCEPTANCE`

### Test Validation
Send invalid data to test error handling:
- Missing required fields → `400 Validation Error`
- Invalid UUID → `400 Bad Request`
- Wrong user role → `403 Forbidden`

### Test Edge Cases
- Late submission (after deadline)
- Duplicate submission
- Worker with 3+ active tasks
- Insufficient wallet balance

---

## 🐛 Common Issues

### ❌ "Unauthorized" Error
**Fix**: 
1. Login first
2. Check `accessToken` is saved
3. Verify environment is selected

### ❌ "Task Not Found"
**Fix**:
1. Create task first
2. Check `taskId` is saved
3. Use correct user (client)

### ❌ "Double Acceptance"
**Fix**:
- Task already full (qty limit)
- Use different task

---

## 📖 Additional Resources

- **Full Guide**: See `POSTMAN_GUIDE.md`
- **API Docs**: http://localhost:3000/api-docs
- **System Flow**: See `flow.md`

---

## 🌟 Pro Tips

1. **Use Collections Runner** for sequential testing
2. **Enable Auto-Persist** to save variables automatically
3. **Use Pre-request Scripts** to generate test data
4. **Export Results** as HTML reports
5. **Share Collections** with team via Git

---

## 📝 Notes

- All requests auto-save relevant IDs to environment
- Test scripts validate response format
- Newman generates HTML reports
- Collection includes 40+ requests
- Fully documented with examples

---

**Happy Testing! 🎉**

Made with ❤️ for PayTask Team
