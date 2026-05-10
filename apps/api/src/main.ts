import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { UPLOADS_ROOT, ensureUploadDirs } from './common/uploads';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  // Ensure upload directories exist before mounting static assets / accepting uploads.
  ensureUploadDirs();
  app.useStaticAssets(UPLOADS_ROOT, { prefix: '/uploads/' });

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Smart E-Learning API')
    .setDescription('Corporate training LMS — REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('PORT', 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on http://localhost:${port}/api`);
  console.log(`API docs:        http://localhost:${port}/docs`);
  console.log(`Uploads root:    ${UPLOADS_ROOT}`);
}

bootstrap();
