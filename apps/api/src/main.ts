// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   await app.listen(process.env.PORT ?? 3000);
// }
// bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  // Load OpenAPI spec from YAML file
  const yamlPath = join(__dirname, '..', 'swagger.yaml');
  const yamlContent = readFileSync(yamlPath, 'utf8');
  const document = load(yamlContent) as OpenAPIObject;

  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

