import { Redis } from '@upstash/redis';
import type { ReviewState } from './types';

const redis = Redis.fromEnv();
const STATE_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function saveReviewState(jobId: string, state: ReviewState): Promise<void> {
  const key = `cv-review:${jobId}`;
  await redis.set(key, state, { ex: STATE_EXPIRY_SECONDS });
}

export async function getReviewState(jobId: string): Promise<ReviewState | null> {
  const key = `cv-review:${jobId}`;
  return await redis.get<ReviewState>(key);
}
