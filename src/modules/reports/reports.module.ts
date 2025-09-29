import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../../entities/report.entity';
import { SosReport } from '../../entities/sos-report.entity';
import { ReportsService } from './reports.service';
import { ReportsController, SosReportsController } from './reports.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReportRepository } from './report.repository';

@Module({
	imports: [TypeOrmModule.forFeature([Report, SosReport]), NotificationsModule],
	controllers: [ReportsController, SosReportsController],
	providers: [ReportsService, ReportRepository],
	exports: [ReportsService, ReportRepository],
})
export class ReportsModule {}
