// In-memory sliding window rate limiter for Edge Functions to prevent AI API cost abuse

interface RateLimitRecord {
  timestamps: number[];
}

const clientIpHistory = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of clientIpHistory.entries()) {
    const validTimestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
    if (validTimestamps.length === 0) {
      clientIpHistory.delete(ip);
    } else {
      record.timestamps = validTimestamps;
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitOptions {
  maxRequests: number; // e.g. 10 requests
  windowSeconds: number; // e.g. 300 seconds (5 min)
}

export function checkRateLimit(
  req: Request,
  options: RateLimitOptions = { maxRequests: 15, windowSeconds: 300 }
): { allowed: boolean; remaining: number; retryAfter: number } {
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    'anonymous-client';

  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  let record = clientIpHistory.get(clientIp);
  if (!record) {
    record = { timestamps: [] };
    clientIpHistory.set(clientIp, record);
  }

  // Filter out timestamps older than the sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= options.maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, retryAfter),
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: options.maxRequests - record.timestamps.length,
    retryAfter: 0,
  };
}
