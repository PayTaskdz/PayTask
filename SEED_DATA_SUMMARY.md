# 📊 Seed Data Summary - Database đã được cập nhật!

## ✅ ĐÃ SEED XONG

Database bây giờ có **2 workers với profiles** và **mỗi worker có 1 task assigned sẵn**!

---

## 👥 USERS

### Client (1 người)
```
ID:      550e8400-e29b-41d4-a716-446655440002
Email:   client@example.com
Country: UK
Role:    client
```

### Worker 1 (Beginner)
```
ID:        550e8400-e29b-41d4-a716-446655440004
Email:     worker@example.com
Country:   US
Role:      worker

Profile:
  Skills:            transcription, data-entry, translation
  Languages:         en, es
  Timezone:          UTC
  Hours:             9-17
  Reputation:        4.5 ⭐
  Completed Tasks:   0
  Early Submissions: 0
```

### Worker 2 (Experienced) ⭐
```
ID:        550e8400-e29b-41d4-a716-446655440006
Email:     worker2@example.com
Country:   Canada
Role:      worker

Profile:
  Skills:            data-entry, research, categorization
  Languages:         en, fr
  Timezone:          EST
  Hours:             8-16
  Reputation:        4.8 ⭐⭐
  Completed Tasks:   15
  Early Submissions: 10
```

---

## 📋 TASKS

### Available Tasks (8 tasks) - Có thể accept
```
1. 550e8400-e29b-41d4-a716-446655440010 - Transcribe 10-minute audio ($15.50)
2. 550e8400-e29b-41d4-a716-446655440011 - Data entry from scanned documents ($25.00)
3. 550e8400-e29b-41d4-a716-446655440012 - Translate English to Spanish ($30.00)
4. 550e8400-e29b-41d4-a716-446655440013 - Image categorization 100 images ($20.00)
5. 550e8400-e29b-41d4-a716-446655440014 - Product research 20 items ($40.00)
6. 550e8400-e29b-41d4-a716-446655440015 - Transcribe 30-minute podcast ($45.00)
7. 550e8400-e29b-41d4-a716-446655440016 - Social media moderation ($35.00)
8. 550e8400-e29b-41d4-a716-446655440017 - Email customer support ($28.00)
```

### Assigned Tasks (2 tasks)

**Task for Worker 1:**
```
ID:          550e8400-e29b-41d4-a716-446655440018
Title:       Already assigned task
Description: This task should not appear in worker discovery
Category:    test
Reward:      $10.00
Status:      open (but assigned)
Worker:      550e8400-e29b-41d4-a716-446655440004 (worker@example.com)
```

**Task for Worker 2:**
```
ID:          550e8400-e29b-41d4-a716-446655440019
Title:       Product categorization for e-commerce
Description: Categorize 500 products into appropriate categories
Category:    categorization
Reward:      $50.00
Status:      open (but assigned)
Worker:      550e8400-e29b-41d4-a716-446655440006 (worker2@example.com)
```

---

## 🎯 TEST SCENARIOS

### Scenario 1: Worker 1 accepts new task
```bash
POST /api/tasks/assignments/accept
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}
```
**Expected:** Success! Worker 1 bây giờ có 2 assignments

### Scenario 2: Worker 2 accepts new task
```bash
POST /api/tasks/assignments/accept
{
  "taskId": "550e8400-e29b-41d4-a716-446655440011",
  "workerId": "550e8400-e29b-41d4-a716-446655440006"
}
```
**Expected:** Success! Worker 2 bây giờ có 2 assignments

### Scenario 3: Xem assignments của Worker 1
```bash
GET /api/tasks/assignments/my-assignments?workerId=550e8400-e29b-41d4-a716-446655440004
```
**Expected:** Array với 1 assignment (hoặc nhiều hơn nếu đã accept thêm)

### Scenario 4: Xem assignments của Worker 2
```bash
GET /api/tasks/assignments/my-assignments?workerId=550e8400-e29b-41d4-a716-446655440006
```
**Expected:** Array với 1 assignment (categorization task - $50)

### Scenario 5: Worker 1 accept nhiều tasks (test concurrency cap)
```bash
# Accept task 1
POST /api/tasks/assignments/accept
{"taskId": "550e8400-e29b-41d4-a716-446655440010", "workerId": "550e8400-e29b-41d4-a716-446655440004"}

# Accept task 2
POST /api/tasks/assignments/accept
{"taskId": "550e8400-e29b-41d4-a716-446655440011", "workerId": "550e8400-e29b-41d4-a716-446655440004"}

# Accept task 3 (should fail - max 3 concurrent)
POST /api/tasks/assignments/accept
{"taskId": "550e8400-e29b-41d4-a716-446655440012", "workerId": "550e8400-e29b-41d4-a716-446655440004"}
```
**Expected:** Task 3 fails với CONCURRENCY_CAP (vì worker đã có 1 + 2 = 3 assignments)

---

## 🧪 TEST TRÊN SWAGGER

### Test 1: Xem assignments của Worker 1
```
1. Mở: http://localhost:3000/api-docs
2. Tìm: GET /api/tasks/assignments/my-assignments
3. Query: workerId = 550e8400-e29b-41d4-a716-446655440004
4. Execute
5. Kết quả: 1 assignment (task test)
```

### Test 2: Xem assignments của Worker 2
```
1. Mở: http://localhost:3000/api-docs
2. Tìm: GET /api/tasks/assignments/my-assignments
3. Query: workerId = 550e8400-e29b-41d4-a716-446655440006
4. Execute
5. Kết quả: 1 assignment (categorization - $50)
```

### Test 3: Worker 1 accept thêm task
```
1. Tìm: POST /api/tasks/assignments/accept
2. Try it out
3. Body:
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440004"
}
4. Execute
5. Kết quả: 201 Created, assignment mới được tạo
```

### Test 4: Worker 2 accept thêm task
```
1. Tìm: POST /api/tasks/assignments/accept
2. Try it out
3. Body:
{
  "taskId": "550e8400-e29b-41d4-a716-446655440015",
  "workerId": "550e8400-e29b-41d4-a716-446655440006"
}
4. Execute
5. Kết quả: 201 Created, worker 2 bây giờ có 2 assignments
```

---

## 📊 SUMMARY

```
Total Users:        3
  - Clients:        1
  - Workers:        2

Total Tasks:        10
  - Available:      8
  - Assigned:       2

Total Assignments:  2
  - Worker 1:       1 assignment (test task)
  - Worker 2:       1 assignment (categorization task - $50)

Total Escrows:      10 (all with status = 'held')
```

---

## 🔑 QUICK REFERENCE IDS

### Worker IDs
```
Worker 1: 550e8400-e29b-41d4-a716-446655440004
Worker 2: 550e8400-e29b-41d4-a716-446655440006
```

### Sample Task IDs (để test accept)
```
Transcription ($15.50):  550e8400-e29b-41d4-a716-446655440010
Data Entry ($25.00):     550e8400-e29b-41d4-a716-446655440011
Translation ($30.00):    550e8400-e29b-41d4-a716-446655440012
Categorization ($20.00): 550e8400-e29b-41d4-a716-446655440013
Research ($40.00):       550e8400-e29b-41d4-a716-446655440014
Podcast ($45.00):        550e8400-e29b-41d4-a716-446655440015
```

---

## 🎯 ĐỂ TEST DEFAULT (không cần truyền workerId)

API sẽ dùng **Worker 1** làm mặc định:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010"
}
```

Để test với **Worker 2**, phải truyền workerId:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440010",
  "workerId": "550e8400-e29b-41d4-a716-446655440006"
}
```

---

## 🚀 READY TO TEST!

**Mở Swagger:**
```
http://localhost:3000/api-docs
```

**Section "Assignments":**
- POST /api/tasks/assignments/accept
- GET /api/tasks/assignments/my-assignments

**Chúc bạn test vui vẻ với 2 workers!** 🎊

