# Notification API Documentation

API đầy đủ cho hệ thống thông báo trong PayTask.

## 📋 Table of Contents
- [Backend Setup](#backend-setup)
- [API Endpoints](#api-endpoints)
- [Frontend Integration](#frontend-integration)
- [Helper Functions](#helper-functions)
- [Usage Examples](#usage-examples)

---

## 🔧 Backend Setup

### 1. Service Layer
File: `src/services/notification.service.ts`

Cung cấp các phương thức:
- `createNotification()` - Tạo notification mới
- `getUserNotifications()` - Lấy danh sách notifications với filter
- `getUnreadCount()` - Đếm số notification chưa đọc
- `markAsRead()` - Đánh dấu đã đọc
- `markAllAsRead()` - Đánh dấu tất cả đã đọc
- `deleteNotification()` - Xóa notification
- `deleteAllRead()` - Xóa tất cả đã đọc

**Helper functions** để tạo notifications cho các sự kiện cụ thể:
- `notifyTaskAssignment()` - Thông báo task được assign
- `notifyPayment()` - Thông báo thanh toán
- `notifySubmissionReview()` - Thông báo review submission
- `notifyDeadlineReminder()` - Thông báo deadline sắp đến
- `notifyNewTaskAvailable()` - Thông báo task mới

### 2. Routes Layer
File: `src/routes/notification.routes.ts`

Routes đã được đăng ký tại `/api/notifications`

### 3. Database Schema
```prisma
model Notification {
  id        String             @id @default(uuid())
  toUserId  String
  type      String
  content   String?
  status    NotificationStatus @default(pending)
  meta      Json?
  createdAt DateTime           @default(now())
  toUser    User               @relation(...)
}

enum NotificationStatus {
  pending
  sent
  read
}
```

---

## 🌐 API Endpoints

### 1. Get User Notifications
```
GET /api/notifications
```

**Query Parameters:**
- `status` (optional): 'pending' | 'sent' | 'read'
- `type` (optional): string - Filter by notification type
- `limit` (optional): number - Default: 50
- `offset` (optional): number - Default: 0

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "toUserId": "uuid",
      "type": "payment",
      "content": "You received $25.00...",
      "status": "pending",
      "meta": {
        "amount": 25,
        "taskTitle": "Menu Verification"
      },
      "createdAt": "2025-10-28T10:00:00Z",
      "toUser": {
        "id": "uuid",
        "username": "john_doe"
      }
    }
  ],
  "total": 10,
  "hasMore": false
}
```

### 2. Get Unread Count
```
GET /api/notifications/unread-count
```

**Response:**
```json
{
  "count": 5
}
```

### 3. Mark Notification as Read
```
PATCH /api/notifications/:id/read
```

**Response:**
```json
{
  "id": "uuid",
  "status": "read"
}
```

### 4. Mark All as Read
```
PATCH /api/notifications/read-all
```

**Response:**
```json
{
  "count": 5
}
```

### 5. Delete Notification
```
DELETE /api/notifications/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

### 6. Delete All Read Notifications
```
DELETE /api/notifications/read
```

**Response:**
```json
{
  "count": 3
}
```

### 7. Create Notification (Admin Only)
```
POST /api/notifications
```

**Body:**
```json
{
  "toUserId": "uuid",
  "type": "system",
  "content": "System maintenance scheduled...",
  "meta": {
    "priority": "high"
  }
}
```

---

## 💻 Frontend Integration

### 1. API Client
File: `frontend/frontendpaytask/src/api/notifications.ts`

```typescript
import { notificationsApi } from '@/api/notifications';

// Get notifications
const { notifications, total, hasMore } = await notificationsApi.getNotifications({
  status: 'pending',
  limit: 20
});

// Get unread count
const count = await notificationsApi.getUnreadCount();

// Mark as read
await notificationsApi.markAsRead(notificationId);

// Mark all as read
await notificationsApi.markAllAsRead();

// Delete notification
await notificationsApi.deleteNotification(notificationId);

// Delete all read
await notificationsApi.deleteAllRead();
```

### 2. Custom Hook
File: `frontend/frontendpaytask/src/hooks/useUnreadNotificationCount.ts`

```typescript
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';

function MyComponent() {
  const { count, loading, refresh } = useUnreadNotificationCount();
  
  return (
    <Badge>{count}</Badge>
  );
}
```

**Features:**
- Auto-fetch on mount
- Auto-refresh every 30 seconds
- Manual refresh function
- Loading state

### 3. Notifications Page
File: `frontend/frontendpaytask/src/app/notifications/page.tsx`

Trang notifications đầy đủ với:
- ✅ Tabs (All, Unread, Read)
- ✅ Mark as read (individual & all)
- ✅ Delete notifications (individual & all read)
- ✅ Real-time unread count
- ✅ Loading states
- ✅ Error handling
- ✅ Empty states

---

## 🛠️ Helper Functions Usage

### Trong các services khác:

#### 1. Task Assignment
```typescript
// assignment.service.ts
import { NotificationService } from './notification.service';

async acceptTask(taskId: string, workerId: string) {
  // ... logic accept task
  
  // Send notification
  await NotificationService.notifyTaskAssignment(
    taskId,
    workerId,
    task.title
  );
}
```

#### 2. Payment
```typescript
// transactions.service.ts
async processPayment(userId: string, amount: number, taskTitle: string) {
  // ... logic payment
  
  // Notify user
  await NotificationService.notifyPayment(userId, amount, taskTitle);
}
```

#### 3. Submission Review
```typescript
// submission.service.ts
async reviewSubmission(submissionId: string, status: 'approved' | 'rejected', feedback?: string) {
  // ... logic review
  
  // Notify worker
  await NotificationService.notifySubmissionReview(
    submission.workerId,
    submission.task.title,
    status,
    feedback
  );
}
```

#### 4. Deadline Reminder
```typescript
// Sử dụng trong cronjob hoặc background job
import { NotificationService } from '../services/notification.service';

async function sendDeadlineReminders() {
  const upcomingTasks = await getTasksDueIn24Hours();
  
  for (const task of upcomingTasks) {
    await NotificationService.notifyDeadlineReminder(
      task.workerId,
      task.title,
      task.deadline
    );
  }
}
```

---

## 📝 Usage Examples

### Example 1: Thông báo khi worker accept task
```typescript
// assignment.service.ts
import { NotificationService } from './notification.service';

export class AssignmentService {
  static async acceptTask(taskId: string, workerId: string) {
    const assignment = await prisma.assignment.create({
      data: { taskId, workerId },
      include: { task: true }
    });
    
    // Gửi thông báo cho worker
    await NotificationService.notifyTaskAssignment(
      taskId,
      workerId,
      assignment.task.title
    );
    
    return assignment;
  }
}
```

### Example 2: Thông báo thanh toán
```typescript
// transactions.service.ts
async completePayment(assignmentId: string) {
  const assignment = await prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: 'completed', paidAt: new Date() },
    include: { task: true, worker: true }
  });
  
  // Gửi thông báo thanh toán
  await NotificationService.notifyPayment(
    assignment.workerId,
    assignment.task.reward,
    assignment.task.title
  );
}
```

### Example 3: Thông báo custom
```typescript
// Bất kỳ service nào
import { NotificationService } from './notification.service';

await NotificationService.createNotification({
  toUserId: userId,
  type: 'custom_event',
  content: 'Your custom message here',
  meta: {
    eventType: 'special',
    relatedId: 'some-id',
    customField: 'value'
  }
});
```

### Example 4: Frontend - Display unread badge
```typescript
// Navigation.tsx
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';

export default function Navigation() {
  const { count } = useUnreadNotificationCount();
  
  return (
    <Link href="/notifications">
      <Bell />
      {count > 0 && (
        <Badge className="absolute -top-1 -right-1">
          {count > 99 ? '99+' : count}
        </Badge>
      )}
    </Link>
  );
}
```

---

## 🎨 Notification Types

Các loại notification được hỗ trợ:

| Type | Description | Icon | Priority |
|------|-------------|------|----------|
| `payment` | Thông báo thanh toán | 💰 | High |
| `task_assignment` | Task được assign | 📋 | Normal |
| `task_alert` | Task mới available | 🔔 | Normal |
| `submission_review` | Review submission | ⭐ | High |
| `deadline` | Deadline sắp đến | ⏰ | Urgent |
| `system` | Thông báo hệ thống | ℹ️ | Normal |

---

## 🔐 Authentication

Tất cả endpoints (trừ create - admin only) yêu cầu authentication token:

```typescript
Authorization: Bearer <token>
```

Token được lưu trong localStorage sau khi login và tự động được thêm vào headers bởi axios interceptor.

---

## ✅ Features

- ✅ Full CRUD operations
- ✅ Filter by status and type
- ✅ Pagination support
- ✅ Real-time unread count
- ✅ Bulk operations (mark all, delete all)
- ✅ Type-safe TypeScript
- ✅ Error handling
- ✅ Loading states
- ✅ Auto-refresh
- ✅ Helper functions for common events

---

## 🚀 Next Steps

1. **Real-time notifications**: Tích hợp WebSocket/Socket.io để push notifications real-time
2. **Email notifications**: Gửi email cho notifications quan trọng
3. **Push notifications**: Browser push notifications
4. **Notification preferences**: Cho phép user config loại notification muốn nhận
5. **Read receipts**: Track khi nào notification được đọc
