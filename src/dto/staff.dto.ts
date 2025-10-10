import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStaffDto {
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsNotEmpty()
	username: string;

	@IsUUID()
	@IsNotEmpty()
	role_id: string;

	@IsString()
	@IsOptional()
	phone_number?: string;

	@IsString()
	@IsOptional()
	address?: string;

	@IsString()
	@IsOptional()
	city?: string;

	@IsString()
	@IsOptional()
	state?: string;

	@IsString()
	@IsOptional()
	postal_code?: string;

	@IsString()
	@IsOptional()
	country?: string;

	@IsString()
	@IsOptional()
	profilepic?: string;
}

export class UpdateStaffDto {
	@IsString()
	@IsOptional()
	name?: string;

	@IsString()
	@IsOptional()
	username?: string;

	@IsString()
	@IsOptional()
	phone_number?: string;

	@IsString()
	@IsOptional()
	address?: string;

	@IsString()
	@IsOptional()
	city?: string;

	@IsString()
	@IsOptional()
	state?: string;

	@IsString()
	@IsOptional()
	postal_code?: string;

	@IsString()
	@IsOptional()
	country?: string;

	@IsString()
	@IsOptional()
	profilepic?: string;
}

export class StaffResponseDto {
	id: string;
	email: string;
	name: string;
	role_id: string;
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
	created_at: Date;
	updated_at: Date;
}
