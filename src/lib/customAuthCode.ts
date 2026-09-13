// Custom Verification Code Generator & Validator
// Format: First 2 characters = Letters, Mid 2 = Digits, Last 2 = Letter & Digit (e.g. "SK49M7")

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Clean uppercase letters without confusing I, O
const DIGITS = '23456789'; // Clean digits without confusing 0, 1

export function generateCustomAuthCode(): string {
  const l1 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const l2 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const d1 = DIGITS[Math.floor(Math.random() * DIGITS.length)];
  const d2 = DIGITS[Math.floor(Math.random() * DIGITS.length)];
  const l3 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const d3 = DIGITS[Math.floor(Math.random() * DIGITS.length)];

  return `${l1}${l2}${d1}${d2}${l3}${d3}`;
}

export function validateCustomCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const clean = code.trim().toUpperCase();
  // Regex: 2 Letters [A-Z], 2 Digits [0-9], 1 Letter [A-Z], 1 Digit [0-9]
  return /^[A-Z]{2}[0-9]{2}[A-Z][0-9]$/.test(clean);
}
