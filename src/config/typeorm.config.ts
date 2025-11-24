import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

// Get Supabase configuration
const host = process.env.SUPABASE_DB_HOST;
const port = parseInt(process.env.SUPABASE_DB_PORT || '5432');
const username = process.env.SUPABASE_DB_USER;
const password = process.env.SUPABASE_DB_PASSWORD;
const database = process.env.SUPABASE_DB_NAME || 'postgres';

if (!host || !username || !password) {
	throw new Error('Missing required Supabase environment variables');
}

export const AppDataSource = new DataSource({
	type: 'postgres',
	host,
	port,
	username,
	password,
	database,
	ssl: { rejectUnauthorized: false },
	entities: ['src/**/*.entity.ts'],
	migrations: ['src/migrations/*.ts'],
	synchronize: false,
	logging: process.env.NODE_ENV === 'development',
});
