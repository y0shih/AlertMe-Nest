import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID, IsOptional, Length, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateUserDto {
	@ApiProperty({
		description: 'User email address',
		example: 'john.doe@example.com',
		format: 'email',
	})
	@IsEmail({}, { message: 'Please provide a valid email address' })
	email: string;

	@ApiProperty({
		description: 'Unique username for the user',
		example: 'john_doe',
		minLength: 3,
		maxLength: 50,
	})
	@IsString({ message: 'Username must be a string' })
	@Length(3, 50, { message: 'Username must be between 3 and 50 characters' })
	username: string;

	@ApiProperty({
		description: 'Role ID for the user',
		example: 'role-uuid',
		format: 'uuid',
	})
	@IsUUID(4, { message: 'Role ID must be a valid UUID' })
	role_id: string;
}

export class UpdateUserDto {
	@ApiPropertyOptional({
		description: 'Updated username for the user',
		example: 'john_doe_updated',
		minLength: 3,
		maxLength: 50,
	})
	@IsOptional()
	@IsString({ message: 'Username must be a string' })
	@Length(3, 50, { message: 'Username must be between 3 and 50 characters' })
	username?: string;

	@ApiPropertyOptional({
		description: 'Updated role ID for the user',
		example: 'role-uuid',
		format: 'uuid',
	})
	@IsOptional()
	@IsUUID(4, { message: 'Role ID must be a valid UUID' })
	role_id?: string;
}

export class UserQueryDto {
	@ApiPropertyOptional({
		description: 'Page number for pagination',
		example: 1,
		minimum: 1,
		default: 1,
	})
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: 'Page must be a number' })
	@Min(1, { message: 'Page must be at least 1' })
	page?: number = 1;

	@ApiPropertyOptional({
		description: 'Number of items per page',
		example: 10,
		minimum: 1,
		maximum: 100,
		default: 10,
	})
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: 'Limit must be a number' })
	@Min(1, { message: 'Limit must be at least 1' })
	@Max(100, { message: 'Limit cannot exceed 100' })
	limit?: number = 10;

	@ApiPropertyOptional({
		description: 'Search term for username or email',
		example: 'john',
		maxLength: 100,
	})
	@IsOptional()
	@IsString({ message: 'Search term must be a string' })
	@Length(1, 100, { message: 'Search term must be between 1 and 100 characters' })
	@Transform(({ value }) => value?.trim())
	search?: string;

	@ApiPropertyOptional({
		description: 'Filter by user role',
		example: 'user',
		enum: ['user', 'staff', 'admin', 'superadmin'],
	})
	@IsOptional()
	@IsEnum(['user', 'staff', 'admin', 'superadmin'], {
		message: 'Role must be one of: user, staff, admin, superadmin',
	})
	role?: string;
}

export class RoleResponseDto {
	@ApiProperty({
		description: 'Role ID',
		example: 'role-uuid',
		format: 'uuid',
	})
	id: string;

	@ApiProperty({
		description: 'Role name',
		example: 'user',
		enum: ['user', 'staff', 'admin', 'superadmin'],
	})
	name: string;
}

export class UserResponseDto {
	@ApiProperty({
		description: 'User ID',
		example: 'user-uuid',
		format: 'uuid',
	})
	id: string;

	@ApiProperty({
		description: 'User email address',
		example: 'john.doe@example.com',
		format: 'email',
	})
	email: string;

	@ApiProperty({
		description: 'Username',
		example: 'john_doe',
	})
	username: string;

	@ApiProperty({
		description: 'User role information',
		type: RoleResponseDto,
	})
	role: RoleResponseDto;

	@ApiProperty({
		description: 'User creation timestamp',
		example: '2024-01-15T10:30:00Z',
		format: 'date-time',
	})
	created_at: Date;

	@ApiProperty({
		description: 'User last update timestamp',
		example: '2024-01-15T10:30:00Z',
		format: 'date-time',
	})
	updated_at: Date;
}

export class PaginationMetaDto {
	@ApiProperty({
		description: 'Current page number',
		example: 1,
	})
	page: number;

	@ApiProperty({
		description: 'Number of items per page',
		example: 10,
	})
	limit: number;

	@ApiProperty({
		description: 'Total number of items',
		example: 50,
	})
	total: number;

	@ApiProperty({
		description: 'Total number of pages',
		example: 5,
	})
	totalPages: number;
}

export class PaginatedUserResponse {
	@ApiProperty({
		description: 'Array of user data',
		type: [UserResponseDto],
	})
	data: UserResponseDto[];

	@ApiProperty({
		description: 'Pagination metadata',
		type: PaginationMetaDto,
	})
	pagination: PaginationMetaDto;
}

export class UserSearchDto {
	@ApiPropertyOptional({
		description: 'Search by username',
		example: 'john_doe',
		maxLength: 50,
	})
	@IsOptional()
	@IsString({ message: 'Username must be a string' })
	@Length(1, 50, { message: 'Username must be between 1 and 50 characters' })
	@Transform(({ value }) => value?.trim())
	username?: string;

	@ApiPropertyOptional({
		description: 'Search by email',
		example: 'john.doe@example.com',
		format: 'email',
	})
	@IsOptional()
	@IsEmail({}, { message: 'Please provide a valid email address' })
	email?: string;

	@ApiPropertyOptional({
		description: 'Filter by role',
		example: 'user',
		enum: ['user', 'staff', 'admin', 'superadmin'],
	})
	@IsOptional()
	@IsEnum(['user', 'staff', 'admin', 'superadmin'], {
		message: 'Role must be one of: user, staff, admin, superadmin',
	})
	role?: string;
}
