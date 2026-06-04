import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

const windows = new Map<string, { count: number; resetAt: number }>();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const configuredOrigins = (
    config.get<string>('CORS_ORIGINS') ??
    config.get<string>('FRONTEND_URL') ??
    'http://localhost:3000,http://localhost:3001'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.setGlobalPrefix('v1', {
    exclude: [{ path: 'healthz', method: RequestMethod.GET }],
  });
  app.enableCors({
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      if (!origin || configuredOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  });
  app.use((req: { ip?: string; path?: string; method?: string }, res: { status: (code: number) => { json: (body: object) => void }; setHeader: (name: string, value: string) => void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    const now = Date.now();
    const sensitive = req.path?.includes('/auth/login') || req.path?.includes('/auth/register');
    const limit = sensitive ? 10 : req.method === 'GET' ? 240 : 80;
    const key = `${req.ip ?? 'unknown'}:${sensitive ? 'auth' : 'global'}`;
    const current = windows.get(key);
    const row = !current || current.resetAt <= now ? { count: 0, resetAt: now + 60_000 } : current;
    row.count += 1;
    windows.set(key, row);
    if (row.count > limit) {
      res.status(429).json({ statusCode: 429, message: 'Trop de requêtes. Réessayez dans une minute.' });
      return;
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}
bootstrap();
