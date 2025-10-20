import { PrismaClient, UserRole, KycStatus, WalletType, TaskStatus, EscrowStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Delete existing data (in correct order due to foreign keys)
  await prisma.assignment.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.task.deleteMany();
  await prisma.workerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.wallet.deleteMany();

  console.log('✅ Cleared existing data');

  // Create wallet and client user with nested create
  const clientWallet = await prisma.wallet.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      userId: '550e8400-e29b-41d4-a716-446655440002',
      type: WalletType.custodial,
      walletAddr: '0x1234567890abcdef1234567890abcdef12345678',
      providerRef: 'provider-ref-001',
    },
  });

  const client = await prisma.user.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      role: UserRole.client,
      email: 'client@example.com',
      walletId: clientWallet.id,
      country: 'UK',
      kycStatus: KycStatus.approved,
    },
  });

  // Create wallet and worker user
  const workerWallet = await prisma.wallet.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      userId: '550e8400-e29b-41d4-a716-446655440004',
      type: WalletType.custodial,
      walletAddr: '0xabcdef1234567890abcdef1234567890abcdef12',
      providerRef: 'provider-ref-002',
    },
  });

  const worker = await prisma.user.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      role: UserRole.worker,
      email: 'worker@example.com',
      walletId: workerWallet.id,
      country: 'US',
      kycStatus: KycStatus.approved,
      workerProfile: {
        create: {
          skills: ['transcription', 'data-entry', 'translation'],
          languages: ['en', 'es'],
          availability: { timezone: 'UTC', hours: '9-17' },
          reputation: 4.5,
          completedTasks: 0,
          earlySubmissions: 0,
        },
      },
    },
  });

  // Create wallet and second worker user
  const worker2Wallet = await prisma.wallet.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440005',
      userId: '550e8400-e29b-41d4-a716-446655440006',
      type: WalletType.custodial,
      walletAddr: '0xfedcba0987654321fedcba0987654321fedcba09',
      providerRef: 'provider-ref-003',
    },
  });

  const worker2 = await prisma.user.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440006',
      role: UserRole.worker,
      email: 'worker2@example.com',
      walletId: worker2Wallet.id,
      country: 'Canada',
      kycStatus: KycStatus.approved,
      workerProfile: {
        create: {
          skills: ['data-entry', 'research', 'categorization'],
          languages: ['en', 'fr'],
          availability: { timezone: 'EST', hours: '8-16' },
          reputation: 4.8,
          completedTasks: 15,
          earlySubmissions: 10,
        },
      },
    },
  });

  console.log('✅ Created users and wallets (2 workers, 1 client)');

  // Create tasks with different categories
  const tasks = [
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      clientId: client.id,
      title: 'Transcribe 10-minute audio file',
      description: 'Clear English audio transcription needed. Audio is high quality with minimal background noise.',
      category: 'transcription',
      reward: 15.50,
      qty: 1,
      budget: 17.05,
      deadline: new Date('2025-10-25T10:00:00Z'),
      status: TaskStatus.open,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      clientId: client.id,
      title: 'Data entry from scanned documents',
      description: 'Enter data from 50 scanned invoices into spreadsheet. Must be accurate and complete.',
      category: 'data-entry',
      reward: 25.00,
      qty: 1,
      budget: 27.50,
      deadline: new Date('2025-10-26T15:00:00Z'),
      status: TaskStatus.open,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440012',
      clientId: client.id,
      title: 'Translate English to Spanish document',
      description: 'Professional translation of a 2-page business document from English to Spanish.',
      category: 'translation',
      reward: 30.00,
      qty: 1,
      budget: 33.00,
      deadline: new Date('2025-10-27T12:00:00Z'),
      status: TaskStatus.open,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440013',
      clientId: client.id,
      title: 'Image categorization - 100 images',
      description: 'Categorize 100 product images into predefined categories. Clear guidelines provided.',
      category: 'categorization',
      reward: 20.00,
      qty: 1,
      budget: 22.00,
      deadline: new Date('2025-10-28T16:00:00Z'),
      status: TaskStatus.open,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440014',
      clientId: client.id,
      title: 'Product research - 20 items',
      description: 'Research and compile information about 20 competitor products including pricing and features.',
      category: 'research',
      reward: 40.00,
      qty: 1,
      budget: 44.00,
      deadline: new Date('2025-10-29T10:00:00Z'),
      status: TaskStatus.open,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440015',
      clientId: client.id,
      title: 'Transcribe 30-minute podcast episode',
      description: 'Transcribe a podcast episode with two speakers. Include timestamps every 5 minutes.',
      category: 'transcription',
      reward: 45.00,
      qty: 1,
      budget: 49.50,
      deadline: new Date('2025-10-30T14:00:00Z'),
      status: TaskStatus.open,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440016',
      clientId: client.id,
      title: 'Social media content moderation',
      description: 'Review and moderate 200 social media posts according to community guidelines.',
      category: 'moderation',
      reward: 35.00,
      qty: 1,
      budget: 38.50,
      deadline: new Date('2025-10-31T11:00:00Z'),
      status: TaskStatus.open,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440017',
      clientId: client.id,
      title: 'Email customer support responses',
      description: 'Draft responses to 30 customer support emails. Templates will be provided.',
      category: 'customer-support',
      reward: 28.00,
      qty: 1,
      budget: 30.80,
      deadline: new Date('2025-11-01T09:00:00Z'),
      status: TaskStatus.open,
    },
  ];

  for (const taskData of tasks) {
    const task = await prisma.task.create({
      data: taskData,
    });

    // Create escrow for each task
    await prisma.escrow.create({
      data: {
        taskId: task.id,
        amount: taskData.budget || taskData.reward * 1.1,
        feeRate: 0.10,
        status: EscrowStatus.held,
        txHashHold: `0x${Math.random().toString(16).slice(2, 66)}`,
      },
    });

    console.log(`✅ Created task: ${task.title}`);
  }

  // Create one task that's already assigned (should not appear in discovery)
  const assignedTask = await prisma.task.create({
    data: { 
      id: '550e8400-e29b-41d4-a716-446655440018',
      clientId: client.id,
      title: 'Already assigned task',
      description: 'This task should not appear in worker discovery',
      category: 'test',
      reward: 10.00,
      qty: 1,
      budget: 11.00,
      deadline: new Date('2025-11-02T10:00:00Z'),
      status: TaskStatus.open,
    },
  });

  await prisma.escrow.create({
    data: {
      taskId: assignedTask.id,
      amount: 11.00,
      feeRate: 0.10,
      status: EscrowStatus.held,
      txHashHold: `0x${Math.random().toString(16).slice(2, 66)}`,
    },
  });

  const assignment1 = await prisma.assignment.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440020',
      taskId: assignedTask.id,
      workerId: worker.id,
      startedAt: new Date(),
      dueAt: new Date('2025-11-02T10:00:00Z'),
    },
  });

  console.log('✅ Created assigned task for worker 1');
  console.log(`   Assignment ID: ${assignment1.id}`);

  // Create task specifically for worker 2 (already assigned)
  const worker2Task = await prisma.task.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440019',
      clientId: client.id,
      title: 'Product categorization for e-commerce',
      description: 'Categorize 500 products into appropriate categories. Assigned to experienced worker.',
      category: 'categorization',
      reward: 50.00,
      qty: 1,
      budget: 55.00,
      deadline: new Date('2025-11-05T16:00:00Z'),
      status: TaskStatus.open,
    },
  });

  await prisma.escrow.create({
    data: {
      taskId: worker2Task.id,
      amount: 55.00,
      feeRate: 0.10,
      status: EscrowStatus.held,
      txHashHold: `0x${Math.random().toString(16).slice(2, 66)}`,
    },
  });

  const assignment2 = await prisma.assignment.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440021',
      taskId: worker2Task.id,
      workerId: worker2.id,
      startedAt: new Date(),
      dueAt: new Date('2025-11-05T16:00:00Z'),
    },
  });

  console.log('✅ Created assigned task for worker 2');
  console.log(`   Assignment ID: ${assignment2.id}`);

  console.log('\n🎉 Seeding completed successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Users: 3 (1 client, 2 workers)`);
  console.log(`   - Worker 1: worker@example.com (ID: ${worker.id})`);
  console.log(`   - Worker 2: worker2@example.com (ID: ${worker2.id})`);
  console.log(`   - Tasks: ${tasks.length + 2} total`);
  console.log(`   - Available tasks: ${tasks.length}`);
  console.log(`   - Assigned tasks: 2 (1 for each worker)`);
  console.log(`   - Assignment 1 ID: ${assignment1.id}`);
  console.log(`   - Assignment 2 ID: ${assignment2.id}`);
  console.log(`   - Escrows: ${tasks.length + 2}`);
  console.log(`\n🔍 Test the APIs:`);
  console.log(`   GET http://localhost:3000/api/tasks/discover`);
  console.log(`   GET http://localhost:3000/api/tasks/discover?category=transcription`);
  console.log(`   GET http://localhost:3000/api/tasks/assignments/my-assignments?workerId=${worker.id}`);
  console.log(`   GET http://localhost:3000/api/tasks/assignments/my-assignments?workerId=${worker2.id}`);
  console.log(`\n📝 Test Submission API:`);
  console.log(`   Assignment 1 ID: ${assignment1.id}`);
  console.log(`   Assignment 2 ID: ${assignment2.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
