# 🔧 Fix: API /api/tasks/{taskId} Trả Về Rỗng

## 🎯 NGUYÊN NHÂN & GIẢI PHÁP

### Nguyên nhân 1: Chưa có data trong database ⭐ (Phổ biến nhất)

**Kiểm tra:**
```bash
# Chạy seed để tạo data mẫu
npm run prisma:seed
```

**Output sẽ hiện:**
```
✅ Created task: Transcribe 10-minute audio file
✅ Created task: Data entry from scanned documents
...
🎉 Seeding completed successfully!
```

---

### Nguyên nhân 2: ID không đúng

**Cách lấy ID đúng:**

#### Bước 1: Gọi API lấy danh sách
```bash
# Swagger UI
GET /api/tasks/all
hoặc
GET /api/tasks/discover

# hoặc cURL
curl http://localhost:3000/api/tasks/all
```

#### Bước 2: Copy ID từ response
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",  ← COPY CÁI NÀY
      "title": "Transcribe 10-minute audio file",
      ...
    }
  ]
}
```

#### Bước 3: Test với ID đó
```bash
GET /api/tasks/550e8400-e29b-41d4-a716-446655440010
```

---

### Nguyên nhân 3: Database chưa chạy

**Kiểm tra:**
```bash
# Check PostgreSQL đang chạy
docker ps

# Nếu không thấy, start lại
docker start paytask-postgres
```

---

## 🚀 HƯỚNG DẪN CHI TIẾT TEST TRÊN SWAGGER

### Bước 1: Chạy seed (nếu chưa chạy)
```bash
npm run prisma:seed
```

### Bước 2: Mở Swagger
```
http://localhost:3000/api-docs
```

### Bước 3: Lấy ID từ /api/tasks/all

1. Tìm endpoint **GET /api/tasks/all**
2. Click **"Try it out"**
3. Click **"Execute"**
4. Xem response, **COPY một ID** (ví dụ: `550e8400-e29b-41d4-a716-446655440010`)

### Bước 4: Test /api/tasks/{taskId}

1. Scroll xuống tìm **GET /api/tasks/{taskId}**
2. Click **"Try it out"**
3. **Paste ID** vào ô `taskId`
4. Click **"Execute"**
5. Xem response - bây giờ sẽ có data!

---

## 📝 SAMPLE IDs SAU KHI SEED

Sau khi chạy `npm run prisma:seed`, bạn sẽ có các IDs này:

```
550e8400-e29b-41d4-a716-446655440010  // Transcription 1
550e8400-e29b-41d4-a716-446655440011  // Data entry
550e8400-e29b-41d4-a716-446655440012  // Translation
550e8400-e29b-41d4-a716-446655440013  // Categorization
550e8400-e29b-41d4-a716-446655440014  // Research
550e8400-e29b-41d4-a716-446655440015  // Transcription 2
550e8400-e29b-41d4-a716-446655440016  // Moderation
550e8400-e29b-41d4-a716-446655440017  // Customer support
```

**Test với ID này:**
```
GET /api/tasks/550e8400-e29b-41d4-a716-446655440010
```

---

## 🧪 TEST NHANH

### Với cURL:

```bash
# 1. Lấy danh sách
curl http://localhost:3000/api/tasks/all | jq '.[0].id'

# 2. Test với ID cụ thể
curl http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440010
```

### Với Swagger:

```
1. GET /api/tasks/all → Copy ID
2. GET /api/tasks/{taskId} → Paste ID → Execute
```

---

## 🔍 XEM DATA TRONG DATABASE

### Option 1: Prisma Studio (UI đẹp)
```bash
npm run prisma:studio
```
Mở: http://localhost:5555

### Option 2: psql (Terminal)
```bash
# Connect vào database
docker exec -it paytask-postgres psql -U postgres -d paytask

# Query tasks
SELECT id, title FROM tasks;

# Exit
\q
```

---

## ✅ CHECKLIST DEBUG

- [ ] PostgreSQL đang chạy: `docker ps`
- [ ] Redis đang chạy: `docker ps`
- [ ] Đã chạy migrations: `npm run prisma:migrate`
- [ ] Đã chạy seed: `npm run prisma:seed`
- [ ] Server đang chạy: `npm run dev`
- [ ] Dùng đúng ID từ database

---

## 🎯 RESPONSE MẪU (KHI ĐÚNG)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "clientId": "550e8400-e29b-41d4-a716-446655440002",
    "title": "Transcribe 10-minute audio file",
    "description": "Clear English audio transcription needed...",
    "category": "transcription",
    "reward": "15.50",
    "qty": 1,
    "budget": "17.05",
    "deadline": "2025-10-25T10:00:00.000Z",
    "status": "open",
    "createdAt": "2025-10-18T10:00:00.000Z",
    "client": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "email": "client@example.com",
      "country": "UK"
    },
    "escrow": {
      "id": "escrow-uuid",
      "taskId": "550e8400-e29b-41d4-a716-446655440010",
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

---

## 🎬 VIDEO TUTORIAL (Steps)

### 1. Seed Database
```bash
cd paytask-backend-worker
npm run prisma:seed
```
**Đợi thấy:** ✅ Seeding completed successfully!

### 2. Start Server
```bash
npm run dev
```
**Đợi thấy:** ✅ Server running on http://0.0.0.0:3000

### 3. Open Swagger
```
http://localhost:3000/api-docs
```

### 4. Get an ID
- Open: **GET /api/tasks/all**
- Click: **Try it out** → **Execute**
- Copy: Một ID từ response

### 5. Test with ID
- Open: **GET /api/tasks/{taskId}**
- Paste: ID vào ô `taskId`
- Click: **Execute**
- Result: ✅ Full task details!

---

## 🆘 NẾU VẪN LỖI

### Lỗi: "Task not found"
```bash
# Reset và seed lại
npm run prisma:reset
# Confirm với 'y'
npm run prisma:seed
```

### Lỗi: Database connection
```bash
# Restart PostgreSQL
docker restart paytask-postgres
```

### Lỗi: Server không chạy
```bash
# Check port
netstat -an | findstr "3000"

# Kill process nếu bị treo
# Rồi start lại
npm run dev
```

---

## 💡 TIP: Dùng Prisma Studio

**Cách dễ nhất xem data:**

```bash
npm run prisma:studio
```

Mở: http://localhost:5555

- Click **"tasks"** table
- Xem tất cả tasks
- Copy ID bất kỳ
- Dùng ID đó test API

---

## 🎉 TÓM TẮT

**3 bước fix nhanh:**

```bash
# 1. Seed data
npm run prisma:seed

# 2. Lấy ID
curl http://localhost:3000/api/tasks/all | jq '.[0].id'

# 3. Test với ID đó
curl http://localhost:3000/api/tasks/YOUR_ID_HERE
```

**Hoặc dùng Swagger:**
1. GET /api/tasks/all → Copy ID
2. GET /api/tasks/{taskId} → Paste ID → Execute

**DONE!** ✅

