import { Redis } from '@upstash/redis';
import type { ReviewState } from './types';

const redis = Redis.fromEnv();
const STATE_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function saveReviewState(state: ReviewState): Promise<void> {
  const key = `cv-review:${state.id}`;
  await redis.set(key, state, { ex: STATE_EXPIRY_SECONDS });
}

export async function getReviewState(id: string): Promise<ReviewState | null> {
  const key = `cv-review:${id}`;
  return await redis.get<ReviewState>(key);
}
