import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { User } from "../models/User.js";
import { getDBStatus } from "../db/connection.js";

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get("/:userId", async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      if (!getDBStatus().connected) {
        return reply.send({ success: true, user: { id: userId, preferences: {}, chatSessions: [] } });
      }
      const user = await User.findOne({ id: userId });
      if (!user) return reply.status(404).send({ success: false, message: "User not found" });
      return reply.send({ success: true, user });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  });

  fastify.patch("/:userId/preferences", async (request: FastifyRequest<{ Params: { userId: string }, Body: { preferences: any } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      const { preferences } = request.body;
      if (!getDBStatus().connected) {
        return reply.send({ success: true, preferences });
      }
      const user = await User.findOneAndUpdate({ id: userId }, { preferences }, { new: true });
      if (!user) return reply.status(404).send({ success: false, message: "User not found" });
      return reply.send({ success: true, preferences: user.preferences });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  });

  fastify.patch("/:userId/chat-sessions", async (request: FastifyRequest<{ Params: { userId: string }, Body: { chatSessions: any[] } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      const { chatSessions } = request.body;
      if (!getDBStatus().connected) {
        return reply.send({ success: true });
      }
      const user = await User.findOneAndUpdate({ id: userId }, { chatSessions }, { new: true });
      if (!user) return reply.status(404).send({ success: false, message: "User not found" });
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  });

  fastify.delete("/:userId/chat-sessions", async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      if (!getDBStatus().connected) {
        return reply.send({ success: true });
      }
      const user = await User.findOneAndUpdate({ id: userId }, { chatSessions: [] }, { new: true });
      if (!user) return reply.status(404).send({ success: false, message: "User not found" });
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  });
}
