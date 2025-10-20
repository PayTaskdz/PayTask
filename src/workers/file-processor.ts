import sharp from 'sharp';
import { fileProcessingQueue } from '../config/bull';
import { uploadToS3 } from '../config/s3';

// Define job data interface
interface FileProcessingJob {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  submissionId: string;
}

// Process file uploads
fileProcessingQueue.process(async (job) => {
  const { fileBuffer, fileName, mimeType, submissionId } = job.data as FileProcessingJob;

  console.log(`Processing file: ${fileName} for submission: ${submissionId}`);

  let processedBuffer = fileBuffer;

  // Process images with sharp
  if (mimeType.startsWith('image/')) {
    try {
      // Resize and optimize image
      processedBuffer = await sharp(fileBuffer)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      console.log(`✅ Image optimized: ${fileName}`);
    } catch (error) {
      console.error(`❌ Image processing failed: ${fileName}`, error);
      throw error;
    }
  }

  // Upload to S3
  const s3Key = `submissions/${submissionId}/${Date.now()}-${fileName}`;
  const s3Url = await uploadToS3(s3Key, processedBuffer, mimeType);

  console.log(`✅ File uploaded to S3: ${s3Url}`);

  return {
    s3Url,
    s3Key,
    originalSize: fileBuffer.length,
    processedSize: processedBuffer.length,
  };
});

console.log('🔄 File processing worker started');

export default fileProcessingQueue;

