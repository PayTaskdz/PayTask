# 🐛 Debug Submission API Error

## Step 1: Check Server Logs

Khi bạn thấy error "Error creating submission", hãy xem terminal nơi server đang chạy.

Server sẽ log chi tiết lỗi.

---

## Step 2: Common Issues

### Issue 1: Assignment Not Found
**Error:** `ASSIGNMENT_NOT_FOUND`

**Solution:**
1. Lấy assignment ID đúng:
```bash
GET http://localhost:3000/api/tasks/assignments/list?workerId=550e8400-e29b-41d4-a716-446655440004
```

2. Copy một `id` có `status: "in_progress"`

---

### Issue 2: Assignment Already Has Submission
**Error:** `DUPLICATE_SUBMISSION`

**Why:** Mỗi assignment chỉ được submit 1 lần

**Solution:**
1. Accept một task mới:
```bash
POST http://localhost:3000/api/tasks/assignments/accept
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}
```

2. Dùng assignment ID mới

---

### Issue 3: Late Submission
**Error:** `LATE_SUBMISSION`

**Why:** Đã quá deadline (`dueAt`)

**Solution:**
- Accept task mới (có deadline chưa đến)
- Hoặc update deadline trong database

---

### Issue 4: QA Failed
**Error:** `QA_FAILED`

**Possible causes:**
- File empty (fileSize = 0)
- Invalid MIME type
- File too large (> 100MB)
- Duplicate hash
- Invalid hash format

**Solution:** Check metadata:
```json
{
  "assignmentId": "valid-id",
  "payloadUrl": "https://storage.paytask.com/submissions/file.txt",
  "payloadHash": "sha256:MUST_START_WITH_SHA256",
  "metadata": {
    "fileSize": 2048,  // ✅ NOT 0, <= 100MB
    "fileName": "test.txt",
    "mimeType": "text/plain"  // ✅ Must be in allowed list
  }
}
```

---

### Issue 5: Worker Profile Missing
**Error:** Transaction fails

**Why:** Worker chưa có WorkerProfile

**Solution:** Chạy seed lại hoặc tạo WorkerProfile:
```sql
INSERT INTO "worker_profiles" ("id", "user_id", "reputation", "completed_tasks", "early_submissions")
VALUES (
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440004',
  0,
  0,
  0
);
```

---

## Step 3: Test với Valid Data

### Get Assignment ID First:

```http
GET http://localhost:3000/api/tasks/assignments/list?workerId=550e8400-e29b-41d4-a716-446655440004
```

**Or accept new task:**
```http
POST http://localhost:3000/api/tasks/assignments/accept
Content-Type: application/json

{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}
```

### Then Submit:

```http
POST http://localhost:3000/api/submissions/create
Content-Type: application/json

{
  "assignmentId": "PASTE_ASSIGNMENT_ID_HERE",
  "payloadUrl": "https://storage.paytask.com/submissions/test-file-001.txt",
  "payloadHash": "sha256:a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "metadata": {
    "fileSize": 2048,
    "fileName": "transcription.txt",
    "mimeType": "text/plain"
  }
}
```

---

## Step 4: Check Database State

### Check if assignment exists and is valid:
```sql
SELECT 
  a.id,
  a.status,
  a."dueAt",
  a."workerId",
  s.id as "submissionId"
FROM "assignments" a
LEFT JOIN "submissions" s ON s."assignment_id" = a.id
WHERE a.id = 'YOUR_ASSIGNMENT_ID';
```

**Should show:**
- ✅ `status` = 'in_progress'
- ✅ `dueAt` > NOW()
- ✅ `submissionId` = NULL (not submitted yet)

### Check worker profile exists:
```sql
SELECT * FROM "worker_profiles"
WHERE "user_id" = '550e8400-e29b-41d4-a716-446655440004';
```

**Should return 1 row**

---

## Step 5: Enhanced Error Response

I'll update the route to return more detailed errors:

