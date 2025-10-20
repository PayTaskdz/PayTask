# 🎁 Early Submission Bonus System

## 📋 Overview

Workers who submit their work **before the deadline** receive **bonus reputation points** to encourage timely delivery and reliability.

---

## 💰 Bonus Calculation

### Formula

```javascript
hoursEarly = (dueAt - submittedAt) / 3600  // Convert to hours
rawBonus = hoursEarly × 0.1                 // 0.1 point per hour
bonusPoints = min(rawBonus, 5.0)           // Cap at 5.0 points
```

### Rules

1. **Rate:** 0.1 reputation point per hour early
2. **Maximum:** 5.0 points (capped)
3. **Minimum:** 0.0 points (no penalty for on-time submission)
4. **Precision:** Rounded to 1 decimal place

---

## 📊 Bonus Examples

| Hours Early | Raw Calculation | Bonus Points | Notes |
|-------------|-----------------|--------------|-------|
| 1 hour | 1 × 0.1 = 0.1 | **0.1** | Minimal bonus |
| 5 hours | 5 × 0.1 = 0.5 | **0.5** | - |
| 10 hours | 10 × 0.1 = 1.0 | **1.0** | 1 full point |
| 24 hours | 24 × 0.1 = 2.4 | **2.4** | 1 day early |
| 26 hours | 26 × 0.1 = 2.6 | **2.6** | Example from docs |
| 48 hours | 48 × 0.1 = 4.8 | **4.8** | 2 days early |
| 50 hours | 50 × 0.1 = 5.0 | **5.0** | **Exactly at cap** |
| 100 hours | 100 × 0.1 = 10.0 | **5.0** | ❌ Capped! |
| 200 hours | 200 × 0.1 = 20.0 | **5.0** | ❌ Capped! |

---

## 🎯 Why Cap at 5.0?

### Reasons for Cap

1. **Prevent Gaming:** Workers can't accumulate excessive points by accepting tasks far in advance
2. **Fair System:** Rewards reasonable early submission without over-rewarding
3. **Balanced Economy:** Keeps reputation system meaningful
4. **Realistic Incentive:** 5.0 points is significant but not overwhelming

### What Happens Without Cap?

```
Worker accepts task with 30-day deadline
Submits in 1 day
→ 29 days × 24 hours = 696 hours early
→ 696 × 0.1 = 69.6 points (!!)

This would break the reputation system!
```

With cap:
```
Same scenario → 5.0 points (reasonable)
```

---

## 🔄 System Flow

```
┌─────────────────────┐
│ Worker Submits Work │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Check Time   │
    │ submittedAt  │
    │ vs dueAt     │
    └──────┬───────┘
           │
     ┌─────┴──────┐
     │            │
     ▼            ▼
┌─────────┐  ┌─────────┐
│  Late   │  │  Early  │
│ No Bonus│  │Calculate│
└─────────┘  └────┬────┘
                  │
                  ▼
           ┌──────────────┐
           │ hoursEarly = │
           │ (due - now)  │
           └──────┬───────┘
                  │
                  ▼
           ┌──────────────┐
           │ rawBonus =   │
           │ hours × 0.1  │
           └──────┬───────┘
                  │
                  ▼
           ┌──────────────┐
           │ bonusPoints =│
           │ min(raw, 5.0)│
           └──────┬───────┘
                  │
                  ▼
        ┌─────────────────┐
        │ Update Profile: │
        │ reputation += b │
        │ earlySubmit += 1│
        └─────────────────┘
```

---

## 📈 Impact on Worker Profile

### What Gets Updated

```typescript
// Before submission
workerProfile = {
  reputation: 100.0,
  earlySubmissions: 5,
  completedTasks: 20
}

// Worker submits 26 hours early → 2.6 bonus
workerProfile = {
  reputation: 102.6,      // +2.6
  earlySubmissions: 6,    // +1
  completedTasks: 20      // No change yet (updated on review)
}
```

### Database Transaction

```typescript
await prisma.workerProfile.update({
  where: { userId: workerId },
  data: {
    earlySubmissions: {
      increment: 1,          // Count this early submission
    },
    reputation: {
      increment: bonusPoints, // Add bonus (capped at 5.0)
    },
  },
});
```

---

## 🧪 Test Cases

### Test Case 1: Normal Early Submission
```json
{
  "startedAt": "2025-10-18T10:00:00Z",
  "dueAt": "2025-10-20T10:00:00Z",
  "submittedAt": "2025-10-19T08:00:00Z"
}
```

**Calculation:**
- Hours early: (2025-10-20 10:00 - 2025-10-19 08:00) = 26 hours
- Raw bonus: 26 × 0.1 = 2.6
- Final bonus: min(2.6, 5.0) = **2.6 points** ✅

---

### Test Case 2: Exactly at Cap
```json
{
  "startedAt": "2025-10-15T10:00:00Z",
  "dueAt": "2025-10-20T10:00:00Z",
  "submittedAt": "2025-10-18T08:00:00Z"
}
```

**Calculation:**
- Hours early: 50 hours
- Raw bonus: 50 × 0.1 = 5.0
- Final bonus: min(5.0, 5.0) = **5.0 points** ✅

---

### Test Case 3: Over the Cap
```json
{
  "startedAt": "2025-10-01T10:00:00Z",
  "dueAt": "2025-10-20T10:00:00Z",
  "submittedAt": "2025-10-05T10:00:00Z"
}
```

**Calculation:**
- Hours early: 360 hours (15 days)
- Raw bonus: 360 × 0.1 = 36.0
- Final bonus: min(36.0, 5.0) = **5.0 points** ✅ Capped!

---

### Test Case 4: Late Submission
```json
{
  "startedAt": "2025-10-18T10:00:00Z",
  "dueAt": "2025-10-20T10:00:00Z",
  "submittedAt": "2025-10-21T10:00:00Z"
}
```

**Result:**
- Hours early: -24 hours (negative!)
- isEarly: false
- Bonus points: **0.0 points** (no bonus)
- Submission rejected: `LATE_SUBMISSION` error

---

### Test Case 5: Minimal Early (30 minutes)
```json
{
  "startedAt": "2025-10-18T10:00:00Z",
  "dueAt": "2025-10-20T10:00:00Z",
  "submittedAt": "2025-10-20T09:30:00Z"
}
```

**Calculation:**
- Hours early: 0.5 hours
- Raw bonus: 0.5 × 0.1 = 0.05
- Final bonus: min(0.05, 5.0) = **0.1 points** (rounded)

---

## 📊 API Response Examples

### With Early Bonus
```json
{
  "success": true,
  "message": "Submission created successfully",
  "data": {
    "id": "submission-uuid",
    "status": "submitted",
    "submittedAt": "2025-10-19T08:30:00Z",
    "earlySubmission": true,
    "hoursEarly": 26.5,
    "bonusPoints": 2.7,
    "qaFlags": {
      "passed": true,
      "checks": {
        "completeness": true,
        "duplicate": false,
        "format": true,
        "size": true
      }
    }
  }
}
```

### At Maximum Cap
```json
{
  "success": true,
  "data": {
    "earlySubmission": true,
    "hoursEarly": 100.0,
    "bonusPoints": 5.0,  // ← Capped at 5.0!
    "note": "Maximum bonus reached"
  }
}
```

### No Bonus (On-time)
```json
{
  "success": true,
  "data": {
    "earlySubmission": false,
    "hoursEarly": 0,
    "bonusPoints": 0
  }
}
```

---

## 🎓 Strategic Implications

### For Workers

**Good Strategy:**
- Submit quality work as soon as possible
- Build reputation steadily
- Max 5.0 points per task encourages consistent performance

**Bad Strategy:**
- Rushing work to get bonus (will fail QA checks)
- Cherry-picking only long-deadline tasks (limited benefit due to cap)

### For Platform

**Benefits:**
- Encourages timely delivery
- Prevents reputation inflation
- Rewards quality + speed combination
- Fair for all workers regardless of task deadline

---

## 💡 Tips for Workers

### How to Maximize Bonus

1. **Accept tasks you can complete quickly**
   - Don't accept too many at once (3 max)
   - Focus on your strengths

2. **Plan your work**
   - Start early to avoid deadline pressure
   - Quality first, speed second

3. **Understand the cap**
   - Submitting 2 days early = 4.8 points
   - Submitting 3 days early = 5.0 points (capped)
   - Extra time doesn't give more points!

4. **Consistency matters**
   - Better to submit 10 tasks 1 day early (2.4 × 10 = 24 points)
   - Than 1 task 5 days early (5.0 × 1 = 5 points)

---

## 🔍 Monitoring & Analytics

### Track Early Submission Rate

```sql
SELECT 
  COUNT(*) FILTER (WHERE (qa_flags->>'passed')::boolean = true) as total_submissions,
  COUNT(*) FILTER (WHERE (qa_flags->>'passed')::boolean = true AND 
                         "submitted_at" < (SELECT "due_at" FROM assignments WHERE id = "assignment_id")) as early_submissions
FROM submissions;
```

### Average Bonus Points

```sql
SELECT 
  wp."user_id",
  wp."early_submissions",
  wp."reputation",
  ROUND(wp."reputation" / NULLIF(wp."completed_tasks", 0), 2) as avg_reputation_per_task
FROM worker_profiles wp
WHERE wp."early_submissions" > 0;
```

---

## 🎉 Summary

| Feature | Value |
|---------|-------|
| **Rate** | 0.1 point/hour |
| **Maximum** | 5.0 points |
| **Minimum** | 0.0 points |
| **Cap Reason** | Prevent gaming |
| **Benefits** | Encourages timely delivery |
| **Updates** | `reputation` + `earlySubmissions` |

**Formula:**
```
bonusPoints = min(hoursEarly × 0.1, 5.0)
```

**The cap ensures a fair, balanced reputation system!** 🏆

