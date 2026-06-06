import { Redis } from '@upstash/redis';
import { readEnv } from '@/lib/env';
import type { ReviewState } from './types';

const redis = new Redis({
  url: readEnv('UPSTASH_REDIS_REST_URL') || readEnv('KV_REST_API_URL') || '',
  token: readEnv('UPSTASH_REDIS_REST_TOKEN') || readEnv('KV_REST_API_TOKEN') || '',
});
const STATE_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function saveReviewState(state: ReviewState): Promise<void> {
  const key = `cv-review:${state.id}`;
  await redis.set(key, state, { ex: STATE_EXPIRY_SECONDS });
}

export async function getReviewState(id: string): Promise<ReviewState | null> {
  const key = `cv-review:${id}`;
  return await redis.get<ReviewState>(key);
}
