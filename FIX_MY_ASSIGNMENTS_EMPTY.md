# 🐛 Fix: API my-assignments trả về rỗng

## 🔍 Vấn đề

API `/api/tasks/assignments/my-assignments` trả về success nhưng data rỗng.

---

## ✅ Nguyên nhân & Giải pháp

### Nguyên nhân 1: Worker ID không có assignments

Trong seed data, chỉ có **2 workers có assignments**:

- **Worker 1 ID:** `550e8400-e29b-41d4-a716-446655440004`
  - Assignment ID: `550e8400-e29b-41d4-a716-446655440020`

- **Worker 2 ID:** `550e8400-e29b-41d4-a716-446655440006`
  - Assignment ID: `550e8400-e29b-41d4-a716-446655440021`

**Solution:** Dùng đúng Worker ID có assignments!

---

### Nguyên nhân 2: Redis cache trống

API có Redis caching. Nếu cache trống từ trước, nó sẽ trả về rỗng.

**Solution:** Clear cache hoặc chờ cache expire (2 minutes).

---

## 🚀 Test Lại với Worker IDs đúng

### Test với Worker 1 (có assignment):

```http
GET http://localhost:3000/api/tasks/assignments/my-assignments?workerId=550e8400-e29b-41d4-a716-446655440004
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "taskId": "550e8400-e29b-41d4-a716-446655440018",
      "status": "in_progress",
      "startedAt": "2025-10-20T...",
      "dueAt": "2025-11-02T10:00:00.000Z",
      "task": {
        "id": "550e8400-e29b-41d4-a716-446655440018",
        "title": "Already assigned task",
        "reward": "10.00",
        "deadline": "2025-11-02T10:00:00.000Z"
      }
    }
  ]
}
```

---

### Test với Worker 2 (có assignment):

```http
GET http://localhost:3000/api/tasks/assignments/my-assignments?workerId=550e8400-e29b-41d4-a716-446655440006
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440021",
      "taskId": "550e8400-e29b-41d4-a716-446655440019",
      "status": "in_progress",
      "startedAt": "2025-10-20T...",
      "dueAt": "2025-11-05T16:00:00.000Z",
      "task": {
        "id": "550e8400-e29b-41d4-a716-446655440019",
        "title": "Product categorization for e-commerce",
        "reward": "50.00",
        "deadline": "2025-11-05T16:00:00.000Z"
      }
    }
  ]
}
```

---

## 🔧 Clear Cache Nếu Cần

### Clear cache cho worker cụ thể:

```http
POST http://localhost:3000/api/stats/cache/clear
```

Hoặc restart Redis:
```bash
redis-cli FLUSHALL
```

---

## 🧪 Test Flow Hoàn Chỉnh

### Step 1: Accept một task mới

```http
POST http://localhost:3000/api/tasks/assignments/accept
Content-Type: application/json

{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}
```

**Copy `id` từ response** (đây là assignment ID mới)

---

### Step 2: List assignments

```http
GET http://localhost:3000/api/tasks/assignments/my-assignments?workerId=550e8400-e29b-41d4-a716-446655440004
```

**Should now show:**
- Old assignment (from seed)
- New assignment (just accepted)

---

## 📋 Verify in Database

```sql
-- Check assignments for worker 1
SELECT 
  a.id as assignment_id,
  a."worker_id",
  t.title,
  a.status
FROM assignments a
JOIN tasks t ON t.id = a."task_id"
WHERE a."worker_id" = '550e8400-e29b-41d4-a716-446655440004';
```

Should return at least 1 row.

---

## ⚠️ Common Mistakes

### Mistake 1: Sử dụng Task ID thay vì Worker ID

```http
❌ WRONG:
GET /api/tasks/assignments/my-assignments?workerId=550e8400-e29b-41d4-a716-446655440010
                                                       ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
                                                       This is Task ID!

✅ CORRECT:
GET /api/tasks/assignments/my-assignments?workerId=550e8400-e29b-41d4-a716-446655440004
                                                       ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
                                                       Worker ID
```

---

### Mistake 2: Worker chưa accept task nào

Nếu worker mới (chưa có trong seed), cần accept task trước:

```http
POST /api/tasks/assignments/accept
{
  "taskId": "...",
  "workerId": "NEW_WORKER_ID"
}
```

Sau đó mới có assignments để list.

---

## 🎯 Quick Fix

**Copy & paste test ngay:**

```http
GET http://localhost:3000/api/tasks/assignments/my-assignments?workerId=550e8400-e29b-41d4-a716-446655440004
```

Nếu vẫn rỗng:
1. Check Redis có đang chạy không: `redis-cli PING`
2. Clear cache: `redis-cli FLUSHALL`
3. Restart server: `npm run dev`
4. Test lại

---

## 📊 Debug Steps

### 1. Check Worker exists:
```sql
SELECT * FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440004';
```

### 2. Check Assignments exist:
```sql
SELECT * FROM assignments WHERE "worker_id" = '550e8400-e29b-41d4-a716-446655440004';
```

### 3. Check Redis cache:
```bash
redis-cli
GET "assignments:worker:550e8400-e29b-41d4-a716-446655440004"
```

### 4. Clear specific cache:
```bash
redis-cli
DEL "assignments:worker:550e8400-e29b-41d4-a716-446655440004"
```

---

## ✅ Summary

**Worker IDs có assignments trong seed:**
- `550e8400-e29b-41d4-a716-446655440004` (Worker 1)
- `550e8400-e29b-41d4-a716-446655440006` (Worker 2)

**Dùng 1 trong 2 IDs này để test!**

**Nếu muốn test với worker khác:**
1. Accept task trước → Tạo assignment
2. Sau đó mới list assignments

