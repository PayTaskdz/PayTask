# ✅ Enhanced Submission API Error Logging

## What I Fixed

Tôi đã thêm **chi tiết logging** vào Submission API để dễ debug hơn:

### 1. Enhanced Request Logging

**Before:**
```typescript
fastify.log.info(`Creating submission for assignment ${validatedData.assignmentId}`);
```

**After:**
```typescript
fastify.log.info(`Creating submission for assignment ${validatedData.assignmentId}`);
fastify.log.info(`Payload URL: ${validatedData.payloadUrl}`);
fastify.log.info(`Payload Hash: ${validatedData.payloadHash}`);
if (validatedData.metadata) {
  fastify.log.info(`Metadata: ${JSON.stringify(validatedData.metadata)}`);
}
```

### 2. Enhanced Error Logging

**Before:**
```typescript
fastify.log.error('Error creating submission:', error);
```

**After:**
```typescript
fastify.log.error('Error creating submission:', error);
fastify.log.error('Error message:', error.message);
fastify.log.error('Error stack:', error.stack);
```

### 3. Success Logging

```typescript
fastify.log.info(`Submission created successfully: ${submission.id}`);
```

### 4. Enhanced Error Responses

Added helpful hints:

```json
{
  "success": false,
  "error": {
    "message": "Submission failed quality checks",
    "code": "QA_FAILED",
    "details": {
      "hint": "Check fileSize (must be > 0), mimeType (must be in allowed list), size (must be <= 100MB), and hash format (must start with sha256:)"
    }
  }
}
```

---

## How to Debug Now

### Step 1: Watch Server Logs

Khi bạn test API, terminal sẽ hiện:

```
INFO: Creating submission for assignment 550e8400-...
INFO: Payload URL: https://storage.paytask.com/...
INFO: Payload Hash: sha256:a3b2c1d4e5f6...
INFO: Metadata: {"fileSize":2048,"fileName":"test.txt","mimeType":"text/plain"}
```

### Step 2: If Error Occurs

Terminal sẽ hiện:
```
ERROR: Error creating submission: Error: ASSIGNMENT_NOT_FOUND
ERROR: Error message: ASSIGNMENT_NOT_FOUND
ERROR: Error stack: Error: ASSIGNMENT_NOT_FOUND
    at SubmissionService.createSubmission (...)
```

---

## Common Errors & Solutions

### 1. ASSIGNMENT_NOT_FOUND

**Log shows:**
```
ERROR: Error message: ASSIGNMENT_NOT_FOUND
```

**Why:** Assignment ID không tồn tại

**Fix:** Get valid assignment ID:
```bash
GET http://localhost:3000/api/tasks/assignments/list?workerId=550e8400-e29b-41d4-a716-446655440004
```

---

### 2. DUPLICATE_SUBMISSION

**Log shows:**
```
ERROR: Error message: DUPLICATE_SUBMISSION
```

**Why:** Assignment đã có submission rồi

**Fix:** Accept new task:
```bash
POST http://localhost:3000/api/tasks/assignments/accept
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}
```

---

### 3. LATE_SUBMISSION

**Log shows:**
```
ERROR: Error message: LATE_SUBMISSION
```

**Why:** Đã quá `dueAt` deadline

**Fix:** Accept task mới hoặc update deadline

---

### 4. QA_FAILED

**Log shows:**
```
ERROR: Error message: QA_FAILED
```

**Check logs để xem QA nào fail:**
- File empty (fileSize = 0)
- Duplicate hash
- Invalid MIME type
- File too large

**Fix:** Update request theo hint trong error response

---

## Testing Steps

### 1. Get Valid Assignment

```http
GET http://localhost:3000/api/tasks/assignments/list?workerId=550e8400-e29b-41d4-a716-446655440004
```

**Or accept new:**
```http
POST http://localhost:3000/api/tasks/assignments/accept
Content-Type: application/json

{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}
```

### 2. Submit with Valid Data

```http
POST http://localhost:3000/api/submissions/create
Content-Type: application/json

{
  "assignmentId": "PASTE_YOUR_ASSIGNMENT_ID",
  "payloadUrl": "https://storage.paytask.com/submissions/file-001.txt",
  "payloadHash": "sha256:abc123def456",
  "metadata": {
    "fileSize": 2048,
    "fileName": "work.txt",
    "mimeType": "text/plain"
  }
}
```

### 3. Watch Terminal

You'll see:
```
INFO: Creating submission for assignment ...
INFO: Payload URL: ...
INFO: Payload Hash: ...
INFO: Metadata: {...}
INFO: Submission created successfully: 550e8400-...
```

---

## Server is Running

Server đã restart với enhanced logging:
```
http://localhost:3000
```

Swagger UI:
```
http://localhost:3000/docs
```

---

## Next Steps

1. **Try submitting again**
2. **Watch terminal logs** - Bạn sẽ thấy chi tiết request và error (nếu có)
3. **Copy error message** từ terminal
4. **Follow solution** trong TEST_SUBMISSION_DEBUG.md

---

## Quick Test

**Valid Request:**
```json
{
  "assignmentId": "GET_FROM_LIST_API",
  "payloadUrl": "https://storage.paytask.com/submissions/test.txt",
  "payloadHash": "sha256:uniquehash123",
  "metadata": {
    "fileSize": 2048,
    "fileName": "test.txt",
    "mimeType": "text/plain"
  }
}
```

**Expected Logs:**
```
INFO: Creating submission for assignment GET_FROM_LIST_API
INFO: Payload URL: https://storage.paytask.com/submissions/test.txt
INFO: Payload Hash: sha256:uniquehash123
INFO: Metadata: {"fileSize":2048,"fileName":"test.txt","mimeType":"text/plain"}
INFO: Submission created successfully: new-submission-id
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Submission created successfully",
  "data": {
    "id": "new-submission-id",
    "qaFlags": {
      "passed": true,
      "checks": {
        "completeness": true,
        "duplicate": false,
        "format": true,
        "size": true
      }
    },
    "earlySubmission": true,
    "hoursEarly": 26.5,
    "bonusPoints": 2.7
  }
}
```

---

## Need More Help?

Khi gặp error:
1. **Copy full terminal logs**
2. **Copy request body bạn gửi**
3. **Copy error response**
4. **Share với tôi** để debug chi tiết hơn

Now try again! 🚀

