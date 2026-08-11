import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email();

export const phoneSchema = z.string().trim().refine((val) => {
  const digitCount = val.replace(/\D/g, '').length;
  if (digitCount < 7 || digitCount > 15) return false;
  return /^(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}$/.test(val);
}, "Invalid phone number format");

export const otpSchema = z.string().trim().regex(/^\d{6}$/, "OTP must be exactly 6 digits");

export function isValidEmail(email: unknown): boolean {
  return emailSchema.safeParse(email).success;
}

export function isValidPhone(phone: unknown): boolean {
  return phoneSchema.safeParse(phone).success;
}

export function isValidOtp(otp: unknown): boolean {
  return otpSchema.safeParse(otp).success;
}

export interface ServerValidationResult {
  isValid: boolean;
  message?: string;
  type?: 'email' | 'phone';
  cleanIdentifier?: string;
}

export function validateAndSanitizeIdentifier(identifier: unknown): ServerValidationResult {
  if (typeof identifier !== 'string' || !identifier) {
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
