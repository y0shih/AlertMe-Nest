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
import { AlertsGateway } from '../websocket/alerts.gateway';

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
		private readonly alertsGateway: AlertsGateway,
	) {}

	/**
	 * Get a single report by ID with all relations
	 */
	async findById(id: string): Promise<Report | null> {
		return this.reportRepository.findOne({
			where: { id },
			relations: ['user', 'tasks', 'tasks.assignedBy', 'tasks.assignedStaff', 'responses'],
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
	 * List all reports with minimal details (id, name, lat, lng)
	 */
	async listSmallReports(): Promise<Partial<Report>[]> {
		const qb = this.reportRepository
			.createQueryBuilder('report')
			.select(['report.id', 'report.name', 'report.lat', 'report.lng', 'report.status', 'report.created_at', 'report.attachment_paths'])
			.orderBy('report.created_at', 'DESC');
		return qb.getMany();
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
		const saved = await this.reportRepository.save(report);

		// Emit WebSocket event to all admins
		this.alertsGateway.emitNewReport({
			reportId: saved.id,
			name: saved.name,
			lat: saved.lat,
			lng: saved.lng,
			userId: saved.user_id,
			createdAt: saved.created_at,
		});

		return saved;
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

		// Emit WebSocket event to all admins and staff
		this.alertsGateway.emitSosAlert({
			sosId: saved.id,
			name: 'SOS Alert',
			lat: saved.lat,
			lng: saved.lng,
			userId: saved.user_id,
			createdAt: saved.created_at,
		});

		return saved;
	}

	/**
	 * Assign multiple staff to a report and create a task (for Admin role)
	 */
	async assignStaff(reportId: string, staffUserIds: string[], assignedBy: string, taskDetails?: string): Promise<Task> {
		const report = await this.findById(reportId);
		if (!report) {
			throw new Error(`Report with ID ${reportId} not found`);
		}

		// Verify all staff exist
		const staffProfiles = await Promise.all(staffUserIds.map((id) => this.staffRepository.findOne({ where: { id }, relations: ['profile'] })));

		if (staffProfiles.some((staff) => !staff)) {
			throw new Error('One or more staff members not found');
		}

		// Create task
		const task = this.taskRepository.create({
			report_id: reportId,
			assigned_by: assignedBy,
			task_details: taskDetails || `Investigate report: ${report.name}`,
			status: TaskStatus.NOT_RECEIVED,
			assignedStaff: staffProfiles
				.filter((s) => s !== null)
				.map((s) => s.profile)
				.filter((p) => p !== null),
		});

		const savedTask = await this.taskRepository.save(task);

		// Increment task_given counter for all assigned staff
		await Promise.all(staffUserIds.map((staffId) => this.staffRepository.increment({ id: staffId }, 'task_given', 1)));

		// Update report status to IN_PROGRESS if still PENDING
		if (report.status === ReportStatus.PENDING) {
			await this.reportRepository.update(reportId, { status: ReportStatus.IN_PROGRESS });
		}

		// Emit WebSocket event to assigned staff
		this.alertsGateway.emitTaskAssigned({
			taskId: savedTask.id,
			reportId,
			staffIds: staffUserIds,
		});

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

		// Emit WebSocket events for RESOLVED and CLOSED status
		if (status === ReportStatus.RESOLVED || status === ReportStatus.CLOSED) {
			const assignedStaffIds = updatedReport.tasks.flatMap((task) => task.assignedStaff?.map((staff) => staff.id) || []);

			if (status === ReportStatus.RESOLVED) {
				this.alertsGateway.emitReportResolved({
					reportId,
					userId: updatedReport.user_id,
					assignedStaffIds,
				});
			} else if (status === ReportStatus.CLOSED) {
				this.alertsGateway.emitReportClosed({
					reportId,
					userId: updatedReport.user_id,
					assignedStaffIds,
				});
			}
		}

		return updatedReport;
	}

	/**
	 * Get all tasks assigned to a specific staff member (for Staff role)
	 */
	async getAssignedTasks(staffUserId: string): Promise<Task[]> {
		const staff = await this.staffRepository.findOne({
			where: { id: staffUserId },
			relations: ['profile', 'profile.assignedTasks', 'profile.assignedTasks.report', 'profile.assignedTasks.report.user', 'profile.assignedTasks.assignedBy'],
		});

		if (!staff?.profile?.assignedTasks) {
			return [];
		}

		return staff.profile.assignedTasks.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
	}

	/**
	 * Add status update with notes, optional images, and GPS coordinates (for Staff role)
	 * Auto-transitions task from NOT_RECEIVED -> RECEIVED on first update
	 * Auto-transitions task from RECEIVED -> IN_PROGRESS on any subsequent update
	 */
	async addStatusUpdate(
		reportId: string,
		taskId: string,
		staffUserId: string,
		responseText: string,
		attachmentPaths?: string[],
		lat?: number,
		lng?: number,
	): Promise<ReportResponse> {
		const task = await this.taskRepository.findOne({
			where: { id: taskId, report_id: reportId },
			relations: ['assignedStaff'],
		});

		if (!task) {
			throw new Error(`Task with ID ${taskId} not found for this report`);
		}

		// Verify staff is assigned to this task
		const isAssigned = task.assignedStaff.some((staff) => staff.id === staffUserId);
		if (!isAssigned) {
			throw new Error(`Staff member not assigned to this task`);
		}

		// Create response entry
		const response = this.reportResponseRepository.create({
			report_id: reportId,
			task_id: taskId,
			responded_by: staffUserId,
			response_text: responseText,
			attachment_paths: attachmentPaths,
			lat,
			lng,
		});

		const savedResponse = await this.reportResponseRepository.save(response);

		// Emit WebSocket event to report room
		this.alertsGateway.emitReportResponseCreated({
			responseId: savedResponse.id,
			reportId,
			taskId,
			respondedBy: staffUserId,
			responseText,
			attachmentPaths,
			lat,
			lng,
		});

		// Auto-transition task status based on current state
		if (task.status === TaskStatus.NOT_RECEIVED) {
			// First update: NOT_RECEIVED -> RECEIVED (task acknowledged)
			await this.taskRepository.update(taskId, { status: TaskStatus.RECEIVED });
		} else if (task.status === TaskStatus.RECEIVED) {
			// Any subsequent update: RECEIVED -> IN_PROGRESS (work has started)
			await this.taskRepository.update(taskId, { status: TaskStatus.IN_PROGRESS });
		}
		// Once IN_PROGRESS, status remains IN_PROGRESS until explicitly completed

		return savedResponse;
	}

	/**
	 * Mark task as completed (for Staff role)
	 * Note: Only Admin can mark the report as RESOLVED via updateReportStatus
	 */
	async completeTask(reportId: string, taskId: string, staffUserId: string): Promise<Task> {
		const task = await this.taskRepository.findOne({
			where: { id: taskId, report_id: reportId },
			relations: ['assignedStaff'],
		});

		if (!task) {
			throw new Error(`Task with ID ${taskId} not found for this report`);
		}

		// Verify staff is assigned to this task
		const isAssigned = task.assignedStaff.some((staff) => staff.id === staffUserId);
		if (!isAssigned) {
			throw new Error(`Staff member not assigned to this task`);
		}

		// Mark task as completed (does NOT resolve the report - Admin does that)
		await this.taskRepository.update(taskId, { status: TaskStatus.COMPLETED });

		// Increment task_completed counter for all assigned staff members
		await Promise.all(task.assignedStaff.map((staff) => this.staffRepository.increment({ id: staff.id }, 'task_completed', 1)));

		// Emit WebSocket event to admins
		this.alertsGateway.emitTaskCompleted({
			taskId,
			reportId,
			completedBy: staffUserId,
		});

		const completedTask = await this.taskRepository.findOne({
			where: { id: taskId },
			relations: ['report', 'assignedBy', 'assignedStaff'],
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
			relations: ['report', 'assignedBy', 'assignedStaff'],
		});
		if (!task) {
			throw new Error(`Task with ID ${taskId} not found`);
		}

		const oldStatus = task.status;
		const newStatus = status;

		// Handle counter updates based on status transitions for all assigned staff
		if (task.assignedStaff?.length > 0) {
			// Transitioning TO completed
			if (newStatus === TaskStatus.COMPLETED && oldStatus !== TaskStatus.COMPLETED) {
				await Promise.all(task.assignedStaff.map((staff) => this.staffRepository.increment({ id: staff.id }, 'task_completed', 1)));
			}
			// Transitioning FROM completed to something else
			else if (oldStatus === TaskStatus.COMPLETED && newStatus !== TaskStatus.COMPLETED) {
				// Decrement but ensure counter doesn't go below 0
				await Promise.all(
					task.assignedStaff.map(async (staff) => {
						const currentStaff = await this.staffRepository.findOne({ where: { id: staff.id } });
						if (currentStaff && currentStaff.task_completed > 0) {
							await this.staffRepository.decrement({ id: staff.id }, 'task_completed', 1);
						}
					}),
				);
			}
		}

		await this.taskRepository.update(taskId, { status });
		const updatedTask = await this.taskRepository.findOne({
			where: { id: taskId },
			relations: ['report', 'assignedBy', 'assignedStaff'],
		});
		if (!updatedTask) {
			throw new Error(`Task with ID ${taskId} not found after update`);
		}
		return updatedTask;
	}
}
