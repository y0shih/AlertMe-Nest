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

export class VerifyEmailDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	token: string;

	@ApiProperty()
	@IsEmail()
	@IsNotEmpty()
	email: string;
}

export class RegisterStaffDto {
	@ApiProperty({ example: 'staff@example.com' })
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@ApiProperty({ example: 'SecurePass123!' })
	@IsString()
	@MinLength(6)
	@IsNotEmpty()
	password: string;

	@ApiProperty({ example: 'staffuser' })
	@IsString()
	@IsNotEmpty()
	username: string;

	@ApiProperty({ example: 'John Doe' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	phone_number?: string;
}
