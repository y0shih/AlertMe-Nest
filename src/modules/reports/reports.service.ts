import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../../entities/report.entity';
import { SosReport } from '../../entities/sos-report.entity';
import { Task } from '../../entities/task.entity';
import { ReportStatus, TaskStatus } from '../../enums/user-role.enum';
import { CreateReportDto, CreateSosReportDto, ListReportsQueryDto } from '../../dto/reports.dto';
import { NotificationsService } from '../notifications/notifications.service';

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
		@InjectRepository(Task)
		private taskRepository: Repository<Task>,
		private readonly notificationsService: NotificationsService,
	) {}

	/**
	 * Get a single report by ID with all relations
	 */
	async findById(id: string): Promise<Report | null> {
		return this.reportRepository.findOne({
			where: { id },
			relations: ['user', 'tasks', 'tasks.assignedBy', 'tasks.assignedTo', 'responses'],
		});
	}

	/**
	 * Get all reports for a specific user (for User role)
	 */
	async findByUserId(userId: string): Promise<Report[]> {
		return this.reportRepository.find({
			where: { user_id: userId },
			relations: ['user', 'tasks', 'responses'],
			order: { created_at: 'DESC' },
		});
	}

	/**
	 * Get all reports with a specific status
	 */
	async findByStatus(status: ReportStatus): Promise<Report[]> {
		return this.reportRepository.find({
			where: { status },
			relations: ['user', 'tasks'],
			order: { created_at: 'DESC' },
		});
	}

	/**
	 * List reports with pagination and filters (for Admin role)
	 */
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

	/**
	 * Create a new standard report (for User role)
	 */
	async createReport(dto: CreateReportDto, userId: string): Promise<Report> {
		const report = this.reportRepository.create({
			...dto,
			user_id: userId,
			status: ReportStatus.PENDING,
		});
		return this.reportRepository.save(report);
	}

	/**
	 * Create an SOS report with priority notifications (for User role)
	 */
	async createSosReport(dto: CreateSosReportDto, userId: string): Promise<SosReport> {
		const sos = this.sosReportRepository.create({
			...dto,
			user_id: userId,
		});
		const saved = await this.sosReportRepository.save(sos);
		await this.notificationsService.notifySos(saved);
		return saved;
	}

	/**
	 * Assign staff to a report and create a task (for Admin role)
	 */
	async assignStaff(reportId: string, staffUserId: string, assignedBy: string, taskDetails?: string): Promise<Task> {
		const report = await this.findById(reportId);
		if (!report) {
			throw new Error(`Report with ID ${reportId} not found`);
		}

		// Create task
		const task = this.taskRepository.create({
			report_id: reportId,
			assigned_by: assignedBy,
			assigned_to: staffUserId,
			task_details: taskDetails || `Investigate report: ${report.name}`,
			status: TaskStatus.NOT_RECEIVED,
		});

		const savedTask = await this.taskRepository.save(task);

		// Update report status to IN_PROGRESS if still PENDING
		if (report.status === ReportStatus.PENDING) {
			await this.reportRepository.update(reportId, { status: ReportStatus.IN_PROGRESS });
		}

		return savedTask;
	}

	/**
	 * Update report status (for Admin role)
	 */
	async updateReportStatus(reportId: string, status: ReportStatus): Promise<Report> {
		const report = await this.findById(reportId);
		if (!report) {
			throw new Error(`Report with ID ${reportId} not found`);
		}

		await this.reportRepository.update(reportId, { status });
		const updatedReport = await this.findById(reportId);
		if (!updatedReport) {
			throw new Error(`Report with ID ${reportId} not found after update`);
		}
		return updatedReport;
	}

	/**
	 * Get all tasks assigned to a specific staff member (for Staff role)
	 */
	async getAssignedTasks(staffUserId: string): Promise<Task[]> {
		return this.taskRepository.find({
			where: { assigned_to: staffUserId },
			relations: ['report', 'report.user', 'assignedBy'],
			order: { created_at: 'DESC' },
		});
	}

	/**
	 * Add investigation notes to a report (for Staff role)
	 */
	async addNotes(reportId: string, taskId: string, userId: string, notes: string): Promise<any> {
		const task = await this.taskRepository.findOne({
			where: { id: taskId, report_id: reportId },
		});

		if (!task) {
			throw new Error(`Task with ID ${taskId} for report ${reportId} not found`);
		}

		// Update task details with notes
		const updatedDetails = task.task_details ? `${task.task_details}\n\nNotes: ${notes}` : `Notes: ${notes}`;
		await this.taskRepository.update(taskId, {
			task_details: updatedDetails,
			status: task.status === TaskStatus.NOT_RECEIVED ? TaskStatus.IN_PROGRESS : task.status,
		});

		return this.taskRepository.findOne({ where: { id: taskId } });
	}

	/**
	 * Resolve a report (for Staff role)
	 */
	async resolveReport(reportId: string, taskId: string, staffUserId: string): Promise<Report> {
		const task = await this.taskRepository.findOne({
			where: { id: taskId, report_id: reportId, assigned_to: staffUserId },
		});

		if (!task) {
			throw new Error(`Task with ID ${taskId} not found or not assigned to this user`);
		}

		// Mark task as completed
		await this.taskRepository.update(taskId, { status: TaskStatus.COMPLETED });

		// Update report status to RESOLVED
		await this.reportRepository.update(reportId, { status: ReportStatus.RESOLVED });

		const resolvedReport = await this.findById(reportId);
		if (!resolvedReport) {
			throw new Error(`Report with ID ${reportId} not found after resolution`);
		}
		return resolvedReport;
	}

	/**
	 * Update task status (for Staff role)
	 */
	async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
		const task = await this.taskRepository.findOne({ where: { id: taskId } });
		if (!task) {
			throw new Error(`Task with ID ${taskId} not found`);
		}

		await this.taskRepository.update(taskId, { status });
		const updatedTask = await this.taskRepository.findOne({
			where: { id: taskId },
			relations: ['report', 'assignedBy', 'assignedTo'],
		});
		if (!updatedTask) {
			throw new Error(`Task with ID ${taskId} not found after update`);
		}
		return updatedTask;
	}
}
