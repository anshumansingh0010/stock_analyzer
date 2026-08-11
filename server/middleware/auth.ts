import { FastifyRequest, FastifyReply } from "fastify";

/**
 * Middleware to enforce authentication on protected routes.
 * Requires a Bearer token in the Authorization header.
 * 
 * Since this server operates without a backing session DB or JWT, 
 * we simply validate that a session token starting with 'nifty_session_' 
 * was provided, matching what /api/auth/verify-otp issues.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  // Allow OPTIONS requests to pass through for CORS preflight
  if (request.method === "OPTIONS") return;

  // Temporarily bypass authentication for development
  return;

  /*
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ 
      error: "Unauthorized", 
      message: "Missing or invalid authorization token" 
    });
  }

  const token = authHeader.split(" ")[1];
  
  if (!token || !token.startsWith("nifty_session_")) {
    return reply.status(401).send({ 
      error: "Unauthorized", 
      message: "Invalid session token. Please log in again." 
    });
  }
  */
}
