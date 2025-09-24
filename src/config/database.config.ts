import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => {
	// Get environment variables
	const host = process.env.SUPABASE_DB_HOST;
	const port = parseInt(process.env.SUPABASE_DB_PORT || '5432');
	const username = process.env.SUPABASE_DB_USER;
	const password = process.env.SUPABASE_DB_PASSWORD;
	const database = process.env.SUPABASE_DB_NAME || 'postgres';

	// Validate required fields
	if (!host || !username || !password) {
		throw new Error('Missing required Supabase environment variables');
	}

	return {
		type: 'postgres',
		host,
		port,
		username,
		password,
		database,
		ssl: { rejectUnauthorized: false },
		synchronize: false,
		logging: process.env.NODE_ENV === 'development',
		entities: ['dist/**/*.entity{.ts,.js}'],
		migrations: ['dist/migrations/*{.ts,.js}'],
		autoLoadEntities: true,
	};
});
