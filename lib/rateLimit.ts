import { Redis } from "@upstash/redis";

type Plan = "free" | "pro" | "enterprise";

interface RateLimitState {
  requestCount: number;
  resetTime: number;
}

interface RateLimitInput {
  key: string;
  limit: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  requestCount: number;
  remaining: number;
  resetTime: number;
}

const hasRedisEnv =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedisEnv
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    })
  : null;

const memoryStore = new Map<string, RateLimitState>();

function nowMs() {
  return Date.now();
}

async function getState(key: string): Promise<RateLimitState | null> {
  if (redis) {
    const data = await redis.get<RateLimitState>(key);
    return data ?? null;
  }

  const data = memoryStore.get(key) ?? null;
  if (data && data.resetTime <= nowMs()) {
    memoryStore.delete(key);
    return null;
  }
  return data;
}

async function setState(key: string, state: RateLimitState, windowSeconds: number): Promise<void> {
  if (redis) {
    const ttlSeconds = Math.max(1, Math.ceil((state.resetTime - nowMs()) / 1000));
    await redis.set(key, state, { ex: Math.min(windowSeconds, ttlSeconds) });
    return;
  }

  memoryStore.set(key, state);
}

export async function incrementRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = input;
  const now = nowMs();
  const windowMs = windowSeconds * 1000;
  const current = await getState(key);

  if (!current || current.resetTime <= now) {
    const nextState: RateLimitState = {
      requestCount: 1,
      resetTime: now + windowMs,
    };
    await setState(key, nextState, windowSeconds);
    return {
      allowed: true,
      requestCount: 1,
      remaining: Math.max(0, limit - 1),
      resetTime: nextState.resetTime,
    };
  }

  const nextCount = current.requestCount + 1;
  const nextState: RateLimitState = {
    requestCount: nextCount,
    resetTime: current.resetTime,
  };
  await setState(key, nextState, windowSeconds);

  return {
    allowed: nextCount <= limit,
    requestCount: nextCount,
    remaining: Math.max(0, limit - nextCount),
    resetTime: nextState.resetTime,
  };
}

export function getPlanRequestLimit(plan: string, freeLimit: number, proLimit: number): number {
  const normalized = (plan || "free") as Plan;
  if (normalized === "pro" || normalized === "enterprise") {
    return proLimit;
  }
  return freeLimit;
}

export function extractClientIp(forwardedHeader: string | null | undefined, fallback = "unknown"): string {
  if (!forwardedHeader) return fallback;
  const first = forwardedHeader.split(",")[0]?.trim();
  return first || fallback;
}