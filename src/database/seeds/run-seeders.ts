import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { RoleSeeder } from './role.seeder';
import { Role } from '../../entities/role.entity';
import { AuthUser } from '../../entities/auth-user.entity';
import { UserProfile } from '../../entities/user-profile.entity';
import { Admin } from '../../entities/admin.entity';
import { AdminProfile } from '../../entities/admin-profile.entity';
import { Report } from '../../entities/report.entity';
import { Task } from '../../entities/task.entity';
import { ReportResponse } from '../../entities/report-response.entity';
import { SosReport } from '../../entities/sos-report.entity';

// Load environment variables
config();

async function runSeeders() {
	// Create data source manually since we're outside NestJS context
	const dataSource = new DataSource({
		type: 'postgres',
		host: process.env.SUPABASE_DB_HOST,
		port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
		username: process.env.SUPABASE_DB_USER,
		password: process.env.SUPABASE_DB_PASSWORD,
		database: process.env.SUPABASE_DB_NAME || 'postgres',
		ssl: { rejectUnauthorized: false },
		entities: [Role, AuthUser, UserProfile, Admin, AdminProfile, Report, Task, ReportResponse, SosReport],
		synchronize: false,
		logging: true,
	});

	try {
		// Initialize the data source
		await dataSource.initialize();
		console.log('Database connection established');

		// Run seeders
		console.log('Running role seeder...');
		await RoleSeeder.run(dataSource);

		console.log('All seeders completed successfully!');
	} catch (error) {
		console.error('Error running seeders:', error);
		process.exit(1);
	} finally {
		// Close the connection
		await dataSource.destroy();
		console.log('Database connection closed');
		process.exit(0);
	}
}

runSeeders();
