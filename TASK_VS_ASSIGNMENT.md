# 📚 Task vs Assignment - Hiểu Rõ Sự Khác Biệt

## 🎯 Câu hỏi: TaskId có chuyển thành AssignmentId không?

**❌ KHÔNG!** TaskId và AssignmentId là 2 UUID **hoàn toàn khác nhau**.

---

## 📊 Mối Quan Hệ

```
┌─────────────────┐
│      TASK       │  ← Created by CLIENT
│  ID: task-001   │
│  Title: "..."   │
│  Reward: $15    │
└────────┬────────┘
         │
         │ has many
         │
    ┌────┴────┬────────┬────────┐
    │         │        │        │
┌───▼───┐ ┌──▼────┐ ┌─▼─────┐ ...
│ASSIGN │ │ASSIGN │ │ASSIGN │
│ID: a1 │ │ID: a2 │ │ID: a3 │  ← Created when WORKER accepts
│Worker1│ │Worker2│ │Worker3│
└───────┘ └───────┘ └───────┘
```

**Một Task có thể có nhiều Assignments** (tùy vào `qty`)

---

## 🔄 Flow: Worker Accept Task

### Step 1: Worker chọn Task
```json
// Worker sees task
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "title": "Transcribe audio",
  "reward": "15.50"
}
```

### Step 2: Worker Accept
```http
POST /api/tasks/assignments/accept
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}
```

### Step 3: System tạo Assignment MỚI
```json
// Response with NEW Assignment
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440020",  // ← NEW Assignment ID
    "taskId": "550e8400-e29b-41d4-a716-446655440010",  // ← Original Task ID
    "workerId": "550e8400-e29b-41d4-a716-446655440004",
    "status": "in_progress",
    "startedAt": "2025-10-20T...",
    "dueAt": "2025-10-25T...",
    "task": {
      "title": "Transcribe audio",
      "reward": "15.50"
    }
  }
}
```

**Key Point:**
- `taskId` = `550e8400-...440010` (không đổi)
- `id` (assignmentId) = `550e8400-...440020` (mới tạo)

---

## 🗂️ Database Schema

```prisma
model Task {
  id          String   @id @default(uuid())  // ← Task ID
  title       String
  reward      Decimal
  
  assignments Assignment[]  // ← One Task has many Assignments
}

model Assignment {
  id       String   @id @default(uuid())  // ← Assignment ID (NEW)
  taskId   String   // ← Foreign Key to Task
  workerId String
  status   String
  
  task     Task     @relation(fields: [taskId], references: [id])
}
```

---

## 📋 Example trong Seed Data

```typescript
// 1. Create TASK
const task = await prisma.task.create({
  data: {
    id: '550e8400-e29b-41d4-a716-446655440010',  // ← Task ID
    title: 'Transcribe audio',
    reward: 15.50,
  },
});

// 2. Worker accepts → Create ASSIGNMENT
const assignment = await prisma.assignment.create({
  data: {
    id: '550e8400-e29b-41d4-a716-446655440020',  // ← Assignment ID (NEW!)
    taskId: '550e8400-e29b-41d4-a716-446655440010',  // ← Link to Task
    workerId: '550e8400-e29b-41d4-a716-446655440004',
    status: 'in_progress',
  },
});
```

**Result:**
- Task ID: `...440010`
- Assignment ID: `...440020` ← **Khác nhau!**

---

## 🎯 Use Cases

### Get Task Details
```http
GET /api/tasks/550e8400-e29b-41d4-a716-446655440010
```
Returns task info + all workers who accepted

### Get Assignment Details
```http
GET /api/tasks/assignments/my-assignments?workerId=...
```
Returns this specific worker's assignments

### Submit Work
```http
POST /api/submissions/create
{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440020"  // ← Use Assignment ID
}
```

---

## 🔍 Query Examples

### Get all assignments for a task
```sql
SELECT * FROM assignments
WHERE "task_id" = '550e8400-e29b-41d4-a716-446655440010';
```

Returns multiple assignments (different IDs) for same task.

### Get specific assignment
```sql
SELECT * FROM assignments
WHERE id = '550e8400-e29b-41d4-a716-446655440020';
```

Returns ONE assignment with its task info.

---

## 💡 Analogy (So sánh)

Think of it like:

**Task** = Job Posting
- "Need someone to transcribe audio"
- Has ID: `JOB-001`

**Assignment** = Employment Contract
- Worker A signs contract → Contract ID: `CONTRACT-A1`
- Worker B signs contract → Contract ID: `CONTRACT-B1`
- Both link to `JOB-001`

**Same job, different contracts!**

---

## ✅ Summary

| Aspect | Task | Assignment |
|--------|------|------------|
| **Created by** | Client | System (when worker accepts) |
| **ID** | taskId (fixed) | assignmentId (new UUID) |
| **Quantity** | 1 per job posting | Multiple (qty workers) |
| **Used for** | Browse/Search | Tracking worker progress |
| **Submit to** | ❌ No | ✅ Yes (submissions use assignmentId) |

---

## 🎓 Key Takeaways

1. **TaskId ≠ AssignmentId** - Hoàn toàn khác nhau
2. **One Task → Many Assignments** - 1 task nhiều workers
3. **Assignment is NEW** - Tạo mới khi worker accept
4. **Link via Foreign Key** - Assignment.taskId → Task.id
5. **Submit uses AssignmentId** - Không dùng taskId

---

## 🧪 Test to Understand

### Step 1: Get available tasks
```http
GET /api/tasks/all
```
→ Get a `taskId`

### Step 2: Accept task
```http
POST /api/tasks/assignments/accept
{
  "taskId": "FROM_STEP_1"
}
```
→ Returns NEW `assignmentId`

### Step 3: Compare IDs
```
taskId:       550e8400-e29b-41d4-a716-446655440010
assignmentId: 550e8400-e29b-41d4-a716-446655440020
              ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
              Different!
```

### Step 4: Submit work
```http
POST /api/submissions/create
{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440020"  // Use Assignment ID
}
```

---

## 🎉 Now You Know!

- ✅ Task = Job (created by client)
- ✅ Assignment = Worker accepts job (new ID)
- ✅ They're linked but different
- ✅ Submit work to Assignment, not Task

