# 🚀 PayTask - Bắt Đầu Nhanh

Marketplace phi tập trung cho việc giao và nhận công việc, thanh toán tức thì bằng USDC.

---

## � Bạn muốn làm gì?

- 🎯 [**Tôi muốn giao việc** (Client)](#-dành-cho-client---người-giao-việc)
- 💼 [**Tôi muốn nhận việc** (Worker)](#-dành-cho-worker---người-nhận-việc)
- 🛠️ [**Tôi là developer** (Setup)](#️-dành-cho-developer---setup-hệ-thống)
- ❓ [**Gặp vấn đề?** (FAQ)](#-gặp-vấn-đề)

---

## 🎯 Dành Cho Client - Người Giao Việc

> **Mục tiêu:** Đăng task → Đợi worker làm → Kiểm tra → Thanh toán USDC

### ⚡ Quy Trình 5 Bước

```
1. Đăng nhập    2. Tạo task    3. Đợi worker    4. Kiểm tra    5. Thanh toán
   ↓               ↓              submit          kết quả       💰 USDC
  Login         Publish           ↓                ↓            tự động
                                Notification    Accept/Reject
```

---

### Bước 1: Đăng Nhập

**🌐 Qua Website** (Dễ nhất)

Mở <http://localhost:3001>, click "Login", nhập:

- Email: `client1@paytask.com`
- Password: `password123`

**📮 Qua Postman**

Request: `Auth → POST Login`

```json
{
  "email": "client1@paytask.com",
  "password": "password123"
}
```

---

### Bước 2: Tạo Task

**🌐 Qua Website**

1. Click nút **"Create Task"**
2. Điền form:
   - Title: "Nhập liệu 100 sản phẩm"
   - Description: Mô tả công việc chi tiết
   - Category: "Data Entry"
   - Reward: `50` (USDC)
   - Quantity: `1`
   - Deadline: Chọn ngày
3. Click **"Create"** → Task ở trạng thái `draft`
4. Click **"Publish Task"** → Chuyển sang `open`
5. ✅ Worker bắt đầu thấy task của bạn!

**📮 Qua Postman**

Request 1: `Tasks → POST Create Task`

```json
{
  "title": "Nhập liệu 100 sản phẩm",
  "description": "Nhập dữ liệu từ file Excel",
  "category": "Data Entry",
  "reward": 50,
  "qty": 1,
  "deadline": "2025-12-31T23:59:59Z"
}
```

Request 2: `Tasks → POST Publish Task`

- Params: `taskId` từ response ở trên

---

### Bước 3: Đợi Worker Submit

**Worker sẽ:**

1. Tìm thấy task của bạn
2. Click "Accept" → Bắt đầu làm
3. Upload file kết quả
4. Click "Submit" → Bạn nhận notification 🔔

**Bạn nhận được:**

- 🔔 Notification: "New submission from Diana"
- 📧 Email alert (nếu bật)

---

### Bước 4: Review & Accept

**🌐 Qua Website**

1. Click vào notification
2. Xem submission details:
   - 📥 **Download** file để kiểm tra
   - ✅ **QA Checks**: Auto-validate
   - 👤 **Worker info**: Rating, reputation
3. Quyết định:
   - ✅ **Accept & Pay** → Thanh toán ngay
   - ❌ **Reject** → Yêu cầu làm lại

**Nếu Accept:**

Hệ thống tự động:

- 💰 Chuyển `50 USDC` từ settlement → worker wallet
- ✅ Update status: `submitted` → `accepted`
- 🏆 Update task: `active` → `completed`
- 🔔 Gửi notification cho worker kèm payment signature

**📮 Qua Postman**

Request: `Reviews → POST Accept Submission`

```json
{
  "submissionId": "<SUBMISSION_ID>",
  "feedback": "Perfect! Thank you!"
}
```

---

### Bước 5: Rate Worker (Optional)

Đánh giá worker để giúp cộng đồng:

- ⭐ Rating: 1-5 sao
- 💬 Comment: Feedback chi tiết

---

## 💼 Dành Cho Worker - Người Nhận Việc

> **Mục tiêu:** Tìm task → Accept → Làm việc → Submit → Nhận USDC

### ⚡ Quy Trình 5 Bước

```
1. Tìm task    2. Accept    3. Upload    4. Submit    5. Nhận tiền
   ↓              ↓           file          ↓           💰 USDC
 Discover      Assigned       ↓         Waiting        tự động
   ↓              ↓           Done       Review       vào wallet
  Filter       Start work
```

---

### Bước 1: Đăng Nhập

**🌐 Qua Website**

Mở <http://localhost:3001>, click "Login", nhập:

- Email: `worker1@paytask.com`
- Password: `password123`

---

### Bước 2: Tìm Task

**🌐 Qua Website**

1. Click **"Discover Tasks"**
2. Dùng filter:
   - 📂 Category: Data Entry, Surveys...
   - 💰 Min Reward: 10 USDC
   - 📅 Deadline: Còn thời gian
3. Click vào task → Xem details:
   - 📋 Requirements
   - 💵 Reward amount
   - ⏰ Deadline
   - 👤 Client info

**📮 Qua Postman**

Request: `Tasks → GET Discover Tasks`

Query params:

- `category=Data Entry`
- `minReward=10`
- `limit=20`

---

### Bước 3: Accept Task

**🌐 Qua Website**

1. Ở trang task detail
2. Click **"Accept Task"**
3. Confirm → Chuyển đến task flow page
4. ✅ Bắt đầu làm việc!

**📮 Qua Postman**

Request: `Assignments → POST Accept Assignment`

```json
{
  "taskId": "<TASK_ID>",
  "workerId": "<YOUR_USER_ID>"
}
```

Lưu `assignmentId` từ response!

---

### Bước 4: Làm Việc & Upload

**🌐 Qua Website (Task Flow Page)**

1. 📖 Đọc kỹ instructions
2. 💻 Hoàn thành công việc
3. 📁 Chuẩn bị file (PDF, ZIP, DOC...)
4. Click **"Upload File"**
5. Chọn file → Đợi upload
6. ✅ File URL hiển thị

**📮 Qua Postman**

Request: `Submissions → POST Upload File`

- Body: **form-data**
- Key: `file`
- Value: Chọn file từ máy

---

### Bước 5: Submit & Nhận Tiền

**🌐 Submit Work**

1. Kiểm tra lại file URL
2. Click **"Submit Work"**
3. Confirm
4. ✅ Đợi client review

**💰 Nhận Tiền (Tự động)**

Khi client accept:

- 🔔 Notification: "Your submission accepted!"
- 💰 `50 USDC` → Wallet của bạn
- 📝 Payment signature (có thể verify trên Solana Explorer)

**Kiểm tra số dư:**

- Web: Click avatar → "My Wallet"
- Postman: `Users → GET My Profile` → xem `wallet.balance`

---

## 🛠️ Dành Cho Developer - Setup Hệ Thống

### Yêu Cầu

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- npm/yarn

### Cài Đặt

```bash
# 1. Clone repo
git clone https://github.com/PayTaskdz/PayTask.git
cd PayTask

# 2. Install backend
npm install

# 3. Setup database
cp .env.example .env
# Sửa .env với thông tin DB của bạn

npx prisma migrate dev
npx prisma db seed

# 4. Start backend
npm run dev
# ✅ Backend: http://localhost:3000

# 5. Install frontend (Terminal mới)
cd frontend/frontendpaytask
npm install

# 6. Start frontend
npm run dev
# ✅ Frontend: http://localhost:3001
```

### Kiểm Tra

Mở browser:

- Frontend: <http://localhost:3001>
- API Docs: <http://localhost:3000/api-docs>
- Health: <http://localhost:3000/health>

### Import Postman

1. Mở Postman
2. Import 2 files:
   - `PayTask-API-Fixed.postman_collection.json`
   - `PayTask-Development.postman_environment.json`
3. Chọn environment: "PayTask Development"
4. ✅ Sẵn sàng test!

### Tài Khoản Test

**Clients:**

- `client1@paytask.com` / `password123` (Alice)
- `client2@paytask.com` / `password123` (Bob)

**Workers:**

- `worker1@paytask.com` / `password123` (Diana - ⭐⭐⭐⭐)
- `worker2@paytask.com` / `password123` (Eve - ⭐⭐⭐)

---

## ❓ Gặp Vấn Đề?

### 🔴 "No token provided"

**Lý do:** Chưa đăng nhập

**Fix:**

1. Login lại
2. Check localStorage có `accessToken`
3. Postman: Check `{{authToken}}` variable

---

### 🔴 "Unauthorized"

**Lý do:** Không có quyền

**Fix:**

- Client chỉ accept/reject task của mình
- Worker chỉ submit assignment của mình
- Check đúng role

---

### 🔴 "Task not found"

**Lý do:** TaskId sai hoặc đã xóa

**Fix:**

1. Check lại taskId
2. `GET /api/tasks/:id` để verify
3. Dùng Discover để tìm task mới

---

### 🔴 "Assignment not found"

**Lý do:** Chưa accept task

**Fix:**

1. Accept task trước (`POST /api/assignments/accept`)
2. Lưu `assignmentId` từ response
3. Dùng assignmentId để submit

---

### 🔴 "Submission already exists"

**Lý do:** Đã submit rồi

**Fix:**

- Mỗi assignment chỉ submit 1 lần
- Đợi client reject → Submit lại

---

### 🔴 "Transaction timeout"

**Lý do:** Solana blockchain chậm

**Fix:**

- Đợi 10-15 giây
- Payment execute riêng, không timeout DB
- Check notification xem payment status

---

### 🔴 URL có double /api

**Lý do:** Frontend config sai

**Fix:**

File `.env.local`:

```bash
# ✅ ĐÚNG
NEXT_PUBLIC_API_URL=http://localhost:3000

# ❌ SAI
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

### 🔧 Reset Database

```bash
npx prisma migrate reset
npx ts-node prisma/seed.ts
```

---

### 🔧 View Database

```bash
npx prisma studio
# Mở http://localhost:5555
```

---

### 🔧 Clear Redis Cache

```bash
redis-cli
> FLUSHALL
```

---

## 📊 Hiểu Flow Hoàn Chỉnh

```ascii
┌─────────────────────────────────────────────────────────────┐
│                    PAYTASK WORKFLOW                         │
└─────────────────────────────────────────────────────────────┘

CLIENT                                              WORKER
  │                                                    │
  │ [1] Create Task (draft)                           │
  │                                                    │
  │ [2] Publish Task (open) ────────────────────────► │
  │                                                    │
  │                              [3] Discover Tasks   │
  │                                   ↓               │
  │                              [4] Accept Task      │
  │                              (in_progress)        │
  │                                   ↓               │
  │                              [5] Upload File      │
  │                                   ↓               │
  │ ◄──────────────────────────  [6] Submit Work     │
  │     Notification 🔔          (submitted)          │
  │                                                    │
  │ [7] Review Submission                             │
  │     - Download file                               │
  │     - Check quality                               │
  │                                                    │
  │ [8] Accept & Pay ────────────────────────────────► │
  │     💰 Transfer USDC                  Notification 🔔
  │     (accepted)                        💰 USDC received
  │                                                    │
  │ [9] Rate Worker                                   │
  │ ◄──────────────────────────────────────────────── │
  │                                  [10] Rate Client │
  │                                                    │
  ✅ Complete                                        ✅ Complete
```

**Status Flow:**

```
Task:       draft → open → active → completed
Assignment: in_progress → submitted → completed  
Submission: submitted → accepted/rejected
```

---

## 🎓 Tài Liệu Thêm

### 📖 Docs

- [COMPLETE_GUIDE.md](./COMPLETE_GUIDE.md) - Tài liệu đầy đủ
- [TASK_FLOW_INTEGRATION.md](./TASK_FLOW_INTEGRATION.md) - Task flow chi tiết
- [NOTIFICATION_API.md](./NOTIFICATION_API.md) - Notification system

### 🌐 Tools

- Swagger UI: <http://localhost:3000/api-docs>
- Postman Collection: Interactive testing
- Prisma Studio: <http://localhost:5555>

### 💡 Pro Tips

1. **Luôn check status** - Task/Assignment/Submission đều có status riêng
2. **Dùng Postman** - Pre-request scripts tự set token
3. **Theo dõi notifications** - Mọi action quan trọng đều có thông báo
4. **Check wallet balance** - `GET /api/users/me`
5. **Payment signature** - Verify trên Solana Explorer

---

## 🔐 Security

- ✅ JWT authentication
- ✅ CORS configured
- ✅ File validation
- ✅ Rate limiting
- ✅ Wallet encryption
- ✅ Transaction timeout protection

---

## 🚀 Sẵn Sàng Bắt Đầu?

1. **Client?** → [Quay lại hướng dẫn Client](#-dành-cho-client---người-giao-việc)
2. **Worker?** → [Quay lại hướng dẫn Worker](#-dành-cho-worker---người-nhận-việc)
3. **Developer?** → [Quay lại Setup](#️-dành-cho-developer---setup-hệ-thống)
4. **Cần help?** → support@paytask.com

---

**Happy PayTasking! 🎉**

*Last Updated: October 31, 2025*
