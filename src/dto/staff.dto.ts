import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStaffDto {
	@ApiProperty({ description: 'Staff member email address', example: 'john.doe@example.com' })
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@ApiProperty({ description: 'Full name of the staff member', example: 'John Doe' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ description: 'Unique username for the staff member', example: 'johndoe' })
	@IsString()
	@IsNotEmpty()
	username: string;

	@ApiProperty({ description: 'Role UUID (STAFF/ADMIN/SUPERADMIN)', example: '123e4567-e89b-12d3-a456-426614174000' })
	@IsUUID()
	@IsNotEmpty()
	role_id: string;

	@ApiPropertyOptional({ description: 'Contact phone number', example: '+1234567890' })
	@IsString()
	@IsOptional()
	phone_number?: string;

	@ApiPropertyOptional({ description: 'Street address', example: '123 Main St' })
	@IsString()
	@IsOptional()
	address?: string;

	@ApiPropertyOptional({ description: 'City name', example: 'New York' })
	@IsString()
	@IsOptional()
	city?: string;

	@ApiPropertyOptional({ description: 'State or province', example: 'NY' })
	@IsString()
	@IsOptional()
	state?: string;

	@ApiPropertyOptional({ description: 'Postal/ZIP code', example: '10001' })
	@IsString()
	@IsOptional()
	postal_code?: string;

	@ApiPropertyOptional({ description: 'Country name', example: 'United States' })
	@IsString()
	@IsOptional()
	country?: string;

	@ApiPropertyOptional({ description: 'Profile picture URL or path', example: '/uploads/profile-pic.jpg' })
	@IsString()
	@IsOptional()
	profilepic?: string;
}

export class UpdateStaffDto {
	@ApiPropertyOptional({ description: 'Full name of the staff member', example: 'John Doe' })
	@IsString()
	@IsOptional()
	name?: string;

	@ApiPropertyOptional({ description: 'Unique username for the staff member', example: 'johndoe' })
	@IsString()
	@IsOptional()
	username?: string;

	@ApiPropertyOptional({ description: 'Contact phone number', example: '+1234567890' })
	@IsString()
	@IsOptional()
	phone_number?: string;

	@ApiPropertyOptional({ description: 'Street address', example: '123 Main St' })
	@IsString()
	@IsOptional()
	address?: string;

	@ApiPropertyOptional({ description: 'City name', example: 'New York' })
	@IsString()
	@IsOptional()
	city?: string;

	@ApiPropertyOptional({ description: 'State or province', example: 'NY' })
	@IsString()
	@IsOptional()
	state?: string;

	@ApiPropertyOptional({ description: 'Postal/ZIP code', example: '10001' })
	@IsString()
	@IsOptional()
	postal_code?: string;

	@ApiPropertyOptional({ description: 'Country name', example: 'United States' })
	@IsString()
	@IsOptional()
	country?: string;

	@ApiPropertyOptional({ description: 'Profile picture URL or path', example: '/uploads/profile-pic.jpg' })
	@IsString()
	@IsOptional()
	profilepic?: string;
}

export class StaffResponseDto {
	@ApiProperty({ description: 'Staff member UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
	id: string;

	@ApiProperty({ description: 'Staff member email address', example: 'john.doe@example.com' })
	email: string;

	@ApiProperty({ description: 'Full name of the staff member', example: 'John Doe' })
	name: string;

	@ApiProperty({ description: 'Role UUID', example: '123e4567-e89b-12d3-a456-426614174001' })
	role_id: string;

	@ApiProperty({ description: 'Is new user flag', example: true })
	is_new_user: boolean;

	@ApiProperty({
		description: 'Staff member profile information',
		example: {
			id: '123e4567-e89b-12d3-a456-426614174000',
			username: 'johndoe',
			phone_number: '+1234567890',
			address: '123 Main St',
			city: 'New York',
			state: 'NY',
			postal_code: '10001',
			country: 'United States',
			profilepic: '/uploads/profile-pic.jpg',
		},
	})
	profile: {
		id: string;
		username: string;
		phone_number?: string;
		address?: string;
		city?: string;
		state?: string;
		postal_code?: string;
		country?: string;
		profilepic?: string;
	};

	@ApiProperty({ description: 'Timestamp when the staff member was created', example: '2025-10-10T12:00:00Z' })
	created_at: Date;

	@ApiProperty({ description: 'Timestamp when the staff member was last updated', example: '2025-10-10T12:00:00Z' })
	updated_at: Date;
}
