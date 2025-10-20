# 📡 DANH SÁCH API ENDPOINTS

## Base URL: `http://localhost:3000`

---

## 🎯 TASKS APIs

### 1. GET `/api/tasks/all`
**Mô tả:** Lấy TẤT CẢ tasks trong hệ thống (không filter)

**Query Parameters:** Không có

**Example:**
```bash
GET /api/tasks/all
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "title": "Transcribe 10-minute audio file",
      "description": "Clear English audio transcription needed",
      "category": "transcription",
      "reward": "15.50",
      "qty": 1,
      "deadline": "2025-10-25T10:00:00.000Z",
      "status": "open",
      "createdAt": "2025-10-18T10:00:00.000Z",
      "client": {
        "id": "client-uuid",
        "email": "client@example.com",
        "country": "UK"
      },
      "escrow": {
        "amount": "17.05",
        "status": "held"
      },
      "_count": {
        "assignments": 0
      }
    }
  ]
}
```

**Features:**
- ✅ Hiển thị tất cả tasks (không filter gì cả)
- ✅ Bao gồm client email (khác với /discover)
- ✅ Sắp xếp theo createdAt giảm dần (mới nhất trước)
- ✅ Có Redis cache (TTL: 2 phút)

---

### 2. GET `/api/tasks/discover`
**Mô tả:** Tìm kiếm và lọc tasks có thể làm

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| category | string | No | - | Lọc theo category |
| minReward | number | No | - | Reward tối thiểu (USD) |
| maxReward | number | No | - | Reward tối đa (USD) |
| sortBy | enum | No | createdAt | Sắp xếp: createdAt, reward, deadline |
| order | enum | No | desc | Thứ tự: asc, desc |
| page | integer | No | 1 | Số trang (bắt đầu từ 1) |
| limit | integer | No | 20 | Số items/trang (max 100) |

**Examples:**
```bash
# Lấy tất cả
GET /api/tasks/discover

# Lọc category
GET /api/tasks/discover?category=transcription

# Lọc giá
GET /api/tasks/discover?minReward=20&maxReward=50

# Sắp xếp theo reward
GET /api/tasks/discover?sortBy=reward&order=desc

# Phân trang
GET /api/tasks/discover?page=1&limit=10

# Kết hợp nhiều filters
GET /api/tasks/discover?category=transcription&minReward=10&sortBy=reward&order=desc&page=1&limit=5
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "title": "Transcribe 10-minute audio file",
        "description": "Clear English audio transcription needed",
        "category": "transcription",
        "reward": "15.50",
        "qty": 1,
        "deadline": "2025-10-25T10:00:00.000Z",
        "status": "open",
        "createdAt": "2025-10-18T10:00:00.000Z",
        "client": {
          "id": "client-uuid",
          "country": "UK"
        },
        "escrow": {
          "amount": "17.05",
          "status": "held"
        },
        "_count": {
          "assignments": 0
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

---

### 3. GET `/api/tasks/:taskId`
**Mô tả:** Xem chi tiết 1 task

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| taskId | string (UUID) | Yes | ID của task |

**Example:**
```bash
GET /api/tasks/550e8400-e29b-41d4-a716-446655440010
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "clientId": "client-uuid",
    "title": "Transcribe 10-minute audio file",
    "description": "Clear English audio transcription needed",
    "category": "transcription",
    "reward": "15.50",
    "qty": 1,
    "budget": "17.05",
    "deadline": "2025-10-25T10:00:00.000Z",
    "status": "open",
    "createdAt": "2025-10-18T10:00:00.000Z",
    "client": {
      "id": "client-uuid",
      "email": "client@example.com",
      "country": "UK"
    },
    "escrow": {
      "id": "escrow-uuid",
      "taskId": "task-uuid",
      "amount": "17.05",
      "feeRate": "0.10",
      "status": "held",
      "txHashHold": "0x...",
      "createdAt": "2025-10-18T10:00:00.000Z"
    },
    "assignments": []
  }
}
```

**Response 404:**
```json
{
  "success": false,
  "error": {
    "message": "Task not found",
    "code": "NOT_FOUND"
  }
}
```

---

## 📄 SUBMISSIONS APIs

### 5. POST `/api/submissions/create`
**Mô tả:** Submit completed work with QA checks

**Request Body:**
```json
{
  "assignmentId": "550e8400-e29b-41d4-a716-446655440000",
  "payloadUrl": "https://storage.paytask.com/submissions/file123.txt",
  "payloadHash": "sha256:a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "metadata": {
    "fileSize": 2048,
    "fileName": "transcription.txt",
    "mimeType": "text/plain"
  }
}
```

**Response 201:**
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
- `400 LATE_SUBMISSION` - Deadline passed
- `400 QA_FAILED` - Failed quality checks
- `404 ASSIGNMENT_NOT_FOUND` - Assignment not found
- `409 DUPLICATE_SUBMISSION` - Already submitted

**QA Checks:**
- ✅ File not empty (completeness)
- ✅ Not duplicate hash (duplicate)
- ✅ Valid MIME type (format)
- ✅ Size <= 100MB (size)

**Early Bonus:**
- 0.1 point per hour early
- **Capped at 5.0 points maximum**
- Updates worker reputation
- Examples: 10h=1.0, 26h=2.6, 50h+=5.0 (cap)

---

### 6. GET `/api/submissions/{submissionId}`
**Mô tả:** Get submission details by ID

**Example:**
```bash
GET /api/submissions/550e8400-e29b-41d4-a716-446655440000
```

**Response 200:**
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

## 📊 STATISTICS APIs

### 4. GET `/api/stats/tasks`
**Mô tả:** Xem thống kê tổng quan về tasks

**Example:**
```bash
GET /api/stats/tasks
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "tasks": {
      "total": 8,
      "open": 8,
      "byCategory": [
        { "category": "transcription", "count": 2 },
        { "category": "data-entry", "count": 1 },
        { "category": "translation", "count": 1 },
        { "category": "categorization", "count": 1 },
        { "category": "research", "count": 1 },
        { "category": "moderation", "count": 1 },
        { "category": "customer-support", "count": 1 }
      ],
      "byStatus": [
        { "status": "open", "count": 8 }
      ]
    },
    "assignments": {
      "total": 0,
      "completed": 0
    }
  }
}
```

---

### 5. GET `/api/stats/categories`
**Mô tả:** Lấy danh sách tất cả categories

**Example:**
```bash
GET /api/stats/categories
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    "transcription",
    "data-entry",
    "translation",
    "categorization",
    "research",
    "moderation",
    "customer-support"
  ]
}
```

---

### 6. POST `/api/stats/cache/clear`
**Mô tả:** Xóa cache statistics (development only)

**Example:**
```bash
POST /api/stats/cache/clear
```

**Response 200:**
```json
{
  "success": true,
  "message": "Statistics cache cleared successfully"
}
```

---

## 💚 HEALTH CHECK

### 7. GET `/health`
**Mô tả:** Kiểm tra trạng thái hệ thống

**Example:**
```bash
GET /health
```

**Response 200 (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-19T12:00:00.000Z",
  "uptime": 123.45,
  "environment": "development",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

**Response 503 (Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-10-19T12:00:00.000Z",
  "uptime": 123.45,
  "environment": "development",
  "error": "Service unavailable"
}
```

---

## 🏠 ROOT ENDPOINT

### 8. GET `/`
**Mô tả:** API information

**Example:**
```bash
GET /
```

**Response 200:**
```json
{
  "name": "PayTask Worker API",
  "version": "1.0.0",
  "description": "Task Discovery & Acceptance API",
  "documentation": "/api-docs",
  "health": "/health",
  "endpoints": {
    "tasks": "/api/tasks"
  },
  "environment": "development"
}
```

---

## 📝 ERROR RESPONSES

### 400 Bad Request
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

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "message": "Route GET /api/invalid not found",
    "code": "NOT_FOUND"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "INTERNAL_ERROR"
  }
}
```

---

## 🎯 BUSINESS RULES

### Task Discovery Logic:
1. ✅ Chỉ show tasks có `status = 'open'`
2. ✅ Chỉ show tasks có `escrow.status = 'held'`
3. ✅ Exclude tasks worker đã accept (nếu có workerId)
4. ✅ Support filter theo category
5. ✅ Support filter theo reward range
6. ✅ Support sort theo createdAt, reward, deadline
7. ✅ Support pagination
8. ✅ Results được cache trong Redis (TTL: 300s)

---

## 🚀 TEST TRÊN SWAGGER

**URL:** http://localhost:3000/api-docs

Tất cả endpoints trên đều có sẵn trong Swagger UI với:
- ✅ Interactive testing
- ✅ Request/Response schemas
- ✅ Example values
- ✅ Try it out functionality
- ✅ Response preview

---

## 📚 CATEGORIES CÓ SẴN

- `transcription` - Chuyển audio/video thành text
- `data-entry` - Nhập liệu
- `translation` - Dịch thuật
- `categorization` - Phân loại dữ liệu
- `research` - Nghiên cứu
- `moderation` - Kiểm duyệt nội dung
- `customer-support` - Hỗ trợ khách hàng

---

## 💡 TIPS

### Caching
- Task discovery results được cache 5 phút
- Stats được cache 1 phút
- Dùng `/api/stats/cache/clear` để xóa cache khi dev

### Pagination
- Default: page=1, limit=20
- Max limit: 100
- Total pages = ceil(total / limit)

### Filtering
- Có thể combine nhiều filters cùng lúc
- minReward và maxReward có thể dùng riêng lẻ
- sortBy và order luôn đi cùng nhau

### Performance
- Redis cache giảm load database
- Prisma ORM optimize queries
- Fastify async/await nhanh

---

**Xem chi tiết tại Swagger UI:** http://localhost:3000/api-docs

