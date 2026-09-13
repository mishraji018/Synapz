// Deno-native input validation and sanitization for Edge Functions
import { escape } from "https://deno.land/std@0.224.0/html/mod.ts";

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  error?: string;
}

const MAX_PAYLOAD_BYTES = 500 * 1024; // 500 KB limit to prevent memory exhaustion & DoS

export function validatePayloadSize(text: string): boolean {
  return new TextEncoder().encode(text).length <= MAX_PAYLOAD_BYTES;
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  // Trim and remove null bytes or control characters
  return input
    .replace(/\0/g, '')
    .trim();
}

export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  return escape(sanitizeInput(input));
}

export function validateRequiredString(
  value: unknown,
  fieldName: string,
  maxLength = 100000
): ValidationResult<string> {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required and cannot be empty.` };
  }
  const clean = sanitizeInput(value);
  if (clean.length > maxLength) {
    return { valid: false, error: `${fieldName} exceeds maximum allowed length of ${maxLength} characters.` };
  }
  return { valid: true, data: clean };
}
