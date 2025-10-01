import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../../entities/report.entity';
import { SosReport } from '../../entities/sos-report.entity';
import { Task } from '../../entities/task.entity';
import { ReportsService } from './reports.service';
import { ReportsController, SosReportsController } from './reports.controller';
import { TasksController } from './tasks.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
	imports: [TypeOrmModule.forFeature([Report, SosReport, Task]), NotificationsModule],
	controllers: [ReportsController, SosReportsController, TasksController],
	providers: [ReportsService],
	exports: [ReportsService],
})
export class ReportsModule {}
