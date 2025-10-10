import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Task } from '../../entities/task.entity';
import { Report } from '../../entities/report.entity';
import { ReportResponse } from '../../entities/report-response.entity';
import { UpdateTaskStatusDto, AddStatusUpdateDto, CompleteTaskDto } from '../../dto/tasks.dto';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Tasks (Staff)')
@Controller('tasks')
export class TasksController {
	constructor(private readonly reportsService: ReportsService) {}

	// Staff: Get assigned reports/tasks
	@Get('assigned')
	@ApiOperation({ summary: 'List my assigned reports (Staff)' })
	@ApiQuery({ name: 'staff_user_id', description: 'Staff user UUID', required: true })
	async getAssignedTasks(@Query('staff_user_id') staffUserId: string): Promise<Task[]> {
		// TODO: Extract staffUserId from auth token when auth is implemented
		return this.reportsService.getAssignedTasks(staffUserId);
	}

	// Staff: Add status update with optional image
	@Put(':reportId/status-update')
	@ApiOperation({ summary: 'Add status update with notes and optional image (Staff)' })
	@ApiParam({ name: 'reportId', description: 'Report UUID' })
	async addStatusUpdate(@Param('reportId') reportId: string, @Body() dto: AddStatusUpdateDto): Promise<ReportResponse> {
		// TODO: Extract staff_user_id from auth token when auth is implemented
		return this.reportsService.addStatusUpdate(reportId, dto.task_id, dto.staff_user_id, dto.response_text, dto.attachment_path);
	}

	// Staff: Add investigation notes to a report (deprecated - use status-update instead)
	// @Put(':reportId/notes')
	// @ApiOperation({ summary: '[DEPRECATED] Add/update investigation notes (Staff) - Use /status-update instead' })
	// @ApiParam({ name: 'reportId', description: 'Report UUID' })
	// async addNotes(@Param('reportId') reportId: string, @Body() dto: AddNotesDto): Promise<Task> {
	// 	// TODO: Extract user_id from auth token when auth is implemented
	// 	return this.reportsService.addNotes(reportId, dto.task_id, dto.user_id, dto.notes);
	// }

	// Staff: Mark task as completed (does NOT resolve the report)
	@Put(':reportId/complete')
	@ApiOperation({ summary: 'Mark task as completed - Admin must then resolve the report (Staff)' })
	@ApiParam({ name: 'reportId', description: 'Report UUID' })
	async completeTask(@Param('reportId') reportId: string, @Body() dto: CompleteTaskDto): Promise<Task> {
		// TODO: Extract staff_user_id from auth token when auth is implemented
		return this.reportsService.completeTask(reportId, dto.task_id, dto.staff_user_id);
	}

	// Staff: Resolve report (deprecated - staff should only complete tasks)
	// @Put(':reportId/resolve')
	// @ApiOperation({ summary: '[DEPRECATED] Mark report resolved (Staff) - Use /complete instead, Admin resolves reports' })
	// @ApiParam({ name: 'reportId', description: 'Report UUID' })
	// async resolveReport(@Param('reportId') reportId: string, @Body() dto: ResolveReportDto): Promise<Report> {
	// 	// TODO: Extract staff_user_id from auth token when auth is implemented
	// 	return this.reportsService.resolveReport(reportId, dto.task_id, dto.staff_user_id);
	// }

	// Staff: Update task status
	@Put(':taskId/status')
	@ApiOperation({ summary: 'Update task status (Staff)' })
	@ApiParam({ name: 'taskId', description: 'Task UUID' })
	async updateTaskStatus(@Param('taskId') taskId: string, @Body() dto: UpdateTaskStatusDto): Promise<Task> {
		return this.reportsService.updateTaskStatus(taskId, dto.status);
	}
}
