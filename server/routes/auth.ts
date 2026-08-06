import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { validateAndSanitizeIdentifier, isValidOtp } from "../utils/validation.js";

interface SendOtpBody {
  identifier?: string;
}

interface VerifyOtpBody {
  identifier?: string;
  otp?: string;
  name?: string;
}

// In-memory OTP store: identifier -> { code: string, expiresAt: number, lastSentAt: number }
const otpStore = new Map<string, { code: string; expiresAt: number; lastSentAt: number }>();

export default async function authRoutes(fastify: FastifyInstance) {
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

    request.log.info(`[AUTH] Sent OTP ${generatedOtp} to ${cleanId} (type: ${validation.type})`);

    return reply.send({
      success: true,
      message: `OTP sent successfully to ${identifier}`,
      otp: generatedOtp,
      expiresInSeconds: 300,
      idType: validation.type,
    });
  });

  // ─── POST /api/auth/verify-otp ───────────────────────────────────
  fastify.post("/verify-otp", async (request: FastifyRequest<{ Body: VerifyOtpBody }>, reply: FastifyReply) => {
    const { identifier, otp, name } = request.body || {};

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
    const isMasterOtp = cleanOtp === "123456";

    let isValid = false;

    if (isMasterOtp) {
      isValid = true;
    } else if (stored) {
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

    const user = {
      id: `usr_otp_${Date.now()}`,
      name: formattedName,
      email: isEmail ? cleanId : `${cleanId.replace(/[^0-9]/g, '')}@otp.nifty50gpt.ai`,
      phone: !isEmail ? cleanId : undefined,
      handle: `@${formattedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      since: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formattedName)}`,
      provider: isEmail ? "otp" : "phone",
    };

    return reply.send({
      success: true,
      message: "Authentication successful",
      user,
      token: `nifty_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    });
  });
}

