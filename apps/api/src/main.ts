import { createApp } from './create-app';

async function bootstrap() {
  const app = await createApp();

  // Only needed for local dev, where the web app (port 3000) and this API
  // (port 4000) run as separate origins. On Vercel they're deployed together
  // behind one domain, so the serverless entrypoint (api/index.ts) skips this.
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
