# PayTask Worker API - Postman Collection

## 📦 Files Included

1. **PayTask-Worker-API.postman_collection.json** - Complete API collection với tất cả endpoints
2. **PayTask-Development.postman_environment.json** - Development environment variables

---

## 🚀 Quick Start

### 1. Import vào Postman

#### Import Collection:
1. Mở Postman
2. Click **Import** button (góc trên bên trái)
3. Chọn file `PayTask-Worker-API.postman_collection.json`
4. Click **Import**

#### Import Environment:
1. Click **Import** button
2. Chọn file `PayTask-Development.postman_environment.json`
3. Click **Import**
4. Chọn environment **PayTask Development** từ dropdown (góc trên bên phải)

---

## 🔄 Complete Workflow Example

### **Scenario: Client tạo task → Worker accept → Submit → Review → Payment**

#### Step 1: Register & Login Client
```
1. Authentication → Register User
   Body: {
     "username": "client1",
     "email": "client1@paytask.com",
     "password": "password123",
     "role": "client"
   }
   ✅ Saves: accessToken, userId

2. Authentication → Login User
   Body: { "email": "client1@paytask.com", "password": "password123" }
   ✅ Updates: accessToken
```

#### Step 2: Client Creates Task
```
3. Tasks → Create Task (Draft)
   Headers: x-user-id = {{userId}}
   Body: {
     "title": "Web Scraping Task",
     "description": "Scrape product data",
     "category": "data-entry",
     "reward": 10.50,
     "qty": 2,
     "deadline": "2025-11-15T23:59:59Z"
   }
   ✅ Saves: taskId

4. Wallet → Lock Escrow
   Body: { "taskId": "{{taskId}}" }
   ✅ Locks funds in escrow

5. Tasks → Publish Task
   Headers: x-user-id = {{userId}}
   Body: { "txHash": "5YNm..." }
   ✅ Task status: draft → open
```

#### Step 3: Register & Login Worker
```
6. Authentication → Register User
   Body: {
     "username": "worker1",
     "email": "worker1@paytask.com",
     "password": "password123",
     "role": "worker"
   }
   ✅ Saves: accessToken, userId (workerUserId)

7. Authentication → Login User
   Body: { "email": "worker1@paytask.com", "password": "password123" }
```

#### Step 4: Worker Discovers & Accepts Task
```
8. Tasks → Discover Tasks
   Headers: x-user-id = {{userId}}
   Query: ?category=data-entry&minReward=5
   ✅ Browse available tasks

9. Assignments → Accept Task
   Body: { "taskId": "{{taskId}}", "workerId": "{{userId}}" }
   ✅ Saves: assignmentId
   ✅ Assignment status: in_progress
```

#### Step 5: Worker Submits Work
```
10. Submissions → Upload File
    Body: FormData with file
    ✅ Saves: fileUrl, fileHash

11. Submissions → Create Submission
    Body: {
      "assignmentId": "{{assignmentId}}",
      "payloadUrl": "{{fileUrl}}",
      "payloadHash": "{{fileHash}}",
      "metadata": {
        "fileSize": 1024000,
        "fileName": "submission.pdf",
        "mimeType": "application/pdf"
      }
    }
    ✅ Saves: submissionId
    ✅ Submission status: submitted
    ✅ QA checks: automatic validation
```

#### Step 6: Client Reviews Submission
```
12. Reviews → Create Review
    Headers: x-user-id = {{clientUserId}}
    Body: {
      "submissionId": "{{submissionId}}",
      "decision": "approve",
      "feedback": "Great work!"
    }
    ✅ Review saved
    ✅ Triggers payout
```

#### Step 7: Payment Released to Worker
```
13. Wallet → Payout to Worker
    Body: {
      "taskId": "{{taskId}}",
      "recipientUserId": "{{workerUserId}}"
    }
    ✅ Payment released from escrow
    ✅ Worker receives funds
    ✅ Task completed
```

#### Step 8: Rate Each Other
```
14. Ratings → Create Rating (Client rates Worker)
    Headers: x-user-id = {{clientUserId}}
    Body: {
      "toUserId": "{{workerUserId}}",
      "taskId": "{{taskId}}",
      "score": 5,
      "comment": "Excellent work!"
    }

15. Ratings → Create Rating (Worker rates Client)
    Headers: x-user-id = {{workerUserId}}
    Body: {
      "toUserId": "{{clientUserId}}",
      "taskId": "{{taskId}}",
      "score": 5,
      "comment": "Great client!"
    }
```

---

## 📚 API Collections Overview

### 🔐 **Authentication** (4 requests)
- Register User
- Login User
- Logout User
- Token Introspection

### 📝 **Tasks** (8 requests)
- Create Task (Draft)
- Update Task Draft
- Publish Task
- Discover Tasks (with filters)
- Get Task Details
- List My Tasks
- Cancel Task
- Delete Draft Task

### ✅ **Assignments** (4 requests)
- Accept Task
- List My Assignments
- Get Assignment Details
- Get Task Assignments

### 📤 **Submissions** (4 requests)
- Upload File
- Create Submission
- Get Submission Details
- Get Submission by Assignment

### ✔️ **Reviews** (2 requests)
- Create Review (approve/reject/fix)
- Get Submission Reviews

### ⭐ **Ratings** (3 requests)
- Create Rating
- Get User Ratings
- Get Task Ratings

### 📊 **Statistics** (3 requests)
- Worker Statistics
- Client Statistics
- Task Statistics

### 💰 **Wallet** (4 requests)
- Lock Escrow
- Payout to Worker
- Withdraw Funds
- Refund Escrow

### 👤 **Users** (4 requests)
- Get User Profile
- Update User Profile
- Deactivate Account
- List All Users (Admin)

### 🐛 **Error Logs** (3 requests)
- Create Error Log
- List Error Logs
- Resolve Error

### 💚 **Health** (2 requests)
- Health Check
- Root Info

---

## 🔧 Environment Variables

The environment automatically saves these variables:

| Variable | Description | Set By |
|----------|-------------|--------|
| `baseUrl` | API base URL | Manual (default: localhost:3000) |
| `accessToken` | JWT access token | Register/Login |
| `userId` | Current user ID | Register/Login |
| `taskId` | Last created task ID | Create Task |
| `assignmentId` | Last assignment ID | Accept Task |
| `submissionId` | Last submission ID | Create Submission |
| `walletId` | Wallet ID | Register |
| `workerUserId` | Worker user ID | Manual |
| `clientUserId` | Client user ID | Manual |
| `fileUrl` | Uploaded file URL | Upload File |
| `fileHash` | File SHA256 hash | Upload File |
| `errorId` | Error log ID | Manual |

---

## 🎯 Testing Tips

### **Quick Test Flow:**
1. **Register 2 accounts**: 1 client + 1 worker
2. **Client flow**:
   - Create task → Lock escrow → Publish
3. **Worker flow**:
   - Discover tasks → Accept task → Upload file → Submit
4. **Client review**:
   - Review submission → Approve
5. **Payment**:
   - Payout to worker
6. **Ratings**:
   - Both rate each other

### **Test Concurrent Acceptance:**
```
Run "Accept Task" multiple times simultaneously with same taskId
→ Only first request succeeds
→ Others get 409 DOUBLE_ACCEPTANCE error
```

### **Test QA Validation:**
```
Submit with invalid file hash
→ Gets 400 QA_FAILED error
```

### **Test Late Submission:**
```
Wait until deadline passes
→ Gets 400 LATE_SUBMISSION error
```

---

## 🌐 API Documentation

After starting server, access interactive Swagger docs:
```
http://localhost:3000/api-docs
```

---

## 🔍 Common Issues

### Issue: 401 Unauthorized
**Solution**: Make sure to:
1. Login first
2. Check `accessToken` is saved in environment
3. Check `x-user-id` header is set

### Issue: 404 Task Not Found
**Solution**: 
1. Check `taskId` variable is set
2. Use correct user (client) to access task

### Issue: 400 Insufficient Balance
**Solution**:
1. Make sure wallet has enough USDC
2. Check Solana RPC is accessible

### Issue: 409 Double Acceptance
**Solution**:
- Task already full (qty reached)
- Worker already accepted this task
- Try different task

---

## 📝 Notes

- All timestamps use ISO 8601 format: `2025-11-15T23:59:59Z`
- UUIDs are auto-generated
- Passwords are hashed with bcrypt
- Files uploaded to S3 (max 10MB)
- Session tokens expire after 30 days
- Worker limit: max 3 active assignments
- Task fee: fixed 5% of reward total

---

## 🎨 Postman Features Used

✅ **Pre-request Scripts**: Auto-setup headers  
✅ **Test Scripts**: Auto-save response data to environment  
✅ **Variables**: Dynamic values across requests  
✅ **Folders**: Organized by feature  
✅ **Examples**: Response examples for each endpoint  
✅ **Documentation**: Inline descriptions  

---

## 🚀 Production Environment

To use production environment:

1. Duplicate environment
2. Rename to "PayTask Production"
3. Update `baseUrl` to production URL
4. Use production credentials

---

**Made with ❤️ for PayTask Team**  
**Version**: 1.0.0  
**Last Updated**: October 26, 2025
