# 🚀 READY TO TEST SUBMISSION API

## ✅ Database Seeded với Fixed IDs

Assignment IDs có sẵn:
- **Assignment 1 ID:** `550e8400-e29b-41d4-a716-446655440020` (Worker 1)
- **Assignment 2 ID:** `550e8400-e29b-41d4-a716-446655440021` (Worker 2)

---

## 📝 Test Submission API - Copy & Paste Luôn!

### Test Case 1: Submit Assignment 1

```json
{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440020",
  "payloadUrl": "https://storage.paytask.com/submissions/test-file-001.txt",
  "payloadHash": "sha256:abc123def456ghi789jkl012mno345pqr",
  "metadata": {
    "fileSize": 2048,
    "fileName": "transcription.txt",
    "mimeType": "text/plain"
  }
}
```

### Test Case 2: Submit Assignment 2

```json
{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440021",
  "payloadUrl": "https://storage.paytask.com/submissions/test-file-002.txt",
  "payloadHash": "sha256:xyz789uvw456rst123abc890def567ghi",
  "metadata": {
    "fileSize": 3072,
    "fileName": "categorization.txt",
    "mimeType": "text/plain"
  }
}
```

---

## 🎯 How to Test on Swagger

1. **Open Swagger UI:**
   ```
   http://localhost:3000/docs
   ```

2. **Navigate to "Submissions" section**

3. **Click on `POST /api/submissions/create`**

4. **Click "Try it out"**

5. **Paste request body** (Test Case 1 hoặc 2 ở trên)

6. **Click "Execute"**

7. **Check Response:**
   - Status 201 = Success! 🎉
   - Status 400/404/409 = Check error message

---

## 📋 Expected Success Response

```json
{
  "success": true,
  "message": "Submission created successfully",
  "data": {
    "id": "new-submission-uuid",
    "assignmentId": "550e8400-e29b-41d4-a716-446655440020",
    "payloadUrl": "https://storage.paytask.com/submissions/test-file-001.txt",
    "payloadHash": "sha256:abc123def456ghi789jkl012mno345pqr",
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
    "hoursEarly": 288.5,
    "bonusPoints": 28.9
  }
}
```

**Notes:**
- ✅ All QA checks passed
- 🎁 Early submission bonus calculated
- 📊 Worker reputation updated automatically
- ✨ Assignment status changed to 'completed'

---

## 🔄 Test Multiple Times

**Important:** Mỗi assignment chỉ submit được **1 lần**!

Nếu muốn test lại:
1. Thay đổi `payloadHash` (phải unique)
2. Hoặc accept task mới để có assignment mới
3. Hoặc reset database: `npm run prisma:reset --force && npm run prisma:seed`

---

## 🧪 Test Different Scenarios

### ✅ Valid PDF File
```json
{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440020",
  "payloadUrl": "https://storage.paytask.com/submissions/document.pdf",
  "payloadHash": "sha256:pdf123456789abcdef",
  "metadata": {
    "fileSize": 51200,
    "fileName": "document.pdf",
    "mimeType": "application/pdf"
  }
}
```

### ✅ Valid Image
```json
{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440020",
  "payloadUrl": "https://storage.paytask.com/submissions/image.jpg",
  "payloadHash": "sha256:img987654321fedcba",
  "metadata": {
    "fileSize": 102400,
    "fileName": "image.jpg",
    "mimeType": "image/jpeg"
  }
}
```

### ❌ Empty File (Should Fail)
```json
{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440020",
  "payloadUrl": "https://storage.paytask.com/submissions/empty.txt",
  "payloadHash": "sha256:empty000000000000000",
  "metadata": {
    "fileSize": 0,
    "fileName": "empty.txt",
    "mimeType": "text/plain"
  }
}
```

**Expected:** Status 400, code: `QA_FAILED`

### ❌ Invalid MIME Type (Should Fail)
```json
{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440020",
  "payloadUrl": "https://storage.paytask.com/submissions/virus.exe",
  "payloadHash": "sha256:exe111111111111111",
  "metadata": {
    "fileSize": 1024,
    "fileName": "virus.exe",
    "mimeType": "application/x-msdownload"
  }
}
```

**Expected:** Status 400, code: `QA_FAILED`

### ❌ File Too Large (Should Fail)
```json
{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440020",
  "payloadUrl": "https://storage.paytask.com/submissions/huge.zip",
  "payloadHash": "sha256:huge222222222222222",
  "metadata": {
    "fileSize": 200000000,
    "fileName": "huge.zip",
    "mimeType": "application/zip"
  }
}
```

**Expected:** Status 400, code: `QA_FAILED`

---

## 📊 Verify in Database

After successful submission:

```sql
-- Check submission
SELECT * FROM "submissions" 
WHERE "assignment_id" = '550e8400-e29b-41d4-a716-446655440020';

-- Check assignment status updated
SELECT id, status FROM "assignments"
WHERE id = '550e8400-e29b-41d4-a716-446655440020';
-- Should show: status = 'completed'

-- Check worker reputation increased
SELECT "reputation", "earlySubmissions", "completedTasks"
FROM "worker_profiles"
WHERE "user_id" = '550e8400-e29b-41d4-a716-446655440004';
```

---

## 🎓 Understanding the Flow

1. **You submit** → API validates assignment exists
2. **Check deadline** → If late, reject
3. **Check duplicate** → If already submitted, reject
4. **Run QA checks** → 5 automated checks
5. **Calculate bonus** → Early submission gets points
6. **Create submission** → Save to database
7. **Update worker profile** → Add reputation points
8. **Update assignment** → Mark as 'completed'
9. **Return response** → With all details

All in **atomic transaction** - if any step fails, everything rolls back!

---

## 🎉 Quick Start

**Fastest way to test:**

1. Copy Test Case 1
2. Open: http://localhost:3000/docs
3. Find: POST /api/submissions/create
4. Paste & Execute
5. Done! 🚀

---

## 💡 Pro Tips

1. **Unique Hash:** Mỗi submission cần hash unique
2. **Early Bonus:** Submit càng sớm càng nhiều points
3. **Valid MIME:** Chỉ accept: text, pdf, image, audio, video, zip
4. **Size Limit:** Max 100MB
5. **One Time:** Mỗi assignment chỉ submit 1 lần

---

## 🐛 If Error Occurs

1. **Check terminal logs** - Chi tiết error
2. **Read error message** - Có hints
3. **Verify assignment ID** - Phải tồn tại và valid
4. **Check QA details** - Xem check nào fail

---

## ✨ Ready to Go!

Assignment IDs sẵn sàng:
- ✅ `550e8400-e29b-41d4-a716-446655440020`
- ✅ `550e8400-e29b-41d4-a716-446655440021`

Server running at: **http://localhost:3000**

**GO TEST NOW!** 🚀

