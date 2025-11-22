import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Task } from '../../entities/task.entity';
import { Report } from '../../entities/report.entity';
import { ReportResponse } from '../../entities/report-response.entity';
import { UpdateTaskStatusDto, AddStatusUpdateDto, CompleteTaskDto } from '../../dto/tasks.dto';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Tasks (Staff)')
@ApiBearerAuth('JWT-auth')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
	constructor(private readonly reportsService: ReportsService) {}

	// Staff: Get assigned reports/tasks
	@Get('assigned')
	@ApiOperation({ summary: 'List my assigned reports (Staff)' })
	@ApiQuery({ name: 'staff_user_id', description: 'Staff user UUID', required: true })
	@Roles('staff', 'admin', 'superadmin')
	async getAssignedTasks(@Query('staff_user_id') staffUserId: string): Promise<Task[]> {
		// TODO: Extract staffUserId from auth token when auth is implemented
		return this.reportsService.getAssignedTasks(staffUserId);
	}

	// Staff: Add status update with optional image
	@Put(':reportId/status-update')
	@ApiOperation({ summary: 'Add status update with notes, optional images, and GPS coordinates (Staff)' })
	@ApiParam({ name: 'reportId', description: 'Report UUID' })
	@Roles('staff', 'admin', 'superadmin')
	async addStatusUpdate(@Param('reportId') reportId: string, @Body() dto: AddStatusUpdateDto): Promise<ReportResponse> {
		// TODO: Extract staff_user_id from auth token when auth is implemented
		return this.reportsService.addStatusUpdate(reportId, dto.task_id, dto.staff_user_id, dto.response_text, dto.attachment_paths, dto.lat, dto.lng);
	}

	// Staff: Mark task as completed (does NOT resolve the report)
	@Put(':reportId/complete')
	@ApiOperation({ summary: 'Mark task as completed - Admin must then resolve the report (Staff)' })
	@ApiParam({ name: 'reportId', description: 'Report UUID' })
	@Roles('staff', 'admin', 'superadmin')
	async completeTask(@Param('reportId') reportId: string, @Body() dto: CompleteTaskDto): Promise<Task> {
		// TODO: Extract staff_user_id from auth token when auth is implemented
		return this.reportsService.completeTask(reportId, dto.task_id, dto.staff_user_id);
	}

	// Staff: Update task status
	@Put(':taskId/status')
	@ApiOperation({ summary: 'Update task status (Staff)' })
	@ApiParam({ name: 'taskId', description: 'Task UUID' })
	@Roles('staff', 'admin', 'superadmin')
	async updateTaskStatus(@Param('taskId') taskId: string, @Body() dto: UpdateTaskStatusDto): Promise<Task> {
		return this.reportsService.updateTaskStatus(taskId, dto.status);
	}
}
