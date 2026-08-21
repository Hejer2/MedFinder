// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS – allow frontend origin or configured origins
  const frontendUrl = process.env.FRONTEND_URL;
  const allowedOrigins = frontendUrl
    ? [frontendUrl, 'http://localhost:5173', 'http://localhost:3000']
    : true;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Body parser size limits
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '10mb' }));

  // Serve static uploads folder
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Security middlewares - allow cross-origin resource sharing for uploads
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  app.use(cookieParser());
  // NOTE: CSURF removed – it is deprecated and incompatible with SPA + JWT auth.
  // JWT Bearer tokens already protect against CSRF attacks.
  // General API rate limiting (120 req/min per IP)
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
    }),
  );

  // Strict rate limiting on authentication endpoints to prevent brute-force attacks
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  });

  app.use('/auth/login', authLimiter);
  app.use('/auth/register', authLimiter);
  app.use('/auth/forgot-password', authLimiter);
  app.use('/auth/reset-password', authLimiter);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  // Swagger (OpenAPI) UI
  const config = new DocumentBuilder()
    .setTitle('MedFinder API')
    .setDescription('Production‑grade healthcare marketplace API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Enable graceful shutdown hooks for SIGTERM and SIGINT
  app.enableShutdownHooks();

  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);
  console.log(`🚀 [MedFinder API] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`🏥 [Health Probe] Ready at http://localhost:${PORT}/health`);
  console.log(`📚 [Swagger Docs] Available at http://localhost:${PORT}/api/docs`);
}
bootstrap();
