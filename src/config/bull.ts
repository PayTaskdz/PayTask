import Queue from 'bull';
import { config } from './env';

// File processing queue
export const fileProcessingQueue = new Queue('file-processing', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
});

fileProcessingQueue.on('error', (error) => {
  console.error('❌ Bull Queue Error:', error);
});

fileProcessingQueue.on('waiting', (jobId) => {
  console.log(`⏳ Job ${jobId} is waiting`);
});

fileProcessingQueue.on('active', (job) => {
  console.log(`🔄 Job ${job.id} is now active`);
});

fileProcessingQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

fileProcessingQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err);
});

export default fileProcessingQueue;

