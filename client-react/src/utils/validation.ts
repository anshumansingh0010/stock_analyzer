/**
 * Regex for standard email validation:
 * Allows standard username@domain.extension format (min 2 char TLD).
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Regex for phone number validation:
 * Supports international formats with optional + country code (1-4 digits),
 * optional parentheses, spaces or dashes, and 7 to 14 digits total.
 * Examples: +91 9876543210, +1 (555) 000-1234, 9876543210
 */
export const PHONE_REGEX = /^(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}$/;

/**
 * Regex for 6-digit OTP code validation.
 */
export const OTP_REGEX = /^\d{6}$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.trim();
  const digitCount = clean.replace(/\D/g, '').length;
  if (digitCount < 7 || digitCount > 15) return false;
  return PHONE_REGEX.test(clean);
}

export function isValidOtp(otp: string): boolean {
  if (!otp || typeof otp !== 'string') return false;
  return OTP_REGEX.test(otp.trim());
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  type?: 'email' | 'phone';
}

export function validateIdentifier(identifier: string, method?: 'email' | 'mobile'): ValidationResult {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return {
      isValid: false,
      message: method === 'email' ? 'Please enter your email address' : 'Please enter your mobile phone number',
    };
  }

  const looksLikeEmail = trimmed.includes('@');

  if (method === 'email' || (method === undefined && looksLikeEmail)) {
    if (!isValidEmail(trimmed)) {
      return {
        isValid: false,
        message: 'Please enter a valid email address (e.g. name@example.com)',
        type: 'email',
      };
    }
    return { isValid: true, type: 'email' };
  }

  if (!isValidPhone(trimmed)) {
    return {
      isValid: false,
      message: 'Please enter a valid mobile number (e.g. +91 9876543210 or 10-digit number)',
      type: 'phone',
    };
  }
  return { isValid: true, type: 'phone' };
}
