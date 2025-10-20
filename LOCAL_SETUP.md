# 🏠 Cấu Hình Chạy Localhost (Không Cần AWS)

## ✅ Tất Cả Chạy Trên Localhost!

### Bước 1: Cài Đặt PostgreSQL và Redis

#### Dùng Docker (Nhanh Nhất) ⭐

```bash
# PostgreSQL
docker run --name paytask-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=paytask -p 5432:5432 -d postgres:14

# Redis
docker run --name paytask-redis -p 6379:6379 -d redis:6-alpine
```

### Bước 2: Tạo File .env

Tạo file `.env` trong thư mục `paytask-backend-worker`:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/paytask?schema=public"

# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AWS (TẮT - dùng local storage)
AWS_ENABLED=false

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Cache
CACHE_TTL=300
```

### Bước 3: Chạy Migration và Seed Data

```bash
# Generate Prisma Client
npm run prisma:generate

# Chạy migrations
npm run prisma:migrate

# Thêm dữ liệu mẫu (8 tasks)
npm run prisma:seed
```

### Bước 4: Khởi Động Server

```bash
npm run dev
```

Server sẽ chạy tại: **http://localhost:3000**

---

## 🎯 Test API Trên Swagger

### Mở Swagger UI:
👉 **http://localhost:3000/api-docs**

### Các API Có Thể Test:

#### 1. **GET /api/tasks/discover** - Tìm kiếm tasks
- Không cần parameters → Lấy tất cả tasks
- `category=transcription` → Lọc theo category
- `minReward=20&maxReward=50` → Lọc theo giá
- `sortBy=reward&order=desc` → Sắp xếp theo reward giảm dần
- `page=1&limit=10` → Phân trang

#### 2. **GET /api/tasks/:taskId** - Xem chi tiết task
- Thay `:taskId` bằng ID task từ danh sách

#### 3. **GET /api/stats/tasks** - Thống kê tasks
- Xem tổng số tasks, phân bố theo category, status

#### 4. **GET /api/stats/categories** - Danh sách categories
- Lấy tất cả categories có trong hệ thống

#### 5. **POST /api/stats/cache/clear** - Xóa cache
- Clear Redis cache cho statistics

#### 6. **GET /health** - Health check
- Kiểm tra trạng thái database và Redis

---

## 📸 Cách Test Trên Swagger

### Bước 1: Mở Swagger
```
http://localhost:3000/api-docs
```

### Bước 2: Chọn Endpoint
- Click vào endpoint muốn test (ví dụ: `GET /api/tasks/discover`)

### Bước 3: Click "Try it out"
- Button màu xanh ở góc phải

### Bước 4: Điền Parameters (nếu có)
- Ví dụ: `category = transcription`
- `minReward = 10`
- `sortBy = reward`

### Bước 5: Click "Execute"
- Swagger sẽ gọi API và hiển thị kết quả

### Bước 6: Xem Response
- Xem status code (200 = thành công)
- Xem response body (dữ liệu JSON)

---

## 🧪 Các Test Case Mẫu

### Test 1: Lấy Tất Cả Tasks
```
GET /api/tasks/discover
```
Kết quả: 8 tasks mẫu

### Test 2: Lọc Theo Category
```
GET /api/tasks/discover?category=transcription
```
Kết quả: Chỉ tasks về transcription

### Test 3: Lọc Theo Giá
```
GET /api/tasks/discover?minReward=30
```
Kết quả: Tasks có reward >= $30

### Test 4: Sắp Xếp Theo Reward
```
GET /api/tasks/discover?sortBy=reward&order=desc
```
Kết quả: Tasks từ reward cao đến thấp

### Test 5: Phân Trang
```
GET /api/tasks/discover?page=1&limit=3
```
Kết quả: 3 tasks đầu tiên

### Test 6: Xem Thống Kê
```
GET /api/stats/tasks
```
Kết quả: Tổng quan về tasks trong hệ thống

### Test 7: Lấy Danh Sách Categories
```
GET /api/stats/categories
```
Kết quả: Array các categories

---

## 📊 Dữ Liệu Mẫu Sau Khi Seed

**8 Tasks với các categories:**
- `transcription` (2 tasks): $15.50, $45.00
- `data-entry` (1 task): $25.00
- `translation` (1 task): $30.00
- `categorization` (1 task): $20.00
- `research` (1 task): $40.00
- `moderation` (1 task): $35.00
- `customer-support` (1 task): $28.00

**Tất cả tasks đều:**
- ✅ Status: `open`
- ✅ Escrow status: `held`
- ✅ Có thể discover được

---

## 🔧 Troubleshooting

### Lỗi: Cannot connect to database
```bash
# Kiểm tra PostgreSQL đang chạy
docker ps

# Hoặc khởi động lại
docker start paytask-postgres
```

### Lỗi: Cannot connect to Redis
```bash
# Kiểm tra Redis đang chạy
docker ps

# Hoặc khởi động lại
docker start paytask-redis
```

### Lỗi: Port 3000 already in use
Đổi PORT trong file `.env`:
```env
PORT=3001
```

### Lỗi: Prisma Client not generated
```bash
npm run prisma:generate
```

### Lỗi: pino-pretty not found
```bash
npm install pino-pretty --save-dev
```

---

## 📁 File Storage (Thay Thế AWS S3)

- Files sẽ được lưu trong thư mục `uploads/`
- Tự động tạo khi có file upload
- Không cần cấu hình AWS
- Để enable AWS sau này, set `AWS_ENABLED=true` trong `.env`

---

## 🎉 Hoàn Thành!

Giờ bạn có thể:
1. ✅ Test tất cả APIs trên Swagger
2. ✅ Xem dữ liệu trong Prisma Studio: `npm run prisma:studio`
3. ✅ Không cần AWS, chạy hoàn toàn localhost
4. ✅ File upload lưu local trong thư mục `uploads/`

---

## 🚀 Commands Hữu Ích

```bash
# Development
npm run dev                 # Chạy server với hot reload
npm run build              # Build production
npm start                  # Chạy production

# Database
npm run prisma:studio      # Mở giao diện xem database
npm run prisma:migrate     # Chạy migrations
npm run prisma:seed        # Reset và seed lại data
npm run prisma:reset       # Reset toàn bộ database

# Code
npm run lint              # Check lỗi code
npm run format            # Format code
```

---

## 📞 Các URLs Quan Trọng

- **API Root**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **Prisma Studio**: Chạy `npm run prisma:studio` → http://localhost:5555

Chúc bạn code vui vẻ! 🎉

