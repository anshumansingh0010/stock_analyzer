import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { sendFeedbackEmail } from "../utils/mailer.js";

interface FeedbackBody {
  feedbackType?: string;
  rating?: number;
  email: string;
  subject: string;
  message: string;
}

export default async function feedbackRoutes(fastify: FastifyInstance) {
  fastify.post("/", async (request: FastifyRequest<{ Body: FeedbackBody }>, reply: FastifyReply) => {
    const { feedbackType, rating, email, subject, message } = request.body || {};

    if (!email || !subject || !message) {
      return reply.status(400).send({
        success: false,
        error: "Missing required fields: email, subject, and message are required."
      });
    }

    const userId = (request as any).user?.id;

    try {
      const result = await sendFeedbackEmail({
        feedbackType: feedbackType || "general",
        rating: typeof rating === "number" ? rating : 5,
        userEmail: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        userId
      });

      if (!result.success) {
        request.log.warn({ msg: "Email delivery failed or SMTP not configured", reason: result.message });
        return reply.send({
          success: true,
          emailSent: false,
          message: "Feedback recorded. Note: SMTP credentials not active on server."
        });
      }

      return reply.send({
        success: true,
        emailSent: true,
        message: "Feedback submitted and notification email delivered."
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: "Internal server error while sending feedback",
        details: err.message
      });
    }
  });
}
