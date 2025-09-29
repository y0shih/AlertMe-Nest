import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Length, IsNumber, Min, Max, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ReportStatus } from '../enums/user-role.enum';

export class CreateReportDto {
	@ApiProperty({ description: 'Report title', example: 'Broken streetlight on 5th Ave' })
	@IsString({ message: 'name must be a string' })
	@Length(3, 200, { message: 'name must be between 3 and 200 characters' })
	@Transform(({ value }) => value?.trim())
	name: string;

	@ApiProperty({ description: 'Detailed description of the issue', example: 'The streetlight has been flickering for two nights.' })
	@IsString({ message: 'details must be a string' })
	@Length(1, 2000, { message: 'details must be between 1 and 2000 characters' })
	details: string;

	@ApiPropertyOptional({ description: 'Optional attachment path', example: '/uploads/report-attachments/abc.jpg' })
	@IsOptional()
	@IsString({ message: 'attachment_path must be a string' })
	attachment_path?: string;

	@ApiProperty({ description: 'Latitude', example: 10.762622, minimum: -90, maximum: 90 })
	@Type(() => Number)
	@IsNumber({}, { message: 'lat must be a number' })
	@Min(-90, { message: 'lat must be ≥ -90' })
	@Max(90, { message: 'lat must be ≤ 90' })
	lat: number;

	@ApiProperty({ description: 'Longitude', example: 106.660172, minimum: -180, maximum: 180 })
	@Type(() => Number)
	@IsNumber({}, { message: 'lng must be a number' })
	@Min(-180, { message: 'lng must be ≥ -180' })
	@Max(180, { message: 'lng must be ≤ 180' })
	lng: number;

	@ApiProperty({ description: 'ID of the reporting user', example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
	@IsUUID(4, { message: 'user_id must be a valid UUID' })
	user_id: string;
}

export class UpdateReportDto {
	@ApiPropertyOptional({ description: 'Report title', example: 'Updated title' })
	@IsOptional()
	@IsString({ message: 'name must be a string' })
	@Length(3, 200, { message: 'name must be between 3 and 200 characters' })
	@Transform(({ value }) => value?.trim())
	name?: string;

	@ApiPropertyOptional({ description: 'Detailed description of the issue' })
	@IsOptional()
	@IsString({ message: 'details must be a string' })
	@Length(1, 2000, { message: 'details must be between 1 and 2000 characters' })
	details?: string;

	@ApiPropertyOptional({ description: 'Report status', enum: ReportStatus })
	@IsOptional()
	@IsEnum(ReportStatus, { message: 'status must be a valid ReportStatus' })
	status?: ReportStatus;

	@ApiPropertyOptional({ description: 'Optional attachment path' })
	@IsOptional()
	@IsString({ message: 'attachment_path must be a string' })
	attachment_path?: string;
}

export class CreateSosReportDto {
	@ApiProperty({ description: 'Latitude', example: 10.762622, minimum: -90, maximum: 90 })
	@Type(() => Number)
	@IsNumber({}, { message: 'lat must be a number' })
	@Min(-90, { message: 'lat must be ≥ -90' })
	@Max(90, { message: 'lat must be ≤ 90' })
	lat: number;

	@ApiProperty({ description: 'Longitude', example: 106.660172, minimum: -180, maximum: 180 })
	@Type(() => Number)
	@IsNumber({}, { message: 'lng must be a number' })
	@Min(-180, { message: 'lng must be ≥ -180' })
	@Max(180, { message: 'lng must be ≤ 180' })
	lng: number;

	@ApiProperty({ description: 'ID of the reporting user', example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
	@IsUUID(4, { message: 'user_id must be a valid UUID' })
	user_id: string;
}

export class ListReportsQueryDto {
	@ApiPropertyOptional({ description: 'Page number', example: 1, default: 1, minimum: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: 'page must be a number' })
	@Min(1, { message: 'page must be at least 1' })
	page?: number = 1;

	@ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20, minimum: 1, maximum: 100 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: 'limit must be a number' })
	@Min(1, { message: 'limit must be at least 1' })
	@Max(100, { message: 'limit must be at most 100' })
	limit?: number = 20;

	@ApiPropertyOptional({ description: 'Filter by status', enum: ReportStatus })
	@IsOptional()
	@IsEnum(ReportStatus, { message: 'status must be a valid ReportStatus' })
	status?: ReportStatus;

	@ApiPropertyOptional({ description: 'Filter from created_at (inclusive)', example: '2024-01-01T00:00:00.000Z', format: 'date-time' })
	@IsOptional()
	@IsDateString({}, { message: 'date_from must be an ISO date-time string' })
	date_from?: string;

	@ApiPropertyOptional({ description: 'Filter to created_at (inclusive)', example: '2024-12-31T23:59:59.999Z', format: 'date-time' })
	@IsOptional()
	@IsDateString({}, { message: 'date_to must be an ISO date-time string' })
	date_to?: string;

	@ApiPropertyOptional({ description: 'Filter by user ID', example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
	@IsOptional()
	@IsUUID(4, { message: 'user_id must be a valid UUID' })
	user_id?: string;
}
