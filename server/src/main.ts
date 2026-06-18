import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllHttpExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // rawBody is required to verify the Paystack webhook signature.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', '*'),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new AllHttpExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SaniChain v2 API')
    .setDescription(
      'Sanitation service coordination network — jobs, payments, sensors',
    )
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);

  console.log(
    `SaniChain v2 API on http://localhost:${port}/api (docs: /api/docs)`,
  );
}
void bootstrap();
