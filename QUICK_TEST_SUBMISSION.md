# 🚀 QUICK TEST SUBMISSION API

## Step-by-Step Testing

### 1️⃣ Start Server
```bash
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

---

### 2️⃣ Open Swagger UI
```
http://localhost:3000/docs
```

---

### 3️⃣ Get an Assignment ID

**Option A: Accept a new task**

1. Mở Swagger → **Assignments** → `POST /api/tasks/assignments/accept`
2. Click "Try it out"
3. Nhập:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}
```
4. Click "Execute"
5. **Copy `id` từ response** (đây là assignmentId)

**Option B: Use existing assignment**

1. Mở Swagger → **Assignments** → `GET /api/tasks/assignments/list`
2. Click "Try it out"
3. Nhập `workerId`: `550e8400-e29b-41d4-a716-446655440004`
4. Click "Execute"
5. **Copy `id` của assignment có status `in_progress`**

---

### 4️⃣ Create Submission

1. Mở Swagger → **Submissions** → `POST /api/submissions/create`
2. Click "Try it out"
3. Nhập request body:

```json
{
  "assignmentId": "PASTE_YOUR_ASSIGNMENT_ID_HERE",
  "payloadUrl": "https://storage.paytask.com/submissions/test-file-001.txt",
  "payloadHash": "sha256:a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "metadata": {
    "fileSize": 2048,
    "fileName": "transcription.txt",
    "mimeType": "text/plain"
  }
}
```

4. Click "Execute"

---

### 5️⃣ Check Results

**Success Response:**
```json
{
  "success": true,
  "message": "Submission created successfully",
  "data": {
    "id": "new-submission-id",
    "assignmentId": "your-assignment-id",
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
    "submittedAt": "2025-10-20T...",
    "earlySubmission": true,
    "hoursEarly": 26.5,
    "bonusPoints": 2.7
  }
}
```

**Key Points:**
- ✅ All QA checks passed
- 🎯 Early submission bonus calculated
- 📊 Worker reputation updated
- ✨ Assignment status changed to 'completed'

---

### 6️⃣ View Submission Details

1. Mở Swagger → **Submissions** → `GET /api/submissions/{submissionId}`
2. Click "Try it out"
3. Nhập `submissionId` (copy từ step 5)
4. Click "Execute"

Bạn sẽ thấy:
- Full submission info
- Assignment details
- Task info
- Worker info

---

## 🧪 Test Different Scenarios

### ✅ Scenario 1: Valid Submission (Early)
```json
{
  "assignmentId": "valid-assignment-id",
  "payloadUrl": "https://storage.paytask.com/submissions/file-001.txt",
  "payloadHash": "sha256:unique123456",
  "metadata": {
    "fileSize": 2048,
    "fileName": "work.txt",
    "mimeType": "text/plain"
  }
}
```
**Expected:** Status 201, with bonus points

---

### ❌ Scenario 2: Empty File (QA Fail)
```json
{
  "assignmentId": "valid-assignment-id",
  "payloadUrl": "https://storage.paytask.com/submissions/empty.txt",
  "payloadHash": "sha256:empty123",
  "metadata": {
    "fileSize": 0,
    "fileName": "empty.txt",
    "mimeType": "text/plain"
  }
}
```
**Expected:** Status 400, code: `QA_FAILED`, error: "File is empty"

---

### ❌ Scenario 3: Invalid Format
```json
{
  "assignmentId": "valid-assignment-id",
  "payloadUrl": "https://storage.paytask.com/submissions/file.exe",
  "payloadHash": "sha256:exe123",
  "metadata": {
    "fileSize": 1024,
    "fileName": "virus.exe",
    "mimeType": "application/x-msdownload"
  }
}
```
**Expected:** Status 400, code: `QA_FAILED`, error: "Unsupported file format"

---

### ❌ Scenario 4: File Too Large
```json
{
  "assignmentId": "valid-assignment-id",
  "payloadUrl": "https://storage.paytask.com/submissions/large.zip",
  "payloadHash": "sha256:large123",
  "metadata": {
    "fileSize": 200000000,
    "fileName": "large.zip",
    "mimeType": "application/zip"
  }
}
```
**Expected:** Status 400, code: `QA_FAILED`, error: "File size exceeds 100MB limit"

---

### ❌ Scenario 5: Duplicate Hash
Submit với cùng `payloadHash` hai lần:
```json
{
  "assignmentId": "assignment-1",
  "payloadUrl": "https://storage.paytask.com/submissions/dup.txt",
  "payloadHash": "sha256:duplicate999",
  "metadata": {
    "fileSize": 1024,
    "fileName": "dup.txt",
    "mimeType": "text/plain"
  }
}
```
**Expected:** Lần 1 thành công, lần 2: Status 400, code: `QA_FAILED`, error: "Duplicate submission detected"

---

### ❌ Scenario 6: Already Submitted
Submit vào cùng assignment hai lần:
**Expected:** Lần 2: Status 409, code: `DUPLICATE_SUBMISSION`

---

### ❌ Scenario 7: Invalid Assignment ID
```json
{
  "assignmentId": "non-existent-id",
  "payloadUrl": "https://storage.paytask.com/submissions/test.txt",
  "payloadHash": "sha256:test123",
  "metadata": {
    "fileSize": 1024,
    "fileName": "test.txt",
    "mimeType": "text/plain"
  }
}
```
**Expected:** Status 404, code: `ASSIGNMENT_NOT_FOUND`

---

## 📋 Checklist

After testing, verify:

- [ ] ✅ Valid submission creates record
- [ ] ✅ QA checks run automatically
- [ ] ✅ Early bonus calculated correctly
- [ ] ✅ Worker reputation updated
- [ ] ✅ Assignment status changed to 'completed'
- [ ] ❌ Empty file rejected
- [ ] ❌ Invalid format rejected
- [ ] ❌ Large file rejected
- [ ] ❌ Duplicate hash rejected
- [ ] ❌ Double submission rejected
- [ ] ❌ Invalid assignment rejected

---

## 🎓 Understanding the Response

### QA Flags Breakdown

```json
"qaFlags": {
  "passed": true,              // ✅ Overall result
  "checks": {
    "completeness": true,      // ✅ File not empty
    "duplicate": false,        // ✅ Not duplicate
    "format": true,            // ✅ Valid MIME type
    "size": true              // ✅ Size OK
  }
}
```

### Early Bonus Calculation

```
dueAt: 2025-10-20 10:00:00
submittedAt: 2025-10-19 08:00:00
─────────────────────────────
Difference: 26 hours

bonusPoints = 26 × 0.1 = 2.6 points
```

---

## 🐛 Common Issues

### Issue: "ASSIGNMENT_NOT_FOUND"
**Fix:** 
1. Check if assignment ID is correct
2. Make sure you accepted a task first
3. Verify assignment exists in database

### Issue: "DUPLICATE_SUBMISSION"
**Fix:** 
1. This assignment already has submission
2. Use a different assignment
3. Check assignment status

### Issue: "QA_FAILED"
**Fix:** 
1. Check error details in response
2. Fix the specific failing check
3. Retry with corrected data

---

## 📊 Database Verification

After submission, check database:

```sql
-- Check submission created
SELECT * FROM "Submission" 
WHERE "assignmentId" = 'your-assignment-id';

-- Check assignment updated
SELECT * FROM "Assignment" 
WHERE id = 'your-assignment-id';
-- Should show status = 'completed'

-- Check worker profile updated
SELECT "earlySubmissions", "reputation" 
FROM "WorkerProfile" 
WHERE "userId" = 'your-worker-id';
-- Should show incremented values
```

---

## 🎉 Success!

If all tests pass, you have:
- ✅ Working submission API
- ✅ Automated QA validation
- ✅ Early submission rewards
- ✅ Worker reputation tracking
- ✅ Atomic transactions

**Next:** Integrate with frontend or test with real file uploads!

