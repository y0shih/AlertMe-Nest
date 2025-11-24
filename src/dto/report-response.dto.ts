import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateReportResponseDto {
	@ApiProperty({ description: 'Task ID', example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
	@IsUUID(4, { message: 'task_id must be a valid UUID' })
	task_id: string;

	@ApiProperty({ description: 'Response text describing the progress or update', example: 'Work in progress. Arrived at the location.' })
	@IsString({ message: 'response_text must be a string' })
	@Length(1, 2000, { message: 'response_text must be between 1 and 2000 characters' })
	@Transform(({ value }) => value?.trim())
	response_text: string;
}

export class UploadResponseImageDto {
	@ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Image file (JPEG, PNG, GIF, WEBP) - max 10MB' })
	image?: any;
}
