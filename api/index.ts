import server, { setupServer } from "../server/index.js";
import { connectDB } from "../server/db/connection.js";

let appReady = false;

export default async function (req: any, res: any) {
  if (!appReady) {
    await setupServer();
    await connectDB();
    await server.ready();
    appReady = true;
  }
  
  server.server.emit('request', req, res);
}
