import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import { Role } from './entities/role.entity';
import { AuthUser } from './entities/auth-user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { Admin } from './entities/admin.entity';
import { AdminProfile } from './entities/admin-profile.entity';
import { Report } from './entities/report.entity';
import { Task } from './entities/task.entity';
import { ReportResponse } from './entities/report-response.entity';
import { SosReport } from './entities/sos-report.entity';
import { AuthModule } from './modules/auth/auth.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsersModule } from './modules/users/users.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [databaseConfig],
			envFilePath: '.env',
		}),
		TypeOrmModule.forRootAsync({
			useFactory: (configService: ConfigService) => {
				const dbConfig = configService.get('database');
				return {
					...dbConfig,
					entities: [Role, AuthUser, UserProfile, Admin, AdminProfile, Report, Task, ReportResponse, SosReport],
				};
			},
			inject: [ConfigService],
		}),
		TypeOrmModule.forFeature([Role, AuthUser, UserProfile, Admin, AdminProfile, Report, Task, ReportResponse, SosReport]),
		AuthModule,
		ReportsModule,
		UsersModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
