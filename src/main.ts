import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableShutdownHooks();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  });

  app.use(cookieParser());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('URL Shortener API')
    .setDescription('Backend API for URL shortener with analytics')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document));

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(console.error);
