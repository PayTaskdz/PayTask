# 📄 Submission API Documentation

## Overview

API để submit công việc hoàn thành với QA checks tự động và early submission bonus.

---

## 🎯 Features

✅ **Automated QA Checks**
- File completeness validation
- Duplicate detection
- Format verification
- Size limits (max 100MB)
- Hash validation

✅ **Early Submission Bonus**
- 0.1 bonus point per hour early
- Automatic reputation increase
- Early submission tracking

✅ **Atomic Transactions**
- Create submission record
- Update assignment status
- Update worker profile
- All or nothing

✅ **Comprehensive Error Handling**
- Late submission detection
- Duplicate submission prevention
- Assignment validation
- QA failure reporting

---

## 📋 API Endpoints

### 1. Create Submission

**Endpoint:** `POST /api/submissions/create`

**Description:** Submit completed work for an assignment

**Request Body:**
```json
{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440000",
  "payloadUrl": "https://storage.paytask.com/submissions/file123.txt",
  "payloadHash": "sha256:a3b2c1d4e5f6...",
  "metadata": {
    "fileSize": 2048,
    "fileName": "transcription.txt",
    "mimeType": "text/plain"
  }
}
```

**Parameters:**
- `assignmentId` (string, required): UUID of the assignment
- `payloadUrl` (string, required): URL to submission file
- `payloadHash` (string, required): SHA256 hash (format: `sha256:...`)
- `metadata` (object, optional):
  - `fileSize` (number): File size in bytes
  - `fileName` (string): Original file name
  - `mimeType` (string): MIME type

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Submission created successfully",
  "data": {
    "id": "submission-uuid",
    "assignmentId": "assignment-uuid",
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

**404 - Assignment Not Found:**
```json
{
  "success": false,
  "error": {
    "message": "Assignment not found",
    "code": "ASSIGNMENT_NOT_FOUND"
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

### 2. Get Submission by ID

**Endpoint:** `GET /api/submissions/{submissionId}`

**Description:** Get detailed submission information

**Parameters:**
- `submissionId` (string, required): UUID of the submission

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "submission-uuid",
    "assignmentId": "assignment-uuid",
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
    "assignment": {
      "id": "assignment-uuid",
      "taskId": "task-uuid",
      "workerId": "worker-uuid",
      "status": "completed",
      "task": {
        "id": "task-uuid",
        "title": "Transcribe 10-minute audio file",
        "reward": "15.50"
      },
      "worker": {
        "id": "worker-uuid",
        "email": "worker@example.com"
      }
    }
  }
}
```

---

## 🔍 QA Check Details

### 1. Completeness Check
- Validates file is not empty (fileSize > 0)
- **Fails if:** fileSize === 0

### 2. Duplicate Check
- Checks if payloadHash already exists in database
- **Fails if:** Another submission has the same hash

### 3. Format Check
- Validates MIME type against allowed list
- **Allowed types:**
  - `text/plain`
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `audio/mpeg`
  - `video/mp4`
  - `application/zip`
- **Fails if:** MIME type not in allowed list

### 4. Size Check
- Validates file size <= 100MB
- **Fails if:** fileSize > 104,857,600 bytes

### 5. Hash Validation
- Ensures hash format is correct
- **Fails if:** Hash doesn't start with `sha256:`

---

## 💰 Early Submission Bonus

### Calculation
```
hoursEarly = (dueAt - submittedAt) / 3600
rawBonus = hoursEarly * 0.1
bonusPoints = min(rawBonus, 5.0)  // Capped at 5.0 points
```

### Examples
- **10h early:** 1.0 bonus points
- **26h early:** 2.6 bonus points
- **50h early:** 5.0 bonus points (capped)
- **100h early:** 5.0 bonus points (capped, not 10.0)

### Benefits
- Worker reputation increases by bonus points
- Early submission counter increases
- Shows commitment and reliability

---

## 🔄 System Flow

```
1. Worker submits file
   ↓
2. System validates assignment
   ↓
3. Check if already submitted → DUPLICATE_SUBMISSION error
   ↓
4. Check if late → LATE_SUBMISSION error
   ↓
5. Run QA checks → QA_FAILED error if fails
   ↓
6. Calculate early bonus
   ↓
7. Create submission record
   ↓
8. Update worker profile (if early)
   ↓
9. Update assignment status to 'completed'
   ↓
10. Return success response
```

---

## 🧪 Testing Guide

### Step 1: Get an Assignment ID

First, accept a task to get an assignment:

```http
POST http://localhost:3000/api/tasks/assignments/accept
Content-Type: application/json

{
  "taskId": "YOUR_TASK_ID",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}
```

Copy the `id` from the response.

### Step 2: Create a Submission

```http
POST http://localhost:3000/api/submissions/create
Content-Type: application/json

{
  "assignmentId": "YOUR_ASSIGNMENT_ID",
  "payloadUrl": "https://storage.paytask.com/submissions/test-file.txt",
  "payloadHash": "sha256:a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "metadata": {
    "fileSize": 2048,
    "fileName": "transcription.txt",
    "mimeType": "text/plain"
  }
}
```

### Step 3: Verify Submission

```http
GET http://localhost:3000/api/submissions/{submissionId}
```

### Test Cases

#### ✅ Valid Submission (Early)
```json
{
  "assignmentId": "valid-assignment-id",
  "payloadUrl": "https://storage.paytask.com/submissions/valid.txt",
  "payloadHash": "sha256:unique123456",
  "metadata": {
    "fileSize": 2048,
    "fileName": "work.txt",
    "mimeType": "text/plain"
  }
}
```

#### ❌ Empty File
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

#### ❌ Invalid Format
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

#### ❌ Duplicate Hash
Submit the same payload hash twice - second one will fail.

#### ❌ Already Submitted
Try to submit to the same assignment twice - will fail.

---

## 📊 Database Changes

### Created Records

1. **Submission Table:**
   - New submission record with QA flags
   - Links to assignment

2. **WorkerProfile Table (if early):**
   - `earlySubmissions` +1
   - `reputation` + bonusPoints

3. **Assignment Table:**
   - Status updated to 'completed'

### Transaction Safety

All operations are wrapped in `prisma.$transaction()`:
- If any step fails, entire transaction rolls back
- Prevents partial updates
- Ensures data consistency

---

## 🚀 Quick Start with Swagger

1. **Start server:**
```bash
npm run dev
```

2. **Open Swagger UI:**
```
http://localhost:3000/docs
```

3. **Navigate to "Submissions" section**

4. **Try "Create Submission" endpoint:**
   - Click "Try it out"
   - Fill in the request body
   - Click "Execute"

5. **Check the response:**
   - View QA check results
   - See early submission bonus
   - Verify status updates

---

## 🎓 Best Practices

### For Workers

1. **Submit Early:**
   - Get bonus points
   - Improve reputation
   - Show reliability

2. **Check File Before Submit:**
   - Verify file is not empty
   - Ensure correct format
   - Confirm size <= 100MB

3. **Generate Correct Hash:**
   ```bash
   # Generate SHA256 hash
   sha256sum file.txt
   ```
   Format: `sha256:HASH_HERE`

### For Developers

1. **Validate Input:**
   - Always check assignment exists
   - Verify worker owns assignment
   - Confirm not already submitted

2. **Handle Errors Gracefully:**
   - Return specific error codes
   - Provide helpful error messages
   - Log errors for debugging

3. **Test Edge Cases:**
   - Late submission
   - Duplicate submission
   - Invalid file formats
   - Large files

---

## 📈 Monitoring

### Success Metrics
- Submission success rate
- Average early submission hours
- QA check pass rate
- Worker reputation growth

### Error Tracking
- Late submission count
- QA failure reasons
- Duplicate submission attempts
- Format validation failures

---

## 🐛 Troubleshooting

### Issue: "ASSIGNMENT_NOT_FOUND"
**Solution:** Verify assignment ID is correct and exists in database

### Issue: "DUPLICATE_SUBMISSION"
**Solution:** This assignment already has a submission. Check assignment status.

### Issue: "LATE_SUBMISSION"
**Solution:** Deadline has passed. Cannot submit late work.

### Issue: "QA_FAILED"
**Possible causes:**
- Empty file (fileSize = 0)
- Invalid format (not in allowed list)
- File too large (> 100MB)
- Duplicate hash
- Invalid hash format

**Solution:** Check QA failure details in error response

---

## 🔐 Security Notes

1. **Hash Verification:**
   - Server should verify file hash matches
   - Prevents file tampering
   - Ensures file integrity

2. **File Storage:**
   - Store files securely
   - Validate file contents
   - Scan for malware

3. **Access Control:**
   - Only assignment owner can submit
   - Verify worker authorization
   - Log all submission attempts

---

## 📝 Example Response Timeline

```
User Action: Submit work
↓
System: Check assignment (0.1s)
↓
System: Validate not duplicate (0.2s)
↓
System: Check deadline (0.1s)
↓
System: Run QA checks (0.5s)
↓
System: Calculate bonus (0.1s)
↓
System: Create submission (0.3s)
↓
System: Update worker profile (0.2s)
↓
System: Update assignment (0.2s)
↓
Total Time: ~1.7s
↓
Return: Success response with bonus info
```

---

## 🎉 Summary

Submission API cung cấp:
- ✅ Automated QA validation
- ✅ Early submission rewards
- ✅ Atomic transactions
- ✅ Comprehensive error handling
- ✅ Worker reputation tracking
- ✅ Full Swagger documentation

Perfect for ensuring quality submissions while rewarding fast, reliable workers!

