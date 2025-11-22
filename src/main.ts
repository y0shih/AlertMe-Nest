import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
// For Vercel we export an Express-compatible handler (req, res).

let server: any;

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.enableCors({
		origin: '*',
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
		allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
		credentials: false,
	});

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

	const config = new DocumentBuilder()
		.setTitle('AlertMe API')
		.setDescription('API documentation for AlertMe')
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

	// Get the underlying Express instance so we can mount static routes directly.
	const expressApp = app.getHttpAdapter().getInstance();

	// Expose the raw OpenAPI JSON at /docs-json for tooling and diagnostics
	expressApp.use('/docs-json', (req, res) => {
		res.setHeader('Content-Type', 'application/json');
		res.send(document);
	});

	// Serve a lightweight Swagger UI HTML page at /docs that loads swagger-ui from a CDN
	// This avoids issues with swagger-ui-express + Express 5 compatibility in serverless envs.
	expressApp.get('/docs', (req, res) => {
		res.setHeader('Content-Type', 'text/html');
		res.send(`<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>API Docs</title>
		<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui.css" />
	</head>
	<body>
		<div id="swagger-ui"></div>
		<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
		<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-standalone-preset.js"></script>
		<script>
			window.onload = function() {
				const ui = SwaggerUIBundle({
					url: '/docs-json',
					dom_id: '#swagger-ui',
					presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
					layout: 'StandaloneLayout',
				});
				window.ui = ui;
			};
		</script>
	</body>
</html>`);
	});

	await app.init();
	// Return the express application instance which is callable as (req, res)
	return expressApp;
}

// If this file is executed directly (local development), bootstrap and listen.
// When deployed on Vercel the module will be imported and `require.main !== module`,
// so this block won't run and the exported handler will be used instead.
if (typeof require !== 'undefined' && require.main === module) {
	// Start the app and listen when executed directly (local dev).
	void (async () => {
		try {
			const expressApp = await bootstrap();
			const port = process.env.PORT ? Number(process.env.PORT) : 3000;
			const host = process.env.HOST || 'localhost';
			expressApp.listen(port, () => {
				console.log(`Local Nest server listening at http://${host}:${port}/`);
				console.log(`Swagger UI: http://${host}:${port}/docs`);
				console.log(`OpenAPI JSON: http://${host}:${port}/docs-json`);
			});
		} catch (err) {
			console.error('Failed to start local server', err);
			process.exit(1);
		}
	})();
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
