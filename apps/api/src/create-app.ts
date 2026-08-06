import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Express } from 'express';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { getValidationErrorCode } from './common/validation/validationError';

/**
 * Shared Nest app setup used by both the local dev entrypoint (main.ts) and
 * the Vercel serverless entrypoint (api/index.ts). Passing an `expressInstance`
 * mounts Nest onto it instead of creating a standalone HTTP server, which is
 * what lets the serverless function reuse the same Express instance across
 * invocations of a warm lambda.
 */
export async function createApp(expressInstance?: Express) {
  const app = expressInstance
    ? await NestFactory.create(AppModule, new ExpressAdapter(expressInstance))
    : await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const messages = errors.map(error =>
        Object.values(error.constraints || {}).join(', ')
      );

      return new BadRequestException({
        error: getValidationErrorCode(errors),
        message: messages.join(', '),
      });
    },
  }));

  const config = new DocumentBuilder()
    .setTitle('Group Expense Tracker API')
    .setDescription('API for managing group expenses and user authentication')
    .setVersion('1.0')
    .addCookieAuth('cookie', {
      type: 'apiKey',
      in: 'cookie',
      name: 'sid',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      withCredentials: true,
    },
  });

  return app;
}
