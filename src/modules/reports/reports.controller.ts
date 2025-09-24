import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Report } from '../../entities/report.entity';
import { ReportStatus } from '../../enums/user-role.enum';
import { CreateReportDto, UpdateReportDto } from '../../dto/reports.dto';

@Controller('reports')
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	@Get()
	async findAll(): Promise<Report[]> {
		return this.reportsService.findAll();
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

	@Post()
	async create(@Body() createReportDto: CreateReportDto): Promise<Report> {
		return this.reportsService.create(createReportDto);
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
