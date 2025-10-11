import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { createServer, proxy } from '@vendia/serverless-express';

let server: any;

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.enableCors({
		origin: true,
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
		allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
		credentials: true,
	});

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

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

	await app.init();
	const expressApp = app.getHttpAdapter().getInstance();
	// create a Node http server that can be proxied by the lambda handler
	return createServer(expressApp);
}

export const handler = async (event, context) => {
	server = server ?? (await bootstrap());
	// Use the proxy in PROMISE mode and return its promise which resolves to the lambda response
	const result = proxy(server, event, context, 'PROMISE');
	return result.promise;
};
