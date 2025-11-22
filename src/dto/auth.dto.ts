import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
	@ApiProperty({ example: 'user@example.com' })
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@ApiProperty({ example: 'SecurePass123!' })
	@IsString()
	@MinLength(6)
	@IsNotEmpty()
	password: string;

	@ApiProperty({ example: 'johndoe' })
	@IsString()
	@IsNotEmpty()
	username: string;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	phone_number?: string;
}

export class SignInDto {
	@ApiProperty({ example: 'user@example.com' })
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@ApiProperty({ example: 'SecurePass123!' })
	@IsString()
	@IsNotEmpty()
	password: string;
}

export class SignInAdminDto {
	@ApiProperty({ example: 'admin@example.com' })
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@ApiProperty({ example: 'SecurePass123!' })
	@IsString()
	@IsNotEmpty()
	password: string;
}
export class RefreshTokenDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	refresh_token: string;
}

export class OAuthProviderDto {
	@ApiProperty({
		enum: ['google', 'github', 'facebook', 'twitter'],
		example: 'google',
	})
	@IsEnum(['google', 'github', 'facebook', 'twitter'])
	@IsNotEmpty()
	provider: 'google' | 'github' | 'facebook' | 'twitter';

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	redirectTo?: string;
}

export class OAuthCallbackDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	code: string;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	state?: string;
}

export class ResetPasswordRequestDto {
	@ApiProperty({ example: 'user@example.com' })
	@IsEmail()
	@IsNotEmpty()
	email: string;
}

export class ResetPasswordDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	access_token: string;

	@ApiProperty()
	@IsString()
	@MinLength(6)
	@IsNotEmpty()
	new_password: string;
}

export class UpdatePasswordDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	current_password: string;

	@ApiProperty()
	@IsString()
	@MinLength(6)
	@IsNotEmpty()
	new_password: string;
}

export class RegisterStaffDto {
	@ApiProperty({ example: 'staff@example.com', description: 'Staff email address' })
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@ApiProperty({ example: 'SecurePass123!', description: 'Password for staff account (min 6 characters)' })
	@IsString()
	@MinLength(6)
	@IsNotEmpty()
	password: string;

	@ApiProperty({ example: 'staffuser', description: 'Unique username for staff member' })
	@IsString()
	@IsNotEmpty()
	username: string;

	@ApiProperty({ example: 'John Doe', description: 'Full name of staff member' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ required: false, example: '+1234567890', description: 'Contact phone number' })
	@IsString()
	@IsOptional()
	phone_number?: string;

	@ApiProperty({ required: false, example: '123 Main Street', description: 'Street address' })
	@IsString()
	@IsOptional()
	address?: string;

	@ApiProperty({ required: false, example: 'New York', description: 'City' })
	@IsString()
	@IsOptional()
	city?: string;

	@ApiProperty({ required: false, example: 'NY', description: 'State or province' })
	@IsString()
	@IsOptional()
	state?: string;

	@ApiProperty({ required: false, example: '10001', description: 'Postal/ZIP code' })
	@IsString()
	@IsOptional()
	postal_code?: string;

	@ApiProperty({ required: false, example: 'USA', description: 'Country' })
	@IsString()
	@IsOptional()
	country?: string;

	@ApiProperty({ required: false, example: 'https://example.com/avatar.jpg', description: 'Profile picture URL' })
	@IsString()
	@IsOptional()
	profilepic?: string;
}

export class ResendVerificationEmailDto {
	@ApiProperty({ example: 'user@example.com' })
	@IsEmail()
	@IsNotEmpty()
	email: string;
}
