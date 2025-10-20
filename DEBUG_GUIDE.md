# 🔍 DEBUG API Response Rỗng

## 🚨 QUAN TRỌNG: RESTART SERVER

Bạn đã build xong, bây giờ **BẮT BUỘC phải restart server!**

### Bước 1: Stop Server
```bash
# Trong terminal đang chạy server
# Nhấn: Ctrl + C
```

### Bước 2: Start Server với logging
```bash
npm run dev
```

### Bước 3: Test API và xem logs
```bash
# Trong terminal mới hoặc Swagger
curl http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440010
```

---

## 📊 XEM LOGS ĐỂ DEBUG

Sau khi gọi API, trong terminal server bạn sẽ thấy logs:

```
[INFO] Fetching task with ID: 550e8400-e29b-41d4-a716-446655440010
[INFO] Task found: YES
[INFO] Task data: {"id":"...","title":"...
[INFO] Sending response with data length: 1234
```

### Nếu thấy "Task found: YES" nhưng vẫn rỗng:
→ Vấn đề ở serialization

### Nếu thấy "Task found: NO":
→ ID không đúng hoặc data không có trong DB

---

## 🔧 KIỂM TRA DATABASE

### Option 1: Prisma Studio
```bash
# Terminal mới
npm run prisma:studio
```
Mở: http://localhost:5555
- Click table "tasks"
- Xem có tasks không?
- Copy ID thật từ đây

### Option 2: Query trực tiếp
```bash
# Kiểm tra có bao nhiêu tasks
docker exec -it paytask-postgres psql -U postgres -d paytask -c "SELECT COUNT(*) FROM tasks;"

# Xem các IDs
docker exec -it paytask-postgres psql -U postgres -d paytask -c "SELECT id, title FROM tasks LIMIT 5;"
```

---

## ✅ CHECKLIST DEBUG

### 1. Server đã restart?
```bash
# Stop: Ctrl+C
# Start: npm run dev
```

### 2. Build đã chạy?
```bash
npm run build
# Phải thấy: ✓ compiled successfully
```

### 3. Database có data?
```bash
npm run prisma:studio
# Mở: http://localhost:5555
# Check table "tasks"
```

### 4. Dùng đúng ID?
```bash
# Lấy ID thật từ API
curl http://localhost:3000/api/tasks/all | jq '.[0].id'
```

---

## 🎯 TEST ĐẦY ĐỦ

### Test 1: Health Check
```bash
curl http://localhost:3000/health
```
**Expected:** Status 200, services connected

### Test 2: Get All Tasks
```bash
curl http://localhost:3000/api/tasks/all
```
**Expected:** Array với 8 tasks

### Test 3: Get Task by ID (từ all)
```bash
# Copy ID từ Test 2
curl http://localhost:3000/api/tasks/YOUR_ID_HERE
```
**Expected:** Full task details

---

## 🔍 DETAILED DEBUG STEPS

### Bước 1: Xác nhận server đang chạy code mới
```bash
# Terminal hiện tại (đang chạy server)
# Nhấn Ctrl+C để stop

# Xóa cache (optional)
rm -rf dist/

# Build lại
npm run build

# Chạy lại
npm run dev
```

### Bước 2: Test với Swagger và xem Network tab
1. Mở Chrome DevTools (F12)
2. Tab "Network"
3. Mở: http://localhost:3000/api-docs
4. Test: GET /api/tasks/{taskId}
5. Nhập: `550e8400-e29b-41d4-a716-446655440010`
6. Execute
7. Xem Response trong Network tab

### Bước 3: Xem Server Logs
Trong terminal server, tìm dòng:
```
[INFO] Task data: ...
```

Nếu có data trong log nhưng Swagger rỗng → Vấn đề Swagger UI  
Nếu không có data trong log → Vấn đề query database

---

## 💡 COMMON ISSUES

### Issue 1: Server chưa restart
**Fix:** Stop (Ctrl+C) và start lại (`npm run dev`)

### Issue 2: Dùng code cũ
**Fix:** 
```bash
rm -rf dist/
npm run build
npm run dev
```

### Issue 3: Database rỗng
**Fix:**
```bash
npm run prisma:seed
```

### Issue 4: ID không đúng format
**Fix:** Dùng ID từ `/api/tasks/all`
```bash
curl http://localhost:3000/api/tasks/all | jq '.data[0].id'
```

### Issue 5: Cache browser
**Fix:** 
- Mở Swagger trong Incognito
- Hoặc hard refresh (Ctrl+Shift+R)

---

## 🚀 QUICK FIX COMMAND

Chạy tất cả cùng lúc:
```bash
# Stop server (Ctrl+C trước)

# Clean, build, seed, start
rm -rf dist/ && npm run build && npm run prisma:seed && npm run dev
```

Sau đó test:
```bash
# Terminal mới
curl http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440010 | jq
```

---

## 📸 SCREENSHOT LOGS

**Logs bạn nên thấy:**
```
✅ Server running on http://0.0.0.0:3000
✅ PostgreSQL connected
✅ Redis connected
[INFO] Fetching task with ID: 550e8400-e29b-41d4-a716-446655440010
[INFO] Task found: YES
[INFO] Task data: {"id":"550e8400-e29b-41d4-a716-446655440010","clientId":"...
[INFO] Sending response with data length: 1234
[INFO] request completed (statusCode: 200)
```

**Nếu thấy logs trên mà vẫn rỗng:**
→ Chụp màn hình gửi tôi!

---

## 🆘 NẾU VẪN KHÔNG WORK

### 1. Kiểm tra response thực tế:
```bash
curl -v http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440010
```

### 2. Check Content-Type header:
```bash
curl -I http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440010
```

### 3. Test với Postman thay vì Swagger

### 4. Xem logs chi tiết:
```bash
# Start server với debug mode
DEBUG=* npm run dev
```

---

## 🎯 ACTION PLAN

**NGAY BÂY GIỜ:**

1. ⏹️ Stop server (Ctrl+C)
2. 🔨 Build: `npm run build`
3. 🌱 Seed: `npm run prisma:seed`
4. ▶️ Start: `npm run dev`
5. 🧪 Test: `curl http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440010`
6. 👀 XEM LOGS trong terminal server!

**Sau đó báo tôi logs bạn thấy!** 📝

