# 🚀 HƯỚNG DẪN CHẠY API - LOCALHOST

## ✅ ĐÃ HOÀN THÀNH

✅ **Backend Fastify** với TypeScript  
✅ **Swagger UI** đầy đủ để test API  
✅ **Chạy hoàn toàn localhost** - KHÔNG CẦN AWS  
✅ **PostgreSQL + Redis** cache  
✅ **8 sample tasks** để test  

---

## 📋 CÁC API CÓ SẴN TEST TRÊN SWAGGER

### 1. **Tasks APIs** 🎯

#### `GET /api/tasks/all` - Lấy TẤT CẢ tasks
```
✅ Hiển thị tất cả tasks trong hệ thống
✅ Không có filter
✅ Bao gồm client email
✅ Có Redis cache (2 phút)
```

#### `GET /api/tasks/discover` - Tìm kiếm tasks
```
✅ Lọc theo category (transcription, data-entry, etc)
✅ Lọc theo giá (minReward, maxReward)
✅ Sắp xếp (sortBy: createdAt, reward, deadline)
✅ Phân trang (page, limit)
✅ Có Redis cache
```

#### `GET /api/tasks/:taskId` - Xem chi tiết 1 task
```
✅ Xem full info task
✅ Xem client info
✅ Xem escrow status
✅ Xem assignments
```

### 2. **Statistics APIs** 📊

#### `GET /api/stats/tasks` - Thống kê tổng quan
```
✅ Tổng số tasks
✅ Số tasks theo category
✅ Số tasks theo status
✅ Số assignments đã hoàn thành
```

#### `GET /api/stats/categories` - Danh sách categories
```
✅ Lấy tất cả categories trong hệ thống
```

#### `POST /api/stats/cache/clear` - Xóa cache
```
✅ Clear Redis cache (dùng khi dev)
```

### 3. **Health Check** 💚

#### `GET /health` - Kiểm tra hệ thống
```
✅ Check database connection
✅ Check Redis connection
✅ Xem uptime
```

---

## 🏃 CHẠY NGAY (3 BƯỚC)

### Bước 1: Start Database

```bash
# PostgreSQL
docker run --name paytask-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=paytask -p 5432:5432 -d postgres:14

# Redis  
docker run --name paytask-redis -p 6379:6379 -d redis:6-alpine
```

### Bước 2: Tạo file .env

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/paytask?schema=public"
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
REDIS_HOST=localhost
REDIS_PORT=6379
AWS_ENABLED=false
```

### Bước 3: Chạy

```bash
npm run prisma:migrate    # Setup database
npm run prisma:seed       # Thêm 8 tasks mẫu
npm run dev              # Chạy server 🎉
```

---

## 🎯 MỞ SWAGGER VÀ TEST

### 1. Mở Swagger UI
```
http://localhost:3000/api-docs
```

### 2. Test API đầu tiên - Lấy tất cả tasks

**Bước 1:** Click vào `GET /api/tasks/discover`  
**Bước 2:** Click nút **"Try it out"** (màu xanh)  
**Bước 3:** Click **"Execute"**  
**Bước 4:** Xem kết quả → Sẽ thấy 8 tasks mẫu

### 3. Test với filter

**Lọc theo category:**
- Mở `GET /api/tasks/discover`
- Click "Try it out"
- Điền `category` = `transcription`
- Click "Execute"
- Kết quả: Chỉ tasks về transcription

**Lọc theo giá:**
- `minReward` = `20`
- `maxReward` = `50`
- Click "Execute"
- Kết quả: Tasks có reward từ $20-$50

**Sắp xếp:**
- `sortBy` = `reward`
- `order` = `desc`
- Click "Execute"  
- Kết quả: Tasks từ reward cao → thấp

### 4. Xem thống kê

**Bước 1:** Click vào `GET /api/stats/tasks`  
**Bước 2:** Click "Try it out"  
**Bước 3:** Click "Execute"  
**Kết quả:** Xem tổng quan tasks theo category, status

---

## 📊 DỮ LIỆU MẪU SAU KHI SEED

```
8 Tasks với các category:
├─ transcription (2 tasks): $15.50, $45.00
├─ data-entry (1 task): $25.00
├─ translation (1 task): $30.00
├─ categorization (1 task): $20.00
├─ research (1 task): $40.00
├─ moderation (1 task): $35.00
└─ customer-support (1 task): $28.00

Tất cả đều:
✅ Status: open
✅ Escrow: held
✅ Có thể discover
```

---

## 🎨 CÁC CÁCH TEST API

### Cách 1: Swagger UI (Khuyến nghị ⭐)
```
http://localhost:3000/api-docs
→ Click endpoint
→ Try it out
→ Execute
```

### Cách 2: cURL
```bash
curl "http://localhost:3000/api/tasks/discover"
curl "http://localhost:3000/api/tasks/discover?category=transcription"
curl "http://localhost:3000/api/stats/tasks"
```

### Cách 3: VS Code REST Client
```
Mở file: test-api.http
→ Click "Send Request" ở mỗi endpoint
```

### Cách 4: Postman
```
Import từ: http://localhost:3000/api-docs.json
```

---

## 🔥 TEST CASES MẪU

### Test Case 1: Worker tìm việc transcription
```
1. GET /api/tasks/discover?category=transcription
2. Kết quả: 2 tasks về transcription
```

### Test Case 2: Tìm việc lương cao
```
1. GET /api/tasks/discover?minReward=40&sortBy=reward&order=desc
2. Kết quả: Tasks có reward >= $40, cao → thấp
```

### Test Case 3: Xem chi tiết task
```
1. GET /api/tasks/discover (lấy danh sách)
2. Copy ID của 1 task
3. GET /api/tasks/{taskId}
4. Kết quả: Chi tiết task đó
```

### Test Case 4: Xem categories có sẵn
```
1. GET /api/stats/categories
2. Kết quả: Array [transcription, data-entry, ...]
```

### Test Case 5: Phân trang
```
1. GET /api/tasks/discover?page=1&limit=3
2. Kết quả: 3 tasks đầu tiên
3. GET /api/tasks/discover?page=2&limit=3
4. Kết quả: 3 tasks tiếp theo
```

---

## 🛠️ COMMANDS HỮU ÍCH

```bash
# Development
npm run dev              # Chạy dev server (hot reload)
npm run build           # Build production
npm start               # Chạy production

# Database
npm run prisma:studio   # Mở UI xem database
npm run prisma:migrate  # Chạy migrations
npm run prisma:seed     # Thêm data mẫu lại
npm run prisma:reset    # Reset toàn bộ DB

# Docker
docker ps               # Xem containers đang chạy
docker start paytask-postgres    # Start PostgreSQL
docker start paytask-redis       # Start Redis
docker stop paytask-postgres     # Stop PostgreSQL
```

---

## 🔍 TROUBLESHOOTING

### Lỗi: Cannot connect database
```bash
# Check PostgreSQL
docker ps
# Nếu không chạy
docker start paytask-postgres
```

### Lỗi: Cannot connect Redis
```bash
# Check Redis
docker ps
# Nếu không chạy
docker start paytask-redis
```

### Lỗi: Port 3000 đã dùng
```bash
# Đổi PORT trong .env
PORT=3001
```

### Response data = []
```bash
# Chạy lại seed
npm run prisma:seed
```

### Prisma Client error
```bash
npm run prisma:generate
```

---

## 📱 CÁC URL QUAN TRỌNG

| Service | URL |
|---------|-----|
| **Swagger UI** | http://localhost:3000/api-docs |
| **API Root** | http://localhost:3000 |
| **Health Check** | http://localhost:3000/health |
| **Task Discovery** | http://localhost:3000/api/tasks/discover |
| **Stats** | http://localhost:3000/api/stats/tasks |
| **Prisma Studio** | http://localhost:5555 (sau khi chạy `npm run prisma:studio`) |

---

## ✅ CHECKLIST

- [ ] PostgreSQL đang chạy (`docker ps`)
- [ ] Redis đang chạy (`docker ps`)
- [ ] File `.env` đã tạo
- [ ] Đã chạy `npm run prisma:migrate`
- [ ] Đã chạy `npm run prisma:seed`
- [ ] Server đang chạy (`npm run dev`)
- [ ] Mở được Swagger: http://localhost:3000/api-docs
- [ ] Test được endpoint `/api/tasks/discover`

---

## 🎉 HOÀN THÀNH!

Bây giờ bạn có:
✅ Fastify backend với Swagger đầy đủ  
✅ 6 APIs test được ngay  
✅ Chạy hoàn toàn localhost  
✅ Không cần AWS  
✅ File upload lưu local (thư mục `uploads/`)  
✅ Redis cache tăng performance  
✅ 8 tasks mẫu để test  

**MỞ SWAGGER VÀ BẮT ĐẦU TEST NGAY!** 🚀

```
http://localhost:3000/api-docs
```

---

## 📚 TÀI LIỆU KHÁC

- `SWAGGER_GUIDE.md` - Hướng dẫn chi tiết test Swagger
- `LOCAL_SETUP.md` - Setup localhost đầy đủ
- `README.md` - API documentation (English)
- `test-api.http` - Test file cho VS Code

**Chúc bạn code vui vẻ!** 🎊

