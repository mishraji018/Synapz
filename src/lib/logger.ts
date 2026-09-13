// Security event logger with automatic sensitive data redaction

export type SecurityEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOCKOUT_TRIGGERED'
  | 'AUTH_SIGNUP_ATTEMPT'
  | 'API_RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_PAYLOAD_BLOCKED'
  | 'NETWORK_SECURITY_ERROR';

interface SecurityEvent {
  type: SecurityEventType;
  details?: Record<string, any>;
  timestamp?: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'api_key',
  'apikey',
  'authorization',
  'session',
]);

function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const redacted: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      redacted[key] = redactSensitiveData(val);
    } else {
      redacted[key] = val;
    }
  }
  return redacted;
}

export function logSecurityEvent(event: SecurityEvent) {
  const timestamp = event.timestamp || new Date().toISOString();
  const safeDetails = event.details ? redactSensitiveData(event.details) : {};

  const payload = {
    eventType: event.type,
    timestamp,
    ...safeDetails,
  };

  if (import.meta.env.DEV) {
    console.info(`[SECURITY AUDIT - ${event.type}]`, payload);
  } else {
    // In production, log warning/info without leaking sensitive variables
    if (event.type.includes('FAILED') || event.type.includes('LOCKOUT') || event.type.includes('BLOCKED')) {
      console.warn(`[SECURITY ALERT]`, JSON.stringify(payload));
    }
  }
}
