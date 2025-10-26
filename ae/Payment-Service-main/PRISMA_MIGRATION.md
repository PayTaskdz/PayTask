# Migration từ Raw SQL sang Prisma ORM

## ✅ Đã hoàn thành

### 1. Schema Migration
- ✅ Tạo `prisma/schema.prisma` với models:
  - **User**: userId (unique), walletAddress, timestamps
  - **Task**: taskId (unique), userId, budget, quantity, amount, feePercent, status, txHash, timestamps

### 2. Service Migration
- ✅ Tạo `src/config/prisma.ts` - Prisma Client config
- ✅ Tạo `src/services/user.service.ts` - User service với Prisma
- ✅ Tạo `src/services/task.service.ts` - Task service với Prisma

## 📝 Các bước để áp dụng

### Bước 1: Install Prisma
```bash
cd Payment-Service-main
npm install prisma @prisma/client
```

### Bước 2: Generate Prisma Client
```bash
npx prisma generate
```

### Bước 3: Tạo migration (nếu cần tạo database mới)
```bash
# Option 1: Tạo migration từ schema
npx prisma migrate dev --name init

# Option 2: Nếu database đã tồn tại, introspect nó
npx prisma db pull
npx prisma generate
```

### Bước 4: Thay thế old services
Thay đổi imports từ:
```typescript
// CŨ
import { userService } from './db/tables/user';
import { taskService } from './db/tables/task';

// MỚI
import { userService } from './services/user.service';
import { taskService } from './services/task.service';
```

### Bước 5: Xóa old files (sau khi test thành công)
```bash
# Xóa raw SQL files
rm -rf src/db/tables/user.ts
rm -rf src/db/tables/task.ts
rm -rf src/db/db.ts  # Nếu không dùng nữa
```

## 🔄 API Changes

### User Service
```typescript
// Tất cả methods giữ nguyên interface:
await userService.createUser({ userId, walletAddress });
await userService.getUserById(userId);
await userService.getUserByWallet(walletAddress);
await userService.getAllUsers();
await userService.deleteUser(userId);
```

### Task Service
```typescript
// Tất cả methods giữ nguyên interface:
await taskService.createTask({ taskId, userId, amount, budget, quantity, feePercent });
await taskService.getTaskById(taskId);
await taskService.updateTaskStatus(taskId, 'payment_done', txHash);
await taskService.getAllTasks();
await taskService.deleteTask(taskId);

// BONUS: Thêm 2 methods mới
await taskService.getTasksByUserId(userId);
await taskService.getTasksByStatus('pending');
```

## ⚙️ Environment Variables

Đảm bảo `.env` có:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/payment_db"
```

## 🎯 Ưu điểm của Prisma

1. **Type Safety**: Full TypeScript support, autocomplete
2. **Migration Management**: Prisma Migrate quản lý schema changes
3. **Query Builder**: Không cần viết raw SQL
4. **Error Handling**: Prisma error codes thay vì PostgreSQL codes
5. **Performance**: Connection pooling, query optimization
6. **Developer Experience**: Prisma Studio để xem data

## 🧪 Testing

Sau khi migrate, test các operations:
```bash
# Test tạo user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"userId": "test123", "walletAddress": "0x..."}'

# Test tạo task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task123",
    "userId": "test123",
    "amount": 100,
    "budget": 105,
    "quantity": 1,
    "feePercent": 5
  }'
```

## 📊 Schema Comparison

### Before (Raw SQL)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE,
  wallet_address VARCHAR(255),
  ...
);
```

### After (Prisma)
```prisma
model User {
  id            Int      @id @default(autoincrement())
  userId        String   @unique @map("user_id")
  walletAddress String   @map("wallet_address")
  ...
}
```

## 🚀 Next Steps

1. ✅ Install packages
2. ✅ Generate Prisma Client
3. ✅ Run migration
4. ✅ Update imports in routes
5. ✅ Test all endpoints
6. ✅ Remove old SQL files

## 💡 Prisma Studio

Xem và edit data trực tiếp:
```bash
npx prisma studio
```
Mở browser tại `http://localhost:5555`
