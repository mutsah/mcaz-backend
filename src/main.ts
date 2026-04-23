import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // set global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // enable CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // enable swagger docs
  const config = new DocumentBuilder()
    .setTitle('MCAZ - Medicines Control Authority of Zimbabwe API')
    .setDescription(
      'API documentation for medicine application capture, review, and tracking',
    )
    .setVersion('1.0')
    .addTag('auth', 'Authentication related endpoints')
    .addTag(
      'drugs',
      'Medicine application capture, review, and tracking endpoints',
    )
    .addTag('users', 'User profile and admin user endpoints')
    .addTag('audit-trail', 'Audit log endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Refresh-JWT',
        description: 'Enter refresh JWT token',
        in: 'header',
      },
      'Refresh-JWT',
    )
    .addServer('http://localhost:3001', 'Local development server')
    .addServer(process.env.RENDER_EXTERNAL_URL ?? '', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle:
      'MCAZ - Medicines Control Authority of Zimbabwe API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { color: #4A90E2}
      `,
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  const appUrl = (await app.getUrl()).replace('://[::1]', '://localhost');
  console.log(`Server running at: ${appUrl}`);
  console.log(`Swagger docs at: ${appUrl}/api/docs`);
}
bootstrap().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});
