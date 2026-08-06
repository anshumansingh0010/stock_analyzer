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

export interface ServerValidationResult {
  isValid: boolean;
  message?: string;
  type?: 'email' | 'phone';
  cleanIdentifier?: string;
}

export function validateAndSanitizeIdentifier(identifier: string): ServerValidationResult {
  if (!identifier || typeof identifier !== 'string') {
    return {
      isValid: false,
      message: 'Identifier is required',
    };
  }

  const clean = identifier.trim().toLowerCase();

  if (clean.includes('@')) {
    if (!isValidEmail(clean)) {
      return {
        isValid: false,
        message: 'Invalid email address format. Example: user@domain.com',
      };
    }
    return { isValid: true, type: 'email', cleanIdentifier: clean };
  }

  if (!isValidPhone(clean)) {
    return {
      isValid: false,
      message: 'Invalid phone number format. Provide a valid 10-digit number or international phone format.',
    };
  }

  return { isValid: true, type: 'phone', cleanIdentifier: clean };
}
