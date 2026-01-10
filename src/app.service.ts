import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
	getBasicHealth(): { message: string; status: string; timestamp: string } {
		return {
			message: 'Running',
			status: 'ok',
			timestamp: new Date().toISOString(),
		};
	}

	async getDbHealth(dataSource: DataSource): Promise<{ message: string; dbStatus: string; timestamp: string }> {
		try {
			// Run a few simple SELECT queries to keep the database connection alive
			await Promise.all([dataSource.query('SELECT 1'), dataSource.query('SELECT COUNT(*) FROM "roles"')]);

			return {
				message: 'API is running',
				dbStatus: 'connected',
				timestamp: new Date().toISOString(),
			};
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		} catch (error) {
			return {
				message: 'Repora API is running',
				dbStatus: 'error',
				timestamp: new Date().toISOString(),
			};
		}
	}
}
