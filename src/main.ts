import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { config } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet());
  app.use(cookieParser());
  // The admin page, from the same origin, so the session cookie can stay SameSite=Strict.
  app.useStaticAssets(join(__dirname, '..', 'web'));
  // Unknown fields are rejected, so a typo in a field name is a 400, not a silent default.
  // One message per field is enough to fix it.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, stopAtFirstError: true }),
  );
  app.enableShutdownHooks();
  await app.listen(config.port);
  new Logger('Bootstrap').log(`Nox Gatekeeper on http://localhost:${config.port}`);
}

void bootstrap();
