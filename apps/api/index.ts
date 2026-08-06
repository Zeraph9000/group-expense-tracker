import type { IncomingMessage, ServerResponse } from 'http';
import express, { type Express } from 'express';
import { createApp } from './src/create-app';

// Reused across invocations of the same warm lambda instance so we don't
// re-bootstrap Nest (and reconnect Prisma) on every request.
const server: Express = express();
let ready: Promise<void> | null = null;

async function bootstrap() {
  const app = await createApp(server);
  // No app.listen() / enableCors() here: Vercel invokes this handler
  // directly per-request, and the web app is served from the same domain
  // (see vercel.json), so there's no cross-origin request to allow.
  await app.init();
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!ready) ready = bootstrap();
  await ready;
  server(req, res);
}
