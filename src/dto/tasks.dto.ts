import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsOptional, Length, IsNumber, IsArray } from 'class-validator';
import { TaskStatus } from '../enums/user-role.enum';

export class AssignStaffDto {
	@ApiProperty({ description: 'Staff user UUIDs to assign (array)', example: ['staff-uuid-1', 'staff-uuid-2'], type: [String] })
	@IsUUID(4, { each: true, message: 'Each staff_user_id must be a valid UUID' })
	staff_user_ids: string[];

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

export class AddStatusUpdateDto {
	@ApiProperty({ description: 'Task UUID', example: 'task-uuid' })
	@IsUUID(4, { message: 'task_id must be a valid UUID' })
	task_id: string;

	@ApiProperty({ description: 'Staff user UUID', example: 'staff-uuid' })
	@IsUUID(4, { message: 'staff_user_id must be a valid UUID' })
	staff_user_id: string;

	@ApiProperty({ description: 'Status update text', example: 'Inspected the site, confirmed damage. Repairs in progress.' })
	@IsString({ message: 'response_text must be a string' })
	@Length(1, 2000, { message: 'response_text must be between 1 and 2000 characters' })
	response_text: string;

	@ApiPropertyOptional({
		description: 'Optional attachment paths (images)',
		example: ['/uploads/status-updates/image1.jpg', '/uploads/status-updates/image2.jpg'],
		type: [String],
	})
	@IsOptional()
	@IsArray({ message: 'attachment_paths must be an array' })
	@IsString({ each: true, message: 'Each attachment_path must be a string' })
	attachment_paths?: string[];

	@ApiPropertyOptional({ description: 'Latitude coordinate', example: 14.5995 })
	@IsOptional()
	@IsNumber({}, { message: 'lat must be a number' })
	lat?: number;

	@ApiPropertyOptional({ description: 'Longitude coordinate', example: 120.9842 })
	@IsOptional()
	@IsNumber({}, { message: 'lng must be a number' })
	lng?: number;
}

export class CompleteTaskDto {
	@ApiProperty({ description: 'Task UUID', example: 'task-uuid' })
	@IsUUID(4, { message: 'task_id must be a valid UUID' })
	task_id: string;

	@ApiProperty({ description: 'Staff user UUID', example: 'staff-uuid' })
	@IsUUID(4, { message: 'staff_user_id must be a valid UUID' })
	staff_user_id: string;
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

// Response DTOs for GET assigned tasks
export class UserProfileResponseDto {
	@ApiProperty({ description: 'User profile ID', example: 'user-profile-uuid' })
	id: string;

	@ApiProperty({ description: 'Username', example: 'john_doe' })
	username: string;

	@ApiProperty({ description: 'User email address', example: 'john.doe@example.com', nullable: true })
	email: string | null;

	@ApiProperty({ description: 'Phone number', example: '+1234567890', nullable: true })
	phone_number: string | null;

	@ApiProperty({ description: 'Street address', example: '123 Main St', nullable: true })
	address: string | null;

	@ApiProperty({ description: 'City', example: 'New York', nullable: true })
	city: string | null;

	@ApiProperty({ description: 'State or province', example: 'NY', nullable: true })
	state: string | null;

	@ApiProperty({ description: 'Postal code', example: '10001', nullable: true })
	postal_code: string | null;

	@ApiProperty({ description: 'Country', example: 'United States', nullable: true })
	country: string | null;

	@ApiProperty({ description: 'Profile picture URL', example: 'https://example.com/profile.jpg', nullable: true })
	profilepic: string | null;

	@ApiProperty({ description: 'Profile creation timestamp', example: '2024-01-15T10:30:00Z' })
	created_at: Date;

	@ApiProperty({ description: 'Profile last update timestamp', example: '2024-01-15T10:30:00Z' })
	updated_at: Date;
}

export class ReportResponseDto {
	@ApiProperty({ description: 'Report ID', example: 'report-uuid' })
	id: string;

	@ApiProperty({ description: 'Report name/title', example: 'Broken streetlight' })
	name: string;

	@ApiProperty({ description: 'Report details', example: 'The streetlight on Main St is not working' })
	details: string;

	@ApiProperty({ description: 'Report status', example: 'pending' })
	status: string;

	@ApiPropertyOptional({ description: 'Attachment file paths', type: [String] })
	attachment_paths?: string[];

	@ApiProperty({ description: 'Latitude coordinate', example: 14.5995 })
	lat: number;

	@ApiProperty({ description: 'Longitude coordinate', example: 120.9842 })
	lng: number;

	@ApiProperty({ description: 'User profile ID who created the report', example: 'user-profile-uuid' })
	user_id: string;

	@ApiProperty({ description: 'Report creation timestamp', example: '2024-01-15T10:30:00Z' })
	created_at: Date;

	@ApiProperty({ description: 'Report last update timestamp', example: '2024-01-15T10:30:00Z' })
	updated_at: Date;

	@ApiProperty({ description: 'User profile who created the report', type: UserProfileResponseDto })
	user: UserProfileResponseDto;
}

export class AssignedTaskResponseDto {
	@ApiProperty({ description: 'Task ID', example: 'task-uuid' })
	id: string;

	@ApiProperty({ description: 'Report ID', example: 'report-uuid' })
	report_id: string;

	@ApiProperty({ description: 'Admin ID who assigned the task', example: 'admin-uuid' })
	assigned_by: string;

	@ApiPropertyOptional({ description: 'Task details', example: 'Investigate and repair the streetlight' })
	task_details?: string;

	@ApiProperty({ description: 'Task status', enum: TaskStatus, example: TaskStatus.NOT_RECEIVED })
	status: TaskStatus;

	@ApiProperty({ description: 'Task creation timestamp', example: '2024-01-15T10:30:00Z' })
	created_at: Date;

	@ApiProperty({ description: 'Task last update timestamp', example: '2024-01-15T10:30:00Z' })
	updated_at: Date;

	@ApiProperty({ description: 'Report associated with this task', type: ReportResponseDto })
	report: ReportResponseDto;
}
