# 📖 Hướng Dẫn Test API Với Swagger

## 🚀 Mở Swagger UI

1. Khởi động server: `npm run dev`
2. Mở trình duyệt: **http://localhost:3000/api-docs**

---

## 📚 Danh Sách APIs Có Thể Test

### 🏷️ **Tasks** - Quản lý công việc

#### 1. `GET /api/tasks/discover` - Tìm kiếm tasks
**Mô tả:** Lấy danh sách tasks có thể làm với filter và pagination

**Parameters:**
- `category` (string, optional): Lọc theo category
- `minReward` (number, optional): Reward tối thiểu
- `maxReward` (number, optional): Reward tối đa
- `sortBy` (string, optional): Sắp xếp theo (createdAt, reward, deadline)
- `order` (string, optional): Thứ tự (asc, desc)
- `page` (number, optional): Trang số (mặc định: 1)
- `limit` (number, optional): Số items/trang (mặc định: 20)

**Test Cases:**
```
1. Lấy tất cả: Không điền gì, click Execute
2. Lọc category: category = transcription
3. Lọc giá: minReward = 20, maxReward = 50
4. Sắp xếp: sortBy = reward, order = desc
5. Phân trang: page = 1, limit = 3
```

**Response mẫu:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "title": "Transcribe 10-minute audio file",
        "description": "Clear English audio...",
        "category": "transcription",
        "reward": "15.50",
        "deadline": "2025-10-25T10:00:00Z",
        "client": {
          "id": "uuid",
          "country": "UK"
        },
        "escrow": {
          "amount": "17.05",
          "status": "held"
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

#### 2. `GET /api/tasks/{taskId}` - Xem chi tiết task
**Mô tả:** Lấy thông tin chi tiết của 1 task

**Parameters:**
- `taskId` (string, required): UUID của task

**Cách test:**
1. Gọi `/api/tasks/discover` trước để lấy danh sách
2. Copy một `id` từ response
3. Paste vào taskId parameter
4. Click Execute

**Response mẫu:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Task title",
    "description": "Full description...",
    "category": "transcription",
    "reward": "15.50",
    "client": {
      "id": "uuid",
      "email": "client@example.com",
      "country": "UK"
    },
    "escrow": {
      "amount": "17.05",
      "status": "held",
      "txHashHold": "0x..."
    },
    "assignments": []
  }
}
```

---

### 📊 **Statistics** - Thống kê

#### 3. `GET /api/stats/tasks` - Thống kê tasks
**Mô tả:** Xem tổng quan về tasks trong hệ thống

**Parameters:** Không có

**Cách test:**
1. Click vào endpoint
2. Click "Try it out"
3. Click "Execute"

**Response mẫu:**
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
        { "category": "translation", "count": 1 }
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

#### 4. `GET /api/stats/categories` - Danh sách categories
**Mô tả:** Lấy tất cả categories có trong hệ thống

**Parameters:** Không có

**Response mẫu:**
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

#### 5. `POST /api/stats/cache/clear` - Xóa cache
**Mô tả:** Clear Redis cache cho statistics (dùng khi dev)

**Parameters:** Không có

**Cách test:**
1. Click "Try it out"
2. Click "Execute"

**Response mẫu:**
```json
{
  "success": true,
  "message": "Statistics cache cleared successfully"
}
```

---

### 💚 **Health** - Kiểm tra hệ thống

#### 6. `GET /health` - Health check
**Mô tả:** Kiểm tra trạng thái database và Redis

**Parameters:** Không có

**Response mẫu:**
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

---

## 🎯 Các Kịch Bản Test Thực Tế

### Kịch Bản 1: Worker tìm việc theo category
```
1. Mở /api/stats/categories để xem có những category gì
2. Chọn 1 category (ví dụ: transcription)
3. Gọi /api/tasks/discover?category=transcription
4. Xem danh sách tasks về transcription
```

### Kịch Bản 2: Worker tìm việc theo mức lương
```
1. Gọi /api/tasks/discover?minReward=30&sortBy=reward&order=desc
2. Xem các tasks có reward >= $30, sắp xếp từ cao xuống thấp
```

### Kịch Bản 3: Xem chi tiết task trước khi nhận
```
1. Gọi /api/tasks/discover để lấy danh sách
2. Copy ID của task muốn xem
3. Gọi /api/tasks/{taskId} để xem chi tiết
4. Kiểm tra deadline, escrow, client info
```

### Kịch Bản 4: Admin xem thống kê
```
1. Gọi /api/stats/tasks để xem tổng quan
2. Xem số lượng tasks theo category
3. Xem số lượng assignments đã hoàn thành
```

---

## 🎨 Các Tính Năng Swagger

### 1. Try it out
- Click button "Try it out" để enable form nhập liệu
- Điền parameters vào form
- Click "Execute" để gọi API

### 2. Response Preview
- Xem status code (200, 400, 404, 500)
- Xem response body (JSON)
- Xem response headers
- Xem request URL

### 3. Schema
- Xem cấu trúc request/response
- Biết được field nào required/optional
- Xem type của từng field

### 4. Examples
- Mỗi endpoint có example values
- Click "Example Value" để xem response mẫu

### 5. Models
- Scroll xuống dưới cùng
- Xem các Models/Schemas
- Hiểu cấu trúc data

---

## 🔍 Debug & Troubleshooting

### Response 404 Not Found
- Kiểm tra URL có đúng không
- Kiểm tra taskId có tồn tại không (dùng discover trước)

### Response 400 Bad Request
- Kiểm tra parameters có đúng type không
- minReward, maxReward phải là số
- page, limit phải là số nguyên

### Response 500 Internal Server Error
- Kiểm tra PostgreSQL có chạy không: `docker ps`
- Kiểm tra Redis có chạy không: `docker ps`
- Xem logs trong terminal

### Response trống (data: [])
- Có thể chưa có data trong database
- Chạy lại seed: `npm run prisma:seed`
- Hoặc filter quá strict, không có task nào match

---

## 💡 Tips & Tricks

### 1. Persistence
- Swagger sẽ nhớ parameters bạn đã nhập
- Refresh page vẫn giữ nguyên

### 2. Copy as cURL
- Click vào request URL
- Copy để dùng với curl hoặc Postman

### 3. Test nhanh với default values
- Mỗi parameter có default value
- Không cần điền gì, click Execute luôn

### 4. Xem Response Schema
- Hiểu được API sẽ trả về gì
- Plan code frontend dễ hơn

### 5. Filter Examples
```
# Transcription tasks, reward cao
category=transcription&sortBy=reward&order=desc

# Tasks gấp (deadline gần)
sortBy=deadline&order=asc

# Tasks phù hợp budget
minReward=10&maxReward=30

# Pagination
page=1&limit=5
```

---

## 📱 Test Với Các Tool Khác

### cURL
```bash
# Basic
curl "http://localhost:3000/api/tasks/discover"

# With parameters
curl "http://localhost:3000/api/tasks/discover?category=transcription&minReward=10"

# Stats
curl "http://localhost:3000/api/stats/tasks"
```

### Postman
1. Import từ Swagger: http://localhost:3000/api-docs.json
2. Hoặc tạo request mới với URL từ Swagger

### VS Code REST Client
Dùng file `test-api.http` đã có sẵn

---

## 🎉 Kết Luận

Swagger UI giúp bạn:
- ✅ Test API không cần viết code
- ✅ Xem documentation rõ ràng
- ✅ Hiểu request/response format
- ✅ Debug nhanh chóng
- ✅ Share API với team

**Chúc bạn test vui vẻ!** 🚀

