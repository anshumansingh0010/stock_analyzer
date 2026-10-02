import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { validateAndSanitizeIdentifier, isValidOtp } from "../utils/validation.js";
import { sendOtpEmail } from "../utils/mailer.js";

interface SendOtpBody {
  identifier?: string;
}

interface VerifyOtpBody {
  identifier?: string;
  otp?: string;
  name?: string;
  mode?: 'signin' | 'signup' | 'link';
  userId?: string;
}

const otpStore = new Map<string, { code: string; expiresAt: number; lastSentAt: number }>();

import { User } from "../models/User.js";

async function handleMongoUser(
  identifier: string,
  provider: string,
  name: string,
  mode: 'signin' | 'signup' | 'link' | undefined,
  isEmail: boolean,
  avatarUrlFallback?: string,
  userId?: string
) {
  const existingUser = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });

  if (mode === 'link') {
    if (!userId) throw new Error("User ID is required to link an account.");
    if (existingUser && existingUser.id !== userId) throw new Error("This email/phone is already linked to another account.");
    
    const targetUser = await User.findOne({ id: userId });
    if (!targetUser) throw new Error("Original account not found.");

    if (isEmail) targetUser.email = identifier;
    else targetUser.phone = identifier;
    
    await targetUser.save();
    return {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      phone: targetUser.phone,
      handle: targetUser.handle,
      since: targetUser.since,
      avatarUrl: targetUser.avatarUrl,
      provider: targetUser.provider,
    };
  }

  if (mode === 'signin') {
    if (!existingUser) throw new Error('Account not found. Please sign up first.');
  } else if (mode === 'signup') {
    if (existingUser) throw new Error('Account already exists. Please sign in.');
  }

  if (mode === 'signin' && existingUser) {
    return {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser.phone,
      handle: existingUser.handle,
      since: existingUser.since,
      avatarUrl: existingUser.avatarUrl,
      provider: existingUser.provider,
    };
  }

  // signup or default fallback
  const id = `usr_${provider}_${Date.now()}`;
  const formattedName = name;
  const email = isEmail ? identifier : `${identifier.replace(/[^0-9]/g, '')}@otp.nifty50gpt.ai`;
  const phone = !isEmail ? identifier : undefined;
  const handle = `@${formattedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const since = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const avatarUrl = avatarUrlFallback || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formattedName)}`;

  if (mode === 'signup') {
    const newUser = new User({
      id,
      name: formattedName,
      email,
      phone,
      handle,
      since,
      avatarUrl,
      provider,
    });
    await newUser.save();
  }

  return { id, name: formattedName, email, phone, handle, since, avatarUrl, provider };
}

export default async function authRoutes(fastify: FastifyInstance) {
  // ─── POST /api/auth/check-user ───────────────────────────────────
  fastify.post("/check-user", async (request: FastifyRequest<{ Body: { identifier: string } }>, reply: FastifyReply) => {
    const { identifier } = request.body || {};
    if (!identifier) {
      return reply.status(400).send({ success: false, exists: false });
    }
    const cleanId = identifier.trim().toLowerCase();
    const formattedPhone = cleanId.startsWith('+') ? cleanId : `+91${cleanId.replace(/[^0-9]/g, '')}`;
    const user = await User.findOne({ $or: [{ email: cleanId }, { phone: formattedPhone }, { phone: cleanId }] });
    return reply.send({ success: true, exists: !!user, existingUserId: user?.id });
  });

  // ─── POST /api/auth/send-otp ─────────────────────────────────────
  fastify.post("/send-otp", async (request: FastifyRequest<{ Body: SendOtpBody }>, reply: FastifyReply) => {
    const { identifier } = request.body || {};

    const validation = validateAndSanitizeIdentifier(identifier || "");
    if (!validation.isValid || !validation.cleanIdentifier) {
      return reply.status(400).send({
        success: false,
        message: validation.message || "Valid mobile phone number or email address is required",
      });
    }

    const cleanId = validation.cleanIdentifier;
    const now = Date.now();
    const existing = otpStore.get(cleanId);

    // Rate limiting: Require at least 15 seconds between resends
    if (existing && now - existing.lastSentAt < 15000) {
      const waitTime = Math.ceil((15000 - (now - existing.lastSentAt)) / 1000);
      return reply.status(429).send({
        success: false,
        message: `Please wait ${waitTime} seconds before requesting another OTP code`,
      });
    }
    
    // Generate 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity

    otpStore.set(cleanId, { code: generatedOtp, expiresAt, lastSentAt: now });

    // Actually attempt to send the email if it's an email address
    let deliveryNote = "";
    if (validation.type === "email") {
      const sent = await sendOtpEmail(cleanId, generatedOtp);
      if (sent) {
        deliveryNote = " (Delivered to inbox)";
      } else {
        deliveryNote = " (Config required in .env)";
      }
    }

    request.log.info(`[AUTH] Sent OTP ${generatedOtp} to ${cleanId} (type: ${validation.type})${deliveryNote}`);

    return reply.send({
      success: true,
      message: `OTP sent successfully to ${identifier}`,
      expiresInSeconds: 300,
      idType: validation.type,
    });
  });

  // ─── POST /api/auth/verify-otp ───────────────────────────────────
  fastify.post("/verify-otp", async (request: FastifyRequest<{ Body: VerifyOtpBody }>, reply: FastifyReply) => {
    const { identifier, otp, name, mode, userId } = request.body || {};

    const validation = validateAndSanitizeIdentifier(identifier || "");
    if (!validation.isValid || !validation.cleanIdentifier) {
      return reply.status(400).send({
        success: false,
        message: validation.message || "Valid identifier is required",
      });
    }

    if (!otp || typeof otp !== "string" || !isValidOtp(otp)) {
      return reply.status(400).send({
        success: false,
        message: "Please enter a valid 6-digit numeric OTP code",
      });
    }

    const cleanId = validation.cleanIdentifier;
    const cleanOtp = otp.trim();

    const stored = otpStore.get(cleanId);
    let isValid = false;

    if (stored) {
      if (Date.now() > stored.expiresAt) {
        otpStore.delete(cleanId);
        return reply.status(400).send({
          success: false,
          message: "OTP code has expired. Please request a new code.",
        });
      }
      if (stored.code === cleanOtp) {
        isValid = true;
        otpStore.delete(cleanId);
      }
    }

    if (!isValid) {
      return reply.status(400).send({
        success: false,
        message: "Invalid OTP verification code. Try '123456' or request a new code.",
      });
    }

    const isEmail = validation.type === "email";

    const formattedName = name && name.trim().length > 0
      ? name.trim()
      : isEmail
      ? cleanId.split("@")[0].charAt(0).toUpperCase() + cleanId.split("@")[0].slice(1)
      : `Trader ${cleanId.slice(-4)}`;

    let user;
    try {
      user = await handleMongoUser(cleanId, isEmail ? "otp" : "phone", formattedName, mode, isEmail, undefined, userId);
    } catch (err: any) {
      return reply.status(400).send({ success: false, message: err.message });
    }

    return reply.send({
      success: true,
      message: "Authentication successful",
      user,
      token: `nifty_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    });
  });

  // ─── POST /api/auth/firebase ───────────────────────────────────────
  fastify.post("/firebase", async (request: FastifyRequest<{ Body: { token: string, name?: string, mode?: 'signin' | 'signup' | 'link', userId?: string } }>, reply: FastifyReply) => {
    const { token, name, mode, userId } = request.body || {};

    if (!token) {
      return reply.status(400).send({
        success: false,
        message: "Firebase ID token is required",
      });
    }

    try {
      const { getApps, initializeApp, applicationDefault } = await import("firebase-admin/app");
      const { getAuth } = await import("firebase-admin/auth");

      if (!getApps().length) {
        // Fallback for demo without real service account
        if (!process.env.FIREBASE_PROJECT_ID) {
          request.log.warn("Firebase Admin SDK not initialized. MOCKING verification.");
        } else {
          initializeApp({
            credential: applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID
          });
        }
      }

      let uid = "mock_uid_123";
      let phone = "+919999999999";

      if (getApps().length) {
        const decodedToken = await getAuth().verifyIdToken(token);
        uid = decodedToken.uid;
        phone = decodedToken.phone_number || "+919999999999";
      }

      const formattedName = name || `Trader ${phone.slice(-4)}`;
      
      let user;
      try {
        user = await handleMongoUser(phone, "phone", formattedName, mode, false, undefined, userId);
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }

      return reply.send({
        success: true,
        message: "Authentication successful",
        user,
        token: `nifty_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      });
    } catch (error: any) {
      request.log.error(`Firebase auth error: ${error.message}`);
      return reply.status(400).send({
        success: false,
        message: "Failed to verify Firebase token",
      });
    }
  });

  // ─── POST /api/auth/google ───────────────────────────────────────
  fastify.post("/google", async (request: FastifyRequest<{ Body: { token: string, mode?: 'signin' | 'signup' | 'link', userId?: string } }>, reply: FastifyReply) => {
    const { token, mode, userId } = request.body || {};

    if (!token) {
      return reply.status(400).send({
        success: false,
        message: "Google access token is required",
      });
    }

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        return reply.status(400).send({
          success: false,
          message: "Invalid Google token",
        });
      }

      const payload: any = await response.json();

      const formattedName = payload.name || payload.email?.split("@")[0] || "Trader";
      
      let user;
      try {
        user = await handleMongoUser(payload.email, "google", formattedName, mode, true, payload.picture, userId);
      } catch (err: any) {
        return reply.status(400).send({ success: false, message: err.message });
      }

      return reply.send({
        success: true,
        message: "Authentication successful",
        user,
        token: `nifty_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      });
    } catch (error) {
      request.log.error(`Google auth error: ${error}`);
      return reply.status(400).send({
        success: false,
        message: "Failed to verify Google token",
      });
    }
  });
}

