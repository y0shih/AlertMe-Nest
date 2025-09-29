import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../../entities/report.entity';
import { SosReport } from '../../entities/sos-report.entity';
import { ReportStatus } from '../../enums/user-role.enum';
import { CreateReportDto, CreateSosReportDto, ListReportsQueryDto } from '../../dto/reports.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ReportRepository } from './report.repository';

export interface PaginationMetaDto {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface PaginatedReportsResponse {
	data: Report[];
	pagination: PaginationMetaDto;
}

@Injectable()
export class ReportsService {
	constructor(
		@InjectRepository(Report)
		private reportRepository: Repository<Report>,
		@InjectRepository(SosReport)
		private sosReportRepository: Repository<SosReport>,
		private readonly notificationsService: NotificationsService,
		private readonly reportRepo: ReportRepository,
	) {}

	// Existing simple listings kept for backward compatibility
	async findAll(): Promise<Report[]> {
		return this.reportRepository.find({
			relations: ['user', 'tasks', 'responses'],
			order: { created_at: 'DESC' },
		});
	}

	async findById(id: string): Promise<Report | null> {
		return this.reportRepository.findOne({
			where: { id },
			relations: ['user', 'tasks', 'responses'],
		});
	}

	async findByUserId(userId: string): Promise<Report[]> {
		return this.reportRepo.findByUserId(userId);
	}

	async findByStatus(status: ReportStatus): Promise<Report[]> {
		return this.reportRepo.findByStatus(status);
	}

	// New: role-ready listing with pagination and filters
	async listReports(query: ListReportsQueryDto): Promise<PaginatedReportsResponse> {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;

		const qb = this.reportRepository
			.createQueryBuilder('report')
			.leftJoinAndSelect('report.user', 'user')
			.leftJoinAndSelect('report.tasks', 'tasks')
			.leftJoinAndSelect('report.responses', 'responses')
			.orderBy('report.created_at', 'DESC');

		if (query.status !== undefined) {
			qb.andWhere('report.status = :status', { status: query.status });
		}
		if (query.user_id) {
			qb.andWhere('report.user_id = :user_id', { user_id: query.user_id });
		}
		if (query.date_from) {
			qb.andWhere('report.created_at >= :date_from', { date_from: query.date_from });
		}
		if (query.date_to) {
			qb.andWhere('report.created_at <= :date_to', { date_to: query.date_to });
		}

		qb.skip((page - 1) * limit).take(limit);

		const [data, total] = await qb.getManyAndCount();
		const totalPages = Math.max(1, Math.ceil(total / (limit || 1)));

		return {
			data,
			pagination: { page, limit, total, totalPages },
		};
	}

	// New: explicit standard report creation with user context
	async createStandardReport(dto: CreateReportDto, userId: string): Promise<Report> {
		const report = this.reportRepository.create({
			...dto,
			user_id: userId,
			status: ReportStatus.PENDING,
		});
		return this.reportRepository.save(report);
	}

	// New: SOS report creation with priority notifications
	async createSosReport(dto: CreateSosReportDto, userId: string): Promise<SosReport> {
		const sos = this.sosReportRepository.create({
			...dto,
			user_id: userId,
		});
		const saved = await this.sosReportRepository.save(sos);
		await this.notificationsService.notifySos(saved);
		return saved;
	}

	async create(reportData: Partial<Report>): Promise<Report> {
		const report = this.reportRepository.create(reportData);
		return this.reportRepository.save(report);
	}

	async update(id: string, updateData: Partial<Report>): Promise<Report | null> {
		await this.reportRepository.update(id, updateData);
		return this.findById(id);
	}

	async remove(id: string): Promise<void> {
		await this.reportRepository.delete(id);
	}
}
