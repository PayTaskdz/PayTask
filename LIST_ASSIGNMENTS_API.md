# 📋 List Assignments API - Pagination & Filter

## ✅ API MỚI: GET /api/tasks/assignments/list

API để list assignments của worker với **pagination** và **filter theo status**.

---

## 📡 ENDPOINT DETAILS

### **GET** `/api/tasks/assignments/list`

**Mô tả:** Lấy danh sách assignments của worker với pagination và filter

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| workerId | string (UUID) | No | Worker 1 ID | Worker ID (optional for testing) |
| status | enum | No | - | Filter by status |
| page | integer | No | 1 | Page number (≥ 1) |
| limit | integer | No | 10 | Items per page (1-100) |

**Status Values:**
- `in_progress` - Đang làm
- `late` - Trễ deadline
- `completed` - Đã hoàn thành
- `expired` - Hết hạn

---

## 📊 RESPONSE FORMAT

### Success 200 OK

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "assignment-uuid",
        "taskId": "task-uuid",
        "workerId": "worker-uuid",
        "status": "in_progress",
        "startedAt": "2025-10-18T10:30:00Z",
        "dueAt": "2025-10-20T10:30:00Z",
        "createdAt": "2025-10-18T10:30:00Z",
        "task": {
          "id": "task-uuid",
          "title": "Transcribe 10-minute audio file",
          "category": "transcription",
          "reward": "15.50",
          "deadline": "2025-10-25T10:00:00Z"
        },
        "submission": null
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

### Error 400 Bad Request

```json
{
  "success": false,
  "error": {
    "message": "Invalid query parameters",
    "code": "VALIDATION_ERROR",
    "details": [...]
  }
}
```

---

## 🧪 TEST EXAMPLES

### Example 1: Get All Assignments (Default)
```bash
GET /api/tasks/assignments/list
```
**Result:** Page 1, 10 items, all status

### Example 2: With Worker ID
```bash
GET /api/tasks/assignments/list?workerId=550e8400-e29b-41d4-a716-446655440004
```

### Example 3: Filter by Status
```bash
GET /api/tasks/assignments/list?status=in_progress
```
**Result:** Only in_progress assignments

### Example 4: With Pagination
```bash
GET /api/tasks/assignments/list?page=2&limit=5
```
**Result:** Page 2, 5 items per page

### Example 5: Combined Filters
```bash
GET /api/tasks/assignments/list?workerId=550e8400-e29b-41d4-a716-446655440004&status=in_progress&page=1&limit=10
```
**Result:** Worker 1's in_progress assignments, page 1, 10 items

### Example 6: Worker 2's Assignments
```bash
GET /api/tasks/assignments/list?workerId=550e8400-e29b-41d4-a716-446655440006
```
**Result:** Worker 2's all assignments

---

## 🎯 TEST TRÊN SWAGGER

### Bước 1: Mở Swagger
```
http://localhost:3000/api-docs
```

### Bước 2: Tìm Endpoint
- Section: **Assignments**
- Endpoint: **GET /api/tasks/assignments/list**

### Bước 3: Test Default (No Params)
1. Click: **"Try it out"**
2. Click: **"Execute"** (không điền gì)
3. Xem: Tất cả assignments của Worker 1

### Bước 4: Test với Filter
1. Click: **"Try it out"**
2. Điền:
   - `workerId`: `550e8400-e29b-41d4-a716-446655440004`
   - `status`: `in_progress`
   - `page`: `1`
   - `limit`: `10`
3. Click: **"Execute"**
4. Xem: Chỉ assignments đang in_progress

---

## 📝 SO SÁNH VỚI /my-assignments

| Feature | `/list` | `/my-assignments` |
|---------|---------|-------------------|
| Pagination | ✅ Yes | ❌ No |
| Filter by status | ✅ Yes | ❌ No |
| Submission info | ✅ Yes | ❌ No |
| Response format | With pagination | Simple array |
| Use case | Production | Simple testing |

---

## 💡 USE CASES

### Use Case 1: Worker Dashboard - List All
```
GET /api/tasks/assignments/list?workerId=WORKER_ID
→ Show all assignments
```

### Use Case 2: Active Tasks Only
```
GET /api/tasks/assignments/list?status=in_progress
→ Show only active tasks worker is working on
```

### Use Case 3: Completed History
```
GET /api/tasks/assignments/list?status=completed&page=1&limit=20
→ Show completed tasks history
```

### Use Case 4: Late Assignments Alert
```
GET /api/tasks/assignments/list?status=late
→ Show overdue tasks that need attention
```

### Use Case 5: Pagination for Many Assignments
```
GET /api/tasks/assignments/list?page=1&limit=5
→ Show 5 assignments per page
```

---

## 🎨 RESPONSE FIELDS EXPLAINED

### Assignment Object
```typescript
{
  id: string;              // Assignment UUID
  taskId: string;          // Task UUID
  workerId: string;        // Worker UUID
  status: string;          // Current status
  startedAt: string;       // When accepted (ISO)
  dueAt: string;           // Deadline (ISO)
  createdAt: string;       // Created timestamp (ISO)
  task: {...};            // Task details
  submission: {...}|null;  // Submission if exists
}
```

### Task Object (Nested)
```typescript
{
  id: string;
  title: string;
  category: string | null;
  reward: string;          // Decimal as string
  deadline: string | null; // ISO date
}
```

### Submission Object (Nested, if exists)
```typescript
{
  id: string;
  status: string;          // submitted, fix_requested, etc.
  submittedAt: string;     // ISO date
}
```

### Pagination Object
```typescript
{
  page: number;      // Current page
  limit: number;     // Items per page
  total: number;     // Total items
  totalPages: number; // Total pages
}
```

---

## 🔥 SAMPLE WORKFLOW

### Worker Login → View Tasks

```bash
# 1. List all active assignments
GET /api/tasks/assignments/list?status=in_progress

# 2. Worker sees:
{
  "data": [
    {
      "task": {
        "title": "Transcribe audio",
        "reward": "15.50"
      },
      "dueAt": "2025-10-25T10:00:00Z",
      "submission": null  // Not submitted yet
    }
  ]
}

# 3. Worker completes and submits (future API)
POST /api/tasks/submissions/submit
{
  "assignmentId": "...",
  ...
}

# 4. Check again
GET /api/tasks/assignments/list?status=completed
```

---

## 🆚 API COMPARISON

### 3 Assignment APIs Available:

**1. POST /api/tasks/assignments/accept**
- Purpose: Accept a new task
- Use: Worker wants to take a task

**2. GET /api/tasks/assignments/my-assignments**
- Purpose: Simple list (no pagination)
- Use: Quick view of all assignments

**3. GET /api/tasks/assignments/list** ← **MỚI!**
- Purpose: Advanced list with filters
- Use: Production dashboard, filtering, pagination

---

## 📊 TỔNG SỐ APIs: 10 APIs

1. GET /api/tasks/all
2. GET /api/tasks/discover
3. GET /api/tasks/{taskId}
4. POST /api/tasks/assignments/accept
5. GET /api/tasks/assignments/my-assignments
6. **GET /api/tasks/assignments/list** ← MỚI!
7. GET /api/stats/tasks
8. GET /api/stats/categories
9. POST /api/stats/cache/clear
10. GET /health

---

## 🚀 RESTART & TEST

### Restart Server
```bash
# Stop (Ctrl+C) và start lại
npm run dev
```

### Test với cURL
```bash
# Default
curl "http://localhost:3000/api/tasks/assignments/list"

# With filters
curl "http://localhost:3000/api/tasks/assignments/list?status=in_progress&page=1&limit=5"

# Worker 2
curl "http://localhost:3000/api/tasks/assignments/list?workerId=550e8400-e29b-41d4-a716-446655440006"
```

### Test với Swagger
```
http://localhost:3000/api-docs
→ Assignments
→ GET /api/tasks/assignments/list
→ Try it out
→ Execute
```

---

## ✅ FEATURES

- ✅ Pagination (page, limit)
- ✅ Filter by status
- ✅ Sort by createdAt (desc)
- ✅ Include task details
- ✅ Include submission status
- ✅ Full Swagger docs
- ✅ Zod validation
- ✅ Error handling
- ✅ Works without auth (testing)

---

## 🎉 READY TO USE!

**Restart server và test ngay:**
```
http://localhost:3000/api-docs
```

**Tìm "Assignments" section và thử API mới!** 🚀

