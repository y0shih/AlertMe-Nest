import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// Enable CORS for Swagger and API access
	app.enableCors({
		origin: true, // Allow all origins in development
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
		allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
		credentials: true,
	});

	// Global validation pipe for DTO validation
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

	// Swagger configuration
	const config = new DocumentBuilder()
		.setTitle('hello')
		.setDescription('alo alo')
		.setVersion('1.0')
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
		.build();

	// Get the actual port the app will run on
	const port = process.env.PORT ?? 3000;

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document, {
		swaggerOptions: {
			persistAuthorization: true,
			tagsSorter: 'alpha',
			operationsSorter: 'alpha',
			tryItOutEnabled: true,
			filter: true,
			showRequestDuration: true,
		},
		customSiteTitle: 'ERP System API Documentation',
		customfavIcon: '/favicon.ico',
		customCss: '.swagger-ui .topbar { display: none }',
	});

	await app.listen(port);
	console.log(`\n🚀 Application is running on: http://localhost:${port}`);
	console.log(`📚 Swagger documentation available at: http://localhost:${port}/api`);
	console.log(`🗄️ Database connected successfully\n`);
}
bootstrap();
