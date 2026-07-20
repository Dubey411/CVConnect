import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { logger } from './logger.js';

const bucket = process.env.AWS_S3_BUCKET;
const client = bucket ? new S3Client({ region: process.env.AWS_REGION || 'us-east-1' }) : null;

/** Stores source files privately when an S3 bucket is configured. */
export async function storeResumeSource(file, userId) {
  if (!client || !bucket) return null;
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120);
  const key = `resumes/${userId}/${Date.now()}-${safeName}`;
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype, ServerSideEncryption: 'AES256' }));
    return `s3://${bucket}/${key}`;
  } catch (err) {
    logger.error({ err, key }, 'S3 source upload failed');
    const error = new Error('Your resume could not be stored securely. Please retry.'); error.status = 503; error.code = 'STORAGE_UNAVAILABLE'; throw error;
  }
}
