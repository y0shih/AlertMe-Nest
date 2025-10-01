import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ReportsService, PaginatedReportsResponse } from './reports.service';
import { Report } from '../../entities/report.entity';
import { Task } from '../../entities/task.entity';
import { SosReport } from '../../entities/sos-report.entity';
import { ReportStatus } from '../../enums/user-role.enum';
import { CreateReportDto, CreateSosReportDto, ListReportsQueryDto } from '../../dto/reports.dto';
import { AssignStaffDto, UpdateReportStatusDto } from '../../dto/tasks.dto';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	// Admin: List all reports with filters
	@Get()
	@ApiOperation({ summary: 'List all reports with pagination and filters (Admin)' })
	async list(@Query() query: ListReportsQueryDto): Promise<PaginatedReportsResponse> {
		return this.reportsService.listReports(query);
	}

	// User: Get my submitted reports
	@Get('me')
	@ApiOperation({ summary: "Get current user's submitted reports (User)" })
	async getMyReports(@Query('user_id') userId: string): Promise<Report[]> {
		// TODO: Extract userId from auth token when auth is implemented
		return this.reportsService.findByUserId(userId);
	}

	// Get single report by ID
	@Get(':id')
	@ApiOperation({ summary: 'Get report details by ID' })
	@ApiParam({ name: 'id', description: 'Report UUID' })
	async findById(@Param('id') id: string): Promise<Report> {
		const report = await this.reportsService.findById(id);
		if (!report) {
			throw new Error('Report not found');
		}
		return report;
	}

	// User: Create new report
	@Post()
	@ApiOperation({ summary: 'Submit new report with image upload + GPS + severity (User)' })
	async create(@Body() createReportDto: CreateReportDto): Promise<Report> {
		// TODO: Extract userId from auth token when auth is implemented
		return this.reportsService.createReport(createReportDto, (createReportDto as any).user_id);
	}

	// Admin: Assign staff to report
	@Put(':id/assign')
	@ApiOperation({ summary: 'Assign staff to a report (Admin)' })
	@ApiParam({ name: 'id', description: 'Report UUID' })
	async assignStaff(@Param('id') reportId: string, @Body() dto: AssignStaffDto): Promise<Task> {
		// TODO: Extract assigned_by from auth token when auth is implemented
		return this.reportsService.assignStaff(reportId, dto.staff_user_id, dto.assigned_by, dto.task_details);
	}

	// Admin: Update report status
	@Put(':id/status')
	@ApiOperation({ summary: 'Update report status (Admin)' })
	@ApiParam({ name: 'id', description: 'Report UUID' })
	async updateStatus(@Param('id') reportId: string, @Body() dto: UpdateReportStatusDto): Promise<Report> {
		return this.reportsService.updateReportStatus(reportId, dto.status as ReportStatus);
	}
}

@ApiTags('SOS Reports')
@Controller('sos-reports')
export class SosReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	@Post()
	async createSos(@Body() dto: CreateSosReportDto): Promise<SosReport> {
		return this.reportsService.createSosReport(dto, (dto as any).user_id);
	}
}
