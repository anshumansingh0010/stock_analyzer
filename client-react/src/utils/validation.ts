import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email();

const phoneSchema = z.string().trim().refine((val) => {
  const digitCount = val.replace(/\D/g, '').length;
  if (digitCount < 7 || digitCount > 15) return false;
  return /^(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}$/.test(val);
}, "Invalid phone number format");

const otpSchema = z.string().trim().regex(/^\d{6}$/, "OTP must be exactly 6 digits");

function isValidEmail(email: unknown): boolean {
  return emailSchema.safeParse(email).success;
}

function isValidPhone(phone: unknown): boolean {
  return phoneSchema.safeParse(phone).success;
}

export function isValidOtp(otp: unknown): boolean {
  return otpSchema.safeParse(otp).success;
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
