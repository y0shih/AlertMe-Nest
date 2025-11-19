import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../../entities/report.entity';
import { SosReport } from '../../entities/sos-report.entity';
import { Task } from '../../entities/task.entity';
import { ReportResponse } from '../../entities/report-response.entity';
import { Staff } from '../../entities/staff.entity';
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
		@InjectRepository(ReportResponse)
		private reportResponseRepository: Repository<ReportResponse>,
		@InjectRepository(Staff)
		private staffRepository: Repository<Staff>,
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

		// Increment task_given counter for the assigned staff
		await this.staffRepository.increment({ id: staffUserId }, 'task_given', 1);

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
	 * Add status update with notes and optional image to a report (for Staff role)
	 */
	async addStatusUpdate(reportId: string, taskId: string, staffUserId: string, responseText: string, attachmentPath?: string): Promise<ReportResponse> {
		const task = await this.taskRepository.findOne({
			where: { id: taskId, report_id: reportId, assigned_to: staffUserId },
		});

		if (!task) {
			throw new Error(`Task with ID ${taskId} not found or not assigned to this user`);
		}

		// Create response entry
		const response = this.reportResponseRepository.create({
			report_id: reportId,
			task_id: taskId,
			responded_by: staffUserId,
			response_text: responseText,
			attachment_path: attachmentPath,
		});

		const savedResponse = await this.reportResponseRepository.save(response);

		// Update task status to IN_PROGRESS if not already
		if (task.status === TaskStatus.NOT_RECEIVED) {
			await this.taskRepository.update(taskId, { status: TaskStatus.IN_PROGRESS });
		}

		return savedResponse;
	}

	/**
	 * Mark task as completed (for Staff role)
	 * Note: Only Admin can mark the report as RESOLVED via updateReportStatus
	 */
	async completeTask(reportId: string, taskId: string, staffUserId: string): Promise<Task> {
		const task = await this.taskRepository.findOne({
			where: { id: taskId, report_id: reportId, assigned_to: staffUserId },
		});

		if (!task) {
			throw new Error(`Task with ID ${taskId} not found or not assigned to this user`);
		}

		// Mark task as completed (does NOT resolve the report - Admin does that)
		await this.taskRepository.update(taskId, { status: TaskStatus.COMPLETED });

		// Increment task_completed counter for the staff member
		await this.staffRepository.increment({ id: staffUserId }, 'task_completed', 1);

		const completedTask = await this.taskRepository.findOne({
			where: { id: taskId },
			relations: ['report', 'assignedBy', 'assignedTo'],
		});

		if (!completedTask) {
			throw new Error(`Task with ID ${taskId} not found after update`);
		}

		return completedTask;
	}

	/**
	 * Update task status (for Staff role)
	 */
	async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
		const task = await this.taskRepository.findOne({
			where: { id: taskId },
			relations: ['report', 'assignedBy', 'assignedTo'],
		});
		if (!task) {
			throw new Error(`Task with ID ${taskId} not found`);
		}

		const oldStatus = task.status;
		const newStatus = status;

		// Handle counter updates based on status transitions
		if (task.assigned_to) {
			// Transitioning TO completed
			if (newStatus === TaskStatus.COMPLETED && oldStatus !== TaskStatus.COMPLETED) {
				await this.staffRepository.increment({ id: task.assigned_to }, 'task_completed', 1);
			}
			// Transitioning FROM completed to something else
			else if (oldStatus === TaskStatus.COMPLETED && newStatus !== TaskStatus.COMPLETED) {
				await this.staffRepository.decrement({ id: task.assigned_to }, 'task_completed', 1);
			}
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
