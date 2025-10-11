import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
// For Vercel we export an Express-compatible handler (req, res).

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
	// Mount Swagger UI at /docs to avoid conflict with Vercel's reserved /api namespace
	SwaggerModule.setup('docs', app, document, {
		swaggerOptions: {
			persistAuthorization: true,
			tagsSorter: 'alpha',
			operationsSorter: 'alpha',
			tryItOutEnabled: true,
			filter: true,
			showRequestDuration: true,
		},
		customSiteTitle: 'AlertMe API',
		customfavIcon: '/favicon.ico',
		customCss: '.swagger-ui .topbar { display: none }',
	});

	// Also expose the raw OpenAPI JSON at /docs-json for tooling and diagnostics
	app.use('/docs-json', (req, res) => {
		res.setHeader('Content-Type', 'application/json');
		res.send(document);
	});

	await app.init();
	const expressApp = app.getHttpAdapter().getInstance();
	// Return the express application instance which is callable as (req, res)
	return expressApp;
}

// Export an Express-compatible handler for Vercel.
export default async function handler(req, res) {
	try {
		// Initialize once and reuse the express app
		const expressApp = server ?? (await bootstrap());
		server = expressApp;
		return expressApp(req, res);
	} catch (err) {
		// If initialization fails, return 500
		console.error('Failed to initialize server', err);
		res.statusCode = 500;
		res.end('Internal Server Error');
	}
}

// Also ensure CommonJS consumers receive the function directly on module.exports.
// Vercel's runtime may load the transpiled CommonJS file and expect module.exports to be
// a function or server instance. Assigning here guarantees compatibility where possible.
try {
	// Cast via `unknown` to avoid using `any` so linting rules are satisfied.
	(module as unknown as { exports?: unknown }).exports = handler;
} catch (_e) {
	// ignore in environments where `module` is not writable
}
