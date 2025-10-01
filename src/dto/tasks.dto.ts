import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsOptional, Length } from 'class-validator';
import { TaskStatus } from '../enums/user-role.enum';

export class AssignStaffDto {
	@ApiProperty({ description: 'Staff user UUID to assign', example: 'staff-uuid' })
	@IsUUID(4, { message: 'staff_user_id must be a valid UUID' })
	staff_user_id: string;

	@ApiProperty({ description: 'Admin UUID assigning the task', example: 'admin-uuid' })
	@IsUUID(4, { message: 'assigned_by must be a valid UUID' })
	assigned_by: string;

	@ApiPropertyOptional({ description: 'Optional task details', example: 'chay nha' })
	@IsOptional()
	@IsString({ message: 'task_details must be a string' })
	@Length(1, 1000, { message: 'task_details must be between 1 and 1000 characters' })
	task_details?: string;
}

export class UpdateReportStatusDto {
	@ApiProperty({ description: 'New report status', enum: ['pending', 'in_progress', 'reviewed', 'resolved', 'closed'] })
	@IsEnum(['pending', 'in_progress', 'reviewed', 'resolved', 'closed'], { message: 'status must be a valid status' })
	status: string;
}

export class AddNotesDto {
	@ApiProperty({ description: 'Task UUID', example: 'task-uuid' })
	@IsUUID(4, { message: 'task_id must be a valid UUID' })
	task_id: string;

	@ApiProperty({ description: 'Staff user UUID', example: 'staff-uuid' })
	@IsUUID(4, { message: 'user_id must be a valid UUID' })
	user_id: string;

	@ApiProperty({ description: 'Investigation notes', example: 'Inspected the site, confirmed damage to pole base.' })
	@IsString({ message: 'notes must be a string' })
	@Length(1, 2000, { message: 'notes must be between 1 and 2000 characters' })
	notes: string;
}

export class ResolveReportDto {
	@ApiProperty({ description: 'Task UUID', example: 'task-uuid' })
	@IsUUID(4, { message: 'task_id must be a valid UUID' })
	task_id: string;

	@ApiProperty({ description: 'Staff user UUID', example: 'staff-uuid' })
	@IsUUID(4, { message: 'staff_user_id must be a valid UUID' })
	staff_user_id: string;
}

export class UpdateTaskStatusDto {
	@ApiProperty({
		description: 'New task status',
		enum: TaskStatus,
		example: TaskStatus.IN_PROGRESS,
	})
	@IsEnum(TaskStatus, { message: 'status must be a valid TaskStatus' })
	status: TaskStatus;
}
