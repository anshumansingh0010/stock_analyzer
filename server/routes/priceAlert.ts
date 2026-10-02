import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PriceAlert } from "../models/PriceAlert.js";

export default async function priceAlertRoutes(fastify: FastifyInstance) {
  
  // Create a new Price Alert
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const { ticker, targetPrice, condition } = request.body as any;
    
    // Auth context (if any, otherwise default to a demo user for now)
    const userId = (request as any).user?.id || "demo-user";
    
    if (!ticker || !targetPrice || !condition) {
      return reply.status(400).send({ error: "Missing required fields (ticker, targetPrice, condition)" });
    }

    try {
      const alert = await PriceAlert.create({
        userId,
        ticker: ticker.toUpperCase(),
        targetPrice: Number(targetPrice),
        condition
      });

      return reply.send({ success: true, alert });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to create price alert", details: err.message });
    }
  });

  // Get active price alerts for the user
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id || "demo-user";
    try {
      const alerts = await PriceAlert.find({ userId, isActive: true }).sort({ createdAt: -1 });
      return reply.send({ success: true, alerts });
    } catch (err: any) {
      return reply.status(500).send({ error: "Failed to fetch price alerts", details: err.message });
    }
  });

  // Delete/Cancel an alert
  fastify.delete("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const userId = (request as any).user?.id || "demo-user";
    
    try {
      const alert = await PriceAlert.findOneAndUpdate(
        { _id: id, userId },
        { isActive: false },
        { new: true }
      );
      if (!alert) {
        return reply.status(404).send({ error: "Alert not found" });
      }
      return reply.send({ success: true, alert });
    } catch (err: any) {
      return reply.status(500).send({ error: "Failed to delete price alert", details: err.message });
    }
  });
}
