import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ReportsService, PaginatedReportsResponse } from './reports.service';
import { Report } from '../../entities/report.entity';
import { SosReport } from '../../entities/sos-report.entity';
import { ReportStatus } from '../../enums/user-role.enum';
import { CreateReportDto, UpdateReportDto, CreateSosReportDto, ListReportsQueryDto } from '../../dto/reports.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	// Public listing with filters (auth temporarily disabled)
	@Get()
	async list(@Query() query: ListReportsQueryDto): Promise<PaginatedReportsResponse> {
		return this.reportsService.listReports(query);
	}

	@Get(':id')
	async findById(@Param('id') id: string): Promise<Report> {
		const report = await this.reportsService.findById(id);
		if (!report) {
			throw new Error('Report not found');
		}
		return report;
	}

	@Get('user/:userId')
	async findByUserId(@Param('userId') userId: string): Promise<Report[]> {
		return this.reportsService.findByUserId(userId);
	}

	@Get('status/:status')
	async findByStatus(@Param('status') status: ReportStatus): Promise<Report[]> {
		return this.reportsService.findByStatus(status);
	}

	// Create standard report using provided user_id (auth temporarily disabled)
	@Post()
	async create(@Body() createReportDto: CreateReportDto): Promise<Report> {
		return this.reportsService.createStandardReport(createReportDto, (createReportDto as any).user_id);
	}

	@Put(':id')
	async update(@Param('id') id: string, @Body() updateReportDto: UpdateReportDto): Promise<Report | null> {
		return this.reportsService.update(id, updateReportDto);
	}

	@Delete(':id')
	async remove(@Param('id') id: string): Promise<void> {
		return this.reportsService.remove(id);
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
