import AWS from 'aws-sdk';
import { config } from './env';
import * as fs from 'fs';
import * as path from 'path';

// Initialize S3 only if enabled
export const s3 = config.aws.enabled ? new AWS.S3({
  region: config.aws.region,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
}) : null;

// Upload to S3 or save locally
export const uploadToS3 = async (
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> => {
  if (config.aws.enabled && s3) {
    // Upload to AWS S3
    const params = {
      Bucket: config.aws.s3BucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  } else {
    // Save to local filesystem (uploads folder)
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, key.replace(/\//g, '_'));
    fs.writeFileSync(filePath, buffer);
    
    // Return local URL
    return `/uploads/${key.replace(/\//g, '_')}`;
  }
};

export default s3;

