import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.errorLog.deleteMany();
  await prisma.commsLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.review.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.workerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemPolicy.deleteMany();

  // ============================================
  // 1. SYSTEM POLICIES
  // ============================================
  console.log('📋 Creating system policies...');
  await prisma.systemPolicy.createMany({
    data: [
      {
        key: 'fee_rate',
        value: { rate: 0.05, description: 'Platform fee rate (5%)' },
      },
      {
        key: 'kyc_threshold',
        value: { amount: 100, currency: 'USD', description: 'KYC required when payouts exceed $100' },
      },
      {
        key: 'auto_approve_hours',
        value: { hours: 48, description: 'Auto-approve submission after 48h of no review' },
      },
      {
        key: 'draft_expiry_days',
        value: { days: 7, description: 'Draft tasks auto-expire after 7 days' },
      },
      {
        key: 'max_concurrent_assignments',
        value: { count: 3, description: 'Maximum concurrent assignments per worker' },
      },
      {
        key: 'sla_work_hours',
        value: { hours: 24, description: 'SLA for work completion' },
      },
      {
        key: 'sla_review_hours',
        value: { hours: 48, description: 'SLA for client review' },
      },
    ],
  });

  // ============================================
  // 2. USERS
  // ============================================
  console.log('👥 Creating users...');
  const password = await bcrypt.hash('password123', 10);

  // Clients
  const client1 = await prisma.user.create({
    data: {
      email: 'client1@paytask.com',
      username: 'client_alice',
      passwordHash: password,
      role: 'client',
      isActive: true,
    },
  });

  const client2 = await prisma.user.create({
    data: {
      email: 'client2@paytask.com',
      username: 'client_bob',
      passwordHash: password,
      role: 'client',
      isActive: true,
    },
  });

  const client3 = await prisma.user.create({
    data: {
      email: 'client3@paytask.com',
      username: 'client_charlie',
      passwordHash: password,
      role: 'client',
      isActive: true,
    },
  });

  // Workers
  const worker1 = await prisma.user.create({
    data: {
      email: 'worker1@paytask.com',
      username: 'worker_diana',
      passwordHash: password,
      role: 'worker',
      isActive: true,
    },
  });

  const worker2 = await prisma.user.create({
    data: {
      email: 'worker2@paytask.com',
      username: 'worker_eve',
      passwordHash: password,
      role: 'worker',
      isActive: true,
    },
  });

  const worker3 = await prisma.user.create({
    data: {
      email: 'worker3@paytask.com',
      username: 'worker_frank',
      passwordHash: password,
      role: 'worker',
      isActive: true,
    },
  });

  const worker4 = await prisma.user.create({
    data: {
      email: 'worker4@paytask.com',
      username: 'worker_grace',
      passwordHash: password,
      role: 'worker',
      isActive: true,
    },
  });

  // ============================================
  // 3. WALLETS
  // ============================================
  console.log('💰 Creating wallets...');
  
  const walletClient1 = await prisma.wallet.create({
    data: {
      userId: client1.id,
      fystackWalletId: 'fystack_wallet_client1_001',
      fystackWorkspaceId: 'fystack_workspace_001',
      addresses: {
        ethereum: '0x1234567890123456789012345678901234567890',
        polygon: '0x2345678901234567890123456789012345678901',
      },
      walletName: 'Alice Main Wallet',
      isActive: true,
    },
  });

  void await prisma.wallet.create({
    data: {
      userId: client2.id,
      fystackWalletId: 'fystack_wallet_client2_001',
      fystackWorkspaceId: 'fystack_workspace_001',
      addresses: {
        ethereum: '0x3456789012345678901234567890123456789012',
        polygon: '0x4567890123456789012345678901234567890123',
      },
      walletName: 'Bob Main Wallet',
      isActive: true,
    },
  });

  void await prisma.wallet.create({
    data: {
      userId: client3.id,
      fystackWalletId: 'fystack_wallet_client3_001',
      fystackWorkspaceId: 'fystack_workspace_001',
      addresses: {
        ethereum: '0x5678901234567890123456789012345678901234',
        polygon: '0x6789012345678901234567890123456789012345',
      },
      walletName: 'Charlie Main Wallet',
      isActive: true,
    },
  });

  const walletWorker1 = await prisma.wallet.create({
    data: {
      userId: worker1.id,
      fystackWalletId: 'fystack_wallet_worker1_001',
      fystackWorkspaceId: 'fystack_workspace_001',
      addresses: {
        ethereum: '0x7890123456789012345678901234567890123456',
        polygon: '0x8901234567890123456789012345678901234567',
      },
      walletName: 'Diana Work Wallet',
      isActive: true,
    },
  });

  void await prisma.wallet.create({
    data: {
      userId: worker2.id,
      fystackWalletId: 'fystack_wallet_worker2_001',
      fystackWorkspaceId: 'fystack_workspace_001',
      addresses: {
        ethereum: '0x9012345678901234567890123456789012345678',
        polygon: '0x0123456789012345678901234567890123456789',
      },
      walletName: 'Eve Work Wallet',
      isActive: true,
    },
  });

  void await prisma.wallet.create({
    data: {
      userId: worker3.id,
      fystackWalletId: 'fystack_wallet_worker3_001',
      fystackWorkspaceId: 'fystack_workspace_001',
      addresses: {
        ethereum: '0x1357902468135790246813579024681357902468',
        polygon: '0x2468135790246813579024681357902468135790',
      },
      walletName: 'Frank Work Wallet',
      isActive: true,
    },
  });

  void await prisma.wallet.create({
    data: {
      userId: worker4.id,
      fystackWalletId: 'fystack_wallet_worker4_001',
      fystackWorkspaceId: 'fystack_workspace_001',
      addresses: {
        ethereum: '0x3691472580369147258036914725803691472580',
        polygon: '0x4702581369470258136947025813694702581369',
      },
      walletName: 'Grace Work Wallet',
      isActive: true,
    },
  });

  // ============================================
  // 4. WORKER PROFILES
  // ============================================
  console.log('👷 Creating worker profiles...');
  
  await prisma.workerProfile.create({
    data: {
      userId: worker1.id,
      skills: ['Data Entry', 'Research', 'Content Writing', 'Translation'],
      languages: ['English', 'Spanish', 'French'],
      availability: {
        timezone: 'America/New_York',
        hours: '9am-5pm',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      reputation: 4.8,
      completedTasks: 45,
      earlySubmissions: 38,
    },
  });

  await prisma.workerProfile.create({
    data: {
      userId: worker2.id,
      skills: ['Data Entry', 'Image Tagging', 'Surveys', 'Testing'],
      languages: ['English', 'German'],
      availability: {
        timezone: 'Europe/Berlin',
        hours: '10am-6pm',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      },
      reputation: 4.5,
      completedTasks: 32,
      earlySubmissions: 25,
    },
  });

  await prisma.workerProfile.create({
    data: {
      userId: worker3.id,
      skills: ['Transcription', 'Data Validation', 'Research', 'Content Moderation'],
      languages: ['English', 'Japanese', 'Korean'],
      availability: {
        timezone: 'Asia/Tokyo',
        hours: '8am-8pm',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      },
      reputation: 4.9,
      completedTasks: 68,
      earlySubmissions: 60,
    },
  });

  await prisma.workerProfile.create({
    data: {
      userId: worker4.id,
      skills: ['Data Entry', 'Surveys', 'Simple Tasks'],
      languages: ['English'],
      availability: {
        timezone: 'America/Los_Angeles',
        hours: 'Flexible',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      },
      reputation: 3.8,
      completedTasks: 12,
      earlySubmissions: 8,
    },
  });

  // ============================================
  // 5. SESSIONS (Active user sessions)
  // ============================================
  console.log('🔐 Creating sessions...');
  
  const sessionToken1 = 'session_token_client1_' + Math.random().toString(36).substring(2);
  const sessionToken2 = 'session_token_worker1_' + Math.random().toString(36).substring(2);
  const sessionToken3 = 'session_token_worker3_' + Math.random().toString(36).substring(2);
  
  await prisma.session.createMany({
    data: [
      {
        userId: client1.id,
        token: sessionToken1,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
        isActive: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ipAddress: '192.168.1.100',
      },
      {
        userId: worker1.id,
        token: sessionToken2,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ipAddress: '192.168.1.101',
      },
      {
        userId: worker3.id,
        token: sessionToken3,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ipAddress: '192.168.1.102',
      },
      // Expired session example
      {
        userId: client2.id,
        token: 'expired_session_token_client2_' + Math.random().toString(36).substring(2),
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Expired yesterday
        isActive: false,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        ipAddress: '192.168.1.103',
      },
    ],
  });

  // ============================================
  // 6. AUDIT LOGS
  // ============================================
  console.log('📝 Creating audit logs...');
  
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: client1.id,
        action: 'user_signup',
        details: { method: 'email', timestamp: new Date().toISOString() },
      },
      {
        actorId: client2.id,
        action: 'user_signup',
        details: { method: 'email', timestamp: new Date().toISOString() },
      },
      {
        actorId: worker1.id,
        action: 'user_signup',
        details: { method: 'email', timestamp: new Date().toISOString() },
      },
      {
        actorId: worker2.id,
        action: 'user_signup',
        details: { method: 'email', timestamp: new Date().toISOString() },
      },
      {
        actorId: client1.id,
        action: 'wallet_created',
        details: { walletId: walletClient1.id, type: 'custodial' },
      },
      {
        actorId: worker1.id,
        action: 'wallet_created',
        details: { walletId: walletWorker1.id, type: 'custodial' },
      },
    ],
  });

  // ============================================
  // 7. TASKS
  // ============================================
  console.log('📋 Creating tasks...');
  
  // Draft task (not yet published)
  void await prisma.task.create({
    data: {
      clientId: client1.id,
      title: 'Image Classification - Product Photos',
      description: 'Classify 100 product images into categories: Electronics, Clothing, Home & Garden, Sports',
      category: 'Image Tagging',
      reward: 25.00,
      qty: 1,
      budget: 26.25, // reward + 5% fee
      feePercent: 5.00,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'draft',
    },
  });

  // Open task (published, waiting for worker)
  const taskOpen1 = await prisma.task.create({
    data: {
      clientId: client1.id,
      title: 'Data Entry - Product Catalog',
      description: 'Enter product details from PDF into spreadsheet. 50 products with name, price, description, SKU.',
      category: 'Data Entry',
      reward: 30.00,
      qty: 1,
      budget: 31.50,
      feePercent: 5.00,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status: 'open',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
  });

  void await prisma.task.create({
    data: {
      clientId: client2.id,
      title: 'Survey Response Collection',
      description: 'Complete a 10-minute survey about consumer preferences for mobile apps.',
      category: 'Surveys',
      reward: 5.00,
      qty: 50,
      budget: 262.50, // 5 * 50 * 1.05
      feePercent: 5.00,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      status: 'open',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
  });

  // Active task (worker accepted, in progress)
  const taskActive1 = await prisma.task.create({
    data: {
      clientId: client1.id,
      title: 'Website Content Review',
      description: 'Review 20 website pages for spelling errors, broken links, and content quality issues.',
      category: 'Content Moderation',
      reward: 40.00,
      qty: 1,
      budget: 42.00,
      feePercent: 5.00,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      status: 'active',
      txHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    },
  });

  const taskActive2 = await prisma.task.create({
    data: {
      clientId: client2.id,
      title: 'Audio Transcription - Interview',
      description: 'Transcribe a 30-minute interview audio file. English language, clear audio quality.',
      category: 'Transcription',
      reward: 35.00,
      qty: 1,
      budget: 36.75,
      feePercent: 5.00,
      deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
      status: 'active',
      txHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    },
  });

  // Completed task (submission approved, paid)
  const taskCompleted1 = await prisma.task.create({
    data: {
      clientId: client1.id,
      title: 'Research - Competitor Analysis',
      description: 'Research 5 competitors and provide analysis of their features, pricing, and market position.',
      category: 'Research',
      reward: 50.00,
      qty: 1,
      budget: 52.50,
      feePercent: 5.00,
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (completed)
      status: 'completed',
      txHash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
    },
  });

  const taskCompleted2 = await prisma.task.create({
    data: {
      clientId: client2.id,
      title: 'Simple Data Validation',
      description: 'Validate 200 email addresses and phone numbers in a spreadsheet.',
      category: 'Data Validation',
      reward: 20.00,
      qty: 1,
      budget: 21.00,
      feePercent: 5.00,
      deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (completed)
      status: 'completed',
      txHash: '0xaaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666000077778888999',
    },
  });

  const taskCompleted3 = await prisma.task.create({
    data: {
      clientId: client3.id,
      title: 'Content Writing - Blog Post',
      description: 'Write a 1000-word blog post about best practices for remote work productivity.',
      category: 'Content Writing',
      reward: 45.00,
      qty: 1,
      budget: 47.25,
      feePercent: 5.00,
      deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (completed)
      status: 'completed',
      txHash: '0xbbbbccccddddeeeeffffgggghhhhiiiijjjjkkkkllllmmmmnnnnooooppppqqqq',
    },
  });

  // ============================================
  // 8. ASSIGNMENTS
  // ============================================
  console.log('📝 Creating assignments...');
  
  // Active assignments (in progress)
  const assignmentActive1 = await prisma.assignment.create({
    data: {
      taskId: taskActive1.id,
      workerId: worker1.id,
      status: 'in_progress',
      startedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // Started 6 hours ago
      dueAt: new Date(Date.now() + 18 * 60 * 60 * 1000), // Due in 18 hours
    },
  });

  const assignmentActive2 = await prisma.assignment.create({
    data: {
      taskId: taskActive2.id,
      workerId: worker3.id,
      status: 'in_progress',
      startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // Started 12 hours ago
      dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // Due in 12 hours
    },
  });

  // Completed assignments with submissions
  const assignmentCompleted1 = await prisma.assignment.create({
    data: {
      taskId: taskCompleted1.id,
      workerId: worker1.id,
      status: 'completed',
      startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // Started 48 hours ago
      dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Was due 24 hours ago
    },
  });

  const assignmentCompleted2 = await prisma.assignment.create({
    data: {
      taskId: taskCompleted2.id,
      workerId: worker2.id,
      status: 'completed',
      startedAt: new Date(Date.now() - 96 * 60 * 60 * 1000), // Started 96 hours ago
      dueAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // Was due 72 hours ago
    },
  });

  const assignmentCompleted3 = await prisma.assignment.create({
    data: {
      taskId: taskCompleted3.id,
      workerId: worker3.id,
      status: 'completed',
      startedAt: new Date(Date.now() - 144 * 60 * 60 * 1000), // Started 144 hours ago (6 days)
      dueAt: new Date(Date.now() - 120 * 60 * 60 * 1000), // Was due 120 hours ago (5 days)
    },
  });

  // ============================================
  // 9. SUBMISSIONS
  // ============================================
  console.log('📤 Creating submissions...');
  
  const submissionCompleted1 = await prisma.submission.create({
    data: {
      assignmentId: assignmentCompleted1.id,
      payloadUrl: 'https://storage.paytask.com/submissions/competitor-analysis-report.pdf',
      payloadHash: 'sha256:abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
      qaFlags: {
        completeness: 'pass',
        duplicateCheck: 'pass',
        toxicityCheck: 'pass',
        formatCheck: 'pass',
      },
      status: 'accepted',
      submittedAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // Submitted 30 hours ago
    },
  });

  const submissionCompleted2 = await prisma.submission.create({
    data: {
      assignmentId: assignmentCompleted2.id,
      payloadUrl: 'https://storage.paytask.com/submissions/data-validation-results.xlsx',
      payloadHash: 'sha256:def456ghi789jkl012mno345pqr678stu901vwx234yz567abc',
      qaFlags: {
        completeness: 'pass',
        duplicateCheck: 'pass',
        toxicityCheck: 'pass',
        formatCheck: 'pass',
      },
      status: 'accepted',
      submittedAt: new Date(Date.now() - 78 * 60 * 60 * 1000), // Submitted 78 hours ago
    },
  });

  const submissionCompleted3 = await prisma.submission.create({
    data: {
      assignmentId: assignmentCompleted3.id,
      payloadUrl: 'https://storage.paytask.com/submissions/blog-post-remote-work.docx',
      payloadHash: 'sha256:ghi789jkl012mno345pqr678stu901vwx234yz567abc123def',
      qaFlags: {
        completeness: 'pass',
        duplicateCheck: 'pass',
        toxicityCheck: 'pass',
        formatCheck: 'pass',
        wordCount: 1050,
      },
      status: 'accepted',
      submittedAt: new Date(Date.now() - 126 * 60 * 60 * 1000), // Submitted 126 hours ago
    },
  });

  // ============================================
  // 10. REVIEWS
  // ============================================
  console.log('⭐ Creating reviews...');
  
  await prisma.review.create({
    data: {
      submissionId: submissionCompleted1.id,
      reviewerId: client1.id,
      decision: 'approve',
      feedback: 'Excellent work! Very thorough analysis with great insights. Thank you!',
      createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000), // Reviewed 28 hours ago
    },
  });

  await prisma.review.create({
    data: {
      submissionId: submissionCompleted2.id,
      reviewerId: client2.id,
      decision: 'approve',
      feedback: 'Good job. All data validated correctly.',
      createdAt: new Date(Date.now() - 76 * 60 * 60 * 1000), // Reviewed 76 hours ago
    },
  });

  await prisma.review.create({
    data: {
      submissionId: submissionCompleted3.id,
      reviewerId: client3.id,
      decision: 'approve',
      feedback: 'Well-written content. Meets all requirements perfectly.',
      createdAt: new Date(Date.now() - 124 * 60 * 60 * 1000), // Reviewed 124 hours ago
    },
  });

  // ============================================
  // 11. PAYOUTS
  // ============================================
  console.log('💸 Creating payouts...');
  
  await prisma.payout.create({
    data: {
      submissionId: submissionCompleted1.id,
      workerId: worker1.id,
      amountNet: 50.00,
      status: 'paid',
      txHashRelease: '0xpayout1111222233334444555566667777888899990000aaaabbbbccccddddeeee',
      createdAt: new Date(Date.now() - 27 * 60 * 60 * 1000), // Paid 27 hours ago
    },
  });

  await prisma.payout.create({
    data: {
      submissionId: submissionCompleted2.id,
      workerId: worker2.id,
      amountNet: 20.00,
      status: 'paid',
      txHashRelease: '0xpayout2222333344445555666677778888999900001111aaaabbbbccccddddeeee',
      createdAt: new Date(Date.now() - 75 * 60 * 60 * 1000), // Paid 75 hours ago
    },
  });

  await prisma.payout.create({
    data: {
      submissionId: submissionCompleted3.id,
      workerId: worker3.id,
      amountNet: 45.00,
      status: 'paid',
      txHashRelease: '0xpayout3333444455556666777788889999000011112222aaaabbbbccccddddeeee',
      createdAt: new Date(Date.now() - 123 * 60 * 60 * 1000), // Paid 123 hours ago
    },
  });

  // ============================================
  // 12. RATINGS (2-way: Client rates Worker, Worker rates Client)
  // ============================================
  console.log('⭐ Creating ratings...');
  
  // Task 1 ratings
  await prisma.rating.createMany({
    data: [
      {
        fromUserId: client1.id,
        toUserId: worker1.id,
        taskId: taskCompleted1.id,
        score: 5,
        comment: 'Outstanding work! Very professional and thorough.',
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
      },
      {
        fromUserId: worker1.id,
        toUserId: client1.id,
        taskId: taskCompleted1.id,
        score: 5,
        comment: 'Great client! Clear requirements and prompt payment.',
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
      },
    ],
  });

  // Task 2 ratings
  await prisma.rating.createMany({
    data: [
      {
        fromUserId: client2.id,
        toUserId: worker2.id,
        taskId: taskCompleted2.id,
        score: 4,
        comment: 'Good work, completed on time.',
        createdAt: new Date(Date.now() - 74 * 60 * 60 * 1000),
      },
      {
        fromUserId: worker2.id,
        toUserId: client2.id,
        taskId: taskCompleted2.id,
        score: 5,
        comment: 'Easy task with clear instructions.',
        createdAt: new Date(Date.now() - 74 * 60 * 60 * 1000),
      },
    ],
  });

  // Task 3 ratings
  await prisma.rating.createMany({
    data: [
      {
        fromUserId: client3.id,
        toUserId: worker3.id,
        taskId: taskCompleted3.id,
        score: 5,
        comment: 'Excellent writing quality. Will hire again!',
        createdAt: new Date(Date.now() - 122 * 60 * 60 * 1000),
      },
      {
        fromUserId: worker3.id,
        toUserId: client3.id,
        taskId: taskCompleted3.id,
        score: 5,
        comment: 'Professional client with great communication.',
        createdAt: new Date(Date.now() - 122 * 60 * 60 * 1000),
      },
    ],
  });

  // ============================================
  // 13. NOTIFICATIONS
  // ============================================
  console.log('🔔 Creating notifications...');
  
  await prisma.notification.createMany({
    data: [
      // For Worker 1
      {
        toUserId: worker1.id,
        type: 'assignment_reminder',
        content: 'Reminder: Your task "Website Content Review" is due in 18 hours.',
        status: 'sent',
        meta: { taskId: taskActive1.id, assignmentId: assignmentActive1.id },
      },
      {
        toUserId: worker1.id,
        type: 'payout_completed',
        content: 'Payment of $50.00 has been sent to your wallet for task "Research - Competitor Analysis".',
        status: 'read',
        meta: { amount: 50.00, taskId: taskCompleted1.id },
        createdAt: new Date(Date.now() - 27 * 60 * 60 * 1000),
      },
      // For Worker 3
      {
        toUserId: worker3.id,
        type: 'assignment_reminder',
        content: 'Reminder: Your task "Audio Transcription - Interview" is due in 12 hours.',
        status: 'sent',
        meta: { taskId: taskActive2.id, assignmentId: assignmentActive2.id },
      },
      // For Client 1
      {
        toUserId: client1.id,
        type: 'submission_received',
        content: 'Worker has submitted work for task "Website Content Review". Please review.',
        status: 'pending',
        meta: { taskId: taskActive1.id },
      },
      {
        toUserId: client1.id,
        type: 'new_task_interest',
        content: '3 workers have viewed your task "Data Entry - Product Catalog".',
        status: 'sent',
        meta: { taskId: taskOpen1.id, viewCount: 3 },
      },
      // For Client 2
      {
        toUserId: client2.id,
        type: 'review_reminder',
        content: 'Please review the submission for task "Audio Transcription - Interview" within 24 hours to avoid auto-approval.',
        status: 'sent',
        meta: { taskId: taskActive2.id },
      },
    ],
  });

  // ============================================
  // 14. COMMUNICATIONS LOG
  // ============================================
  console.log('💬 Creating communications logs...');
  
  await prisma.commsLog.createMany({
    data: [
      {
        whoId: worker1.id,
        channel: 'email',
        what: 'Sent welcome email after signup',
        when: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        whoId: client1.id,
        channel: 'email',
        what: 'Sent task creation confirmation',
        when: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        whoId: worker1.id,
        channel: 'push',
        what: 'Sent task acceptance notification',
        when: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
      {
        whoId: client1.id,
        channel: 'email',
        what: 'Sent submission received notification',
        when: new Date(Date.now() - 30 * 60 * 60 * 1000),
      },
      {
        whoId: worker1.id,
        channel: 'push',
        what: 'Sent payout completed notification',
        when: new Date(Date.now() - 27 * 60 * 60 * 1000),
      },
    ],
  });



  // ============================================
  // 16. ERROR LOGS (Sample error scenarios)
  // ============================================
  console.log('❌ Creating error logs...');
  
  await prisma.errorLog.createMany({
    data: [
      {
        errorCode: 'WALLET_INSUFFICIENT_BALANCE',
        errorMessage: 'Insufficient wallet balance to fund escrow',
        errorStack: 'Error: Insufficient balance\n    at checkBalance (/api/tasks/fund.ts:45)\n    at fundEscrow (/api/tasks/fund.ts:78)',
        endpoint: '/api/tasks/fund',
        method: 'POST',
        userId: client3.id,
        requestBody: { taskId: 'some-task-id', amount: 100.00 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ipAddress: '192.168.1.100',
        severity: 'warning',
        resolved: true,
        resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        resolvedBy: client3.id,
        notes: 'User added funds and successfully completed transaction',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        errorCode: 'SUBMISSION_UPLOAD_FAILED',
        errorMessage: 'Failed to upload submission file to storage',
        errorStack: 'Error: Network timeout\n    at uploadFile (/api/submissions/upload.ts:23)',
        endpoint: '/api/submissions/create',
        method: 'POST',
        userId: worker2.id,
        requestBody: { assignmentId: 'some-assignment-id' },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        ipAddress: '192.168.1.101',
        severity: 'error',
        resolved: true,
        resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        resolvedBy: worker2.id,
        notes: 'User retried upload successfully',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        errorMessage: 'Too many requests from this IP address',
        endpoint: '/api/tasks/discover',
        method: 'GET',
        userId: worker4.id,
        requestQuery: { category: 'Data Entry', limit: 50 },
        userAgent: 'Python-requests/2.28.0',
        ipAddress: '192.168.1.102',
        severity: 'info',
        resolved: false,
        notes: 'Suspected bot activity, monitoring',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    ],
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n✅ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Users: ${await prisma.user.count()}`);
  console.log(`     • Clients: ${await prisma.user.count({ where: { role: 'client' } })}`);
  console.log(`     • Workers: ${await prisma.user.count({ where: { role: 'worker' } })}`);
  console.log(`   - Wallets: ${await prisma.wallet.count()}`);
  console.log(`   - Sessions: ${await prisma.session.count()}`);
  console.log(`     • Active: ${await prisma.session.count({ where: { isActive: true } })}`);
  console.log(`   - Worker Profiles: ${await prisma.workerProfile.count()}`);
  console.log(`   - Tasks: ${await prisma.task.count()}`);
  console.log(`     • Draft: ${await prisma.task.count({ where: { status: 'draft' } })}`);
  console.log(`     • Open: ${await prisma.task.count({ where: { status: 'open' } })}`);
  console.log(`     • Active: ${await prisma.task.count({ where: { status: 'active' } })}`);
  console.log(`     • Completed: ${await prisma.task.count({ where: { status: 'completed' } })}`);
  console.log(`   - Assignments: ${await prisma.assignment.count()}`);
  console.log(`   - Submissions: ${await prisma.submission.count()}`);
  console.log(`   - Reviews: ${await prisma.review.count()}`);
  console.log(`   - Payouts: ${await prisma.payout.count()}`);
  console.log(`   - Ratings: ${await prisma.rating.count()}`);
  console.log(`   - Notifications: ${await prisma.notification.count()}`);
  console.log(`   - Transactions: ${await prisma.transaction.count()}`);
  console.log(`   - Audit Logs: ${await prisma.auditLog.count()}`);
  console.log(`   - Comms Logs: ${await prisma.commsLog.count()}`);
  console.log(`   - Error Logs: ${await prisma.errorLog.count()}`);
  console.log(`   - System Policies: ${await prisma.systemPolicy.count()}`);
  console.log('\n🎉 Database is ready for testing!\n');

  console.log('📝 Test Credentials (all use password: "password123"):');
  console.log('\n   Clients:');
  console.log('   - client1@paytask.com (Alice)');
  console.log('   - client2@paytask.com (Bob)');
  console.log('   - client3@paytask.com (Charlie)');
  console.log('\n   Workers:');
  console.log('   - worker1@paytask.com (Diana) - High reputation');
  console.log('   - worker2@paytask.com (Eve) - Medium reputation');
  console.log('   - worker3@paytask.com (Frank) - Highest reputation');
  console.log('   - worker4@paytask.com (Grace) - New worker');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
