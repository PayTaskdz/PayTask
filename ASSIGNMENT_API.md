# 🎯 Assignment API - Worker Accepts Task

## ✅ ĐÃ HOÀN THÀNH

API mới để worker accept task với đầy đủ validation và Swagger!

---

## 📡 CÁC API MỚI

### 1. **POST /api/tasks/assignments/accept** - Accept Task

**Mô tả:** Worker chấp nhận một task có sẵn

**Request Body:**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}
```

**Note:** `workerId` là optional (dùng để test không cần auth). Nếu không truyền sẽ dùng worker mẫu.

**Response 201 Created:**
```json
{
  "success": true,
  "message": "Task accepted successfully",
  "data": {
    "id": "assignment-uuid",
    "taskId": "550e8400-e29b-41d4-a716-446655440010",
    "workerId": "550e8400-e29b-41d4-a716-446655440004",
    "status": "in_progress",
    "startedAt": "2025-10-20T02:30:00.000Z",
    "dueAt": "2025-10-25T10:00:00.000Z",
    "createdAt": "2025-10-20T02:30:00.000Z",
    "task": {
      "title": "Transcribe 10-minute audio file",
      "reward": "15.50",
      "deadline": "2025-10-25T10:00:00.000Z"
    }
  }
}
```

---

### 2. **GET /api/tasks/assignments/my-assignments** - Get My Assignments

**Mô tả:** Lấy tất cả assignments của worker

**Query Parameters:**
- `workerId` (optional): UUID của worker

**Response 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "id": "assignment-uuid",
      "taskId": "550e8400-e29b-41d4-a716-446655440010",
      "status": "in_progress",
      "startedAt": "2025-10-20T02:30:00.000Z",
      "dueAt": "2025-10-25T10:00:00.000Z",
      "createdAt": "2025-10-20T02:30:00.000Z",
      "task": {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "title": "Transcribe 10-minute audio file",
        "description": "Clear English audio...",
        "category": "transcription",
        "reward": "15.50",
        "deadline": "2025-10-25T10:00:00.000Z",
        "status": "open"
      }
    }
  ]
}
```

---

## ✅ VALIDATIONS (Tự Động)

API sẽ check tất cả điều kiện sau:

1. ✅ Worker có < 3 active assignments
2. ✅ Task status = 'open'
3. ✅ Escrow status = 'held'
4. ✅ Task chưa fully assigned
5. ✅ Worker chưa accept task này trước đó

---

## 🚨 ERROR RESPONSES

### 400 - Concurrency Cap
```json
{
  "success": false,
  "error": {
    "message": "Maximum concurrent assignments (3) reached",
    "code": "CONCURRENCY_CAP"
  }
}
```

### 400 - Already Accepted
```json
{
  "success": false,
  "error": {
    "message": "You have already accepted this task",
    "code": "ALREADY_ACCEPTED"
  }
}
```

### 400 - Task Not Open
```json
{
  "success": false,
  "error": {
    "message": "Task is not open for acceptance",
    "code": "TASK_NOT_OPEN"
  }
}
```

### 400 - Escrow Not Held
```json
{
  "success": false,
  "error": {
    "message": "Task is not funded (escrow not held)",
    "code": "ESCROW_NOT_HELD"
  }
}
```

### 404 - Not Found
```json
{
  "success": false,
  "error": {
    "message": "Task not found",
    "code": "NOT_FOUND"
  }
}
```

### 409 - Double Acceptance
```json
{
  "success": false,
  "error": {
    "message": "Task already assigned to another worker",
    "code": "DOUBLE_ACCEPTANCE"
  }
}
```

---

## 🚀 TEST TRÊN SWAGGER

### Bước 1: Restart Server
```bash
# Stop (Ctrl+C) và start lại
npm run dev
```

### Bước 2: Mở Swagger
```
http://localhost:3000/api-docs
```

### Bước 3: Test Accept Task

1. Tìm: **POST /api/tasks/assignments/accept**
2. Click: **"Try it out"**
3. Body:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010"
}
```
4. Click: **"Execute"**
5. Xem response: Assignment đã được tạo! ✅

---

## 🧪 TEST SCENARIOS

### Scenario 1: Accept Task Thành Công
```bash
POST /api/tasks/assignments/accept
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010"
}
```
**Expected:** 201, assignment created

### Scenario 2: Accept Task Đã Accept
```bash
# Accept lần 2 cùng task
POST /api/tasks/assignments/accept
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010"
}
```
**Expected:** 400, ALREADY_ACCEPTED

### Scenario 3: Accept Nhiều Tasks
```bash
# Accept task 1
POST /api/tasks/assignments/accept
{"taskId": "550e8400-e29b-41d4-a716-446655440010"}

# Accept task 2
POST /api/tasks/assignments/accept
{"taskId": "550e8400-e29b-41d4-a716-446655440011"}

# Accept task 3
POST /api/tasks/assignments/accept
{"taskId": "550e8400-e29b-41d4-a716-446655440012"}

# Accept task 4 (should fail)
POST /api/tasks/assignments/accept
{"taskId": "550e8400-e29b-41d4-a716-446655440013"}
```
**Expected:** Task 4 fails với CONCURRENCY_CAP

### Scenario 4: Xem My Assignments
```bash
GET /api/tasks/assignments/my-assignments
```
**Expected:** 200, array với các assignments

---

## 💡 WORKER ID MẶC ĐỊNH

Nếu không truyền `workerId`, API sẽ dùng:
```
550e8400-e29b-41d4-a716-446655440004
```
(Worker được tạo từ seed script)

---

## 🔥 TÍNH NĂNG

### ✅ Atomic Transaction
- Tất cả checks và create trong 1 transaction
- Nếu có bất kỳ validation nào fail → rollback
- Đảm bảo data consistency

### ✅ Cache Management
- Tự động clear cache sau khi accept
- Worker assignments được cache 2 phút
- Task lists cũng được clear để update assignment count

### ✅ Business Logic
- `dueAt` = task.deadline hoặc now + 48h
- `status` = 'in_progress'
- `startedAt` = now()

---

## 📚 FILES ĐÃ TẠO

1. `src/types/assignment.types.ts` - TypeScript types
2. `src/services/assignment.service.ts` - Business logic
3. `src/routes/assignment.routes.ts` - API routes
4. Updated `src/app.ts` - Register routes

---

## 🎯 TỔNG SỐ APIs HIỆN CÓ: 9 APIs

1. GET /api/tasks/all
2. GET /api/tasks/discover
3. GET /api/tasks/{taskId}
4. **POST /api/tasks/assignments/accept** ← MỚI!
5. **GET /api/tasks/assignments/my-assignments** ← MỚI!
6. GET /api/stats/tasks
7. GET /api/stats/categories
8. POST /api/stats/cache/clear
9. GET /health

---

## 🧪 TEST NHANH

### Test với cURL:
```bash
# Accept task
curl -X POST http://localhost:3000/api/tasks/assignments/accept \
  -H "Content-Type: application/json" \
  -d '{"taskId":"550e8400-e29b-41d4-a716-446655440010"}'

# Get assignments
curl http://localhost:3000/api/tasks/assignments/my-assignments
```

### Test với Swagger:
```
1. Mở: http://localhost:3000/api-docs
2. Tìm: Assignments section
3. Try: POST /api/tasks/assignments/accept
4. Body: {"taskId":"550e8400-e29b-41d4-a716-446655440010"}
5. Execute!
```

---

## 🎊 SẴN SÀNG TEST!

**RESTART SERVER VÀ MỞ SWAGGER:**
```bash
# Terminal
npm run dev

# Browser
http://localhost:3000/api-docs
```

**Tìm section "Assignments" và test 2 APIs mới!** 🚀

---

## 💬 NOTES

- Skip auth như yêu cầu → truyền workerId qua body/query
- Tất cả validations đã implement
- Atomic transaction đảm bảo consistency
- Full Swagger documentation
- Error codes rõ ràng
- Response format chuẩn

**ENJOY!** 🎉

