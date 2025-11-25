import { Controller, Post, Body, Get, Headers, UnauthorizedException, UseGuards, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
	SignUpDto,
	SignInDto,
	RefreshTokenDto,
	OAuthProviderDto,
	OAuthCallbackDto,
	ResetPasswordRequestDto,
	ResetPasswordDto,
	UpdatePasswordDto,
	RegisterStaffDto,
	ResendVerificationEmailDto,
	SignInAdminDto,
} from '../../dto/auth.dto';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser } from '../../entities/auth-user.entity';
import { Public } from './decorators/public.decorator';
import { RolesGuard } from './roles.guard';
import { Roles } from './decorators/roles.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Public()
	@Post('signup')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Sign up a new user' })
	@ApiResponse({ status: 201, description: 'User successfully created' })
	@ApiResponse({ status: 400, description: 'Bad request' })
	@ApiResponse({ status: 409, description: 'User already exists' })
	async signUp(@Body() signUpDto: SignUpDto) {
		return this.authService.signUp(signUpDto.email, signUpDto.password, signUpDto.username, signUpDto.phone_number);
	}

	@Post('staff/sign-up')
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(SupabaseAuthGuard, RolesGuard)
	@Roles('admin', 'superadmin')
	@ApiBearerAuth('JWT-auth')
	@ApiOperation({
		summary: 'Register a new staff member with complete profile (Admin only)',
		description:
			'Creates a staff member with Supabase Auth account and complete profile information including address, contact details, and profile picture. Only required fields are email, password, username, and name. All other profile fields are optional.',
	})
	@ApiResponse({
		status: 201,
		description: 'Staff successfully created with complete profile',
		schema: {
			type: 'object',
			properties: {
				message: { type: 'string', example: 'Staff registration successful!' },
				staff: {
					type: 'object',
					properties: {
						id: { type: 'string', format: 'uuid', example: '45ebd850-75a5-463a-adc3-fbb0780df610' },
						email: { type: 'string', example: 'staff@example.com' },
						username: { type: 'string', example: 'staffuser1214' },
						is_new_user: { type: 'boolean', example: true },
						role: {
							type: 'object',
							properties: {
								id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440002' },
								name: { type: 'string', example: 'staff' },
							},
						},
						phone_number: { type: 'string', nullable: true, example: '+1234567890' },
						address: { type: 'string', nullable: true, example: '123 Main Street' },
						city: { type: 'string', nullable: true, example: 'New York' },
						state: { type: 'string', nullable: true, example: 'NY' },
						postal_code: { type: 'string', nullable: true, example: '10001' },
						country: { type: 'string', nullable: true, example: 'USA' },
						profilepic: { type: 'string', nullable: true, example: 'https://example.com/avatar.jpg' },
						task_given: { type: 'number', example: 0 },
						task_completed: { type: 'number', example: 0 },
						created_at: { type: 'string', format: 'date-time', example: '2025-11-25T00:40:26.951Z' },
						updated_at: { type: 'string', format: 'date-time', example: '2025-11-25T00:40:26.951Z' },
					},
				},
			},
		},
	})
	@ApiResponse({ status: 400, description: 'Bad request - Invalid data or staff role not found' })
	@ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
	@ApiResponse({ status: 409, description: 'Conflict - Staff with this email or username already exists' })
	async registerStaff(@Body() registerStaffDto: RegisterStaffDto) {
		return this.authService.registerStaff(
			registerStaffDto.email,
			registerStaffDto.password,
			registerStaffDto.username,
			registerStaffDto.name,
			registerStaffDto.phone_number,
			registerStaffDto.address,
			registerStaffDto.city,
			registerStaffDto.state,
			registerStaffDto.postal_code,
			registerStaffDto.country,
			registerStaffDto.profilepic,
		);
	}

	@Public()
	@Post('signin')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Sign in user' })
	@ApiResponse({ status: 200, description: 'User successfully signed in' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async signIn(@Body() signInDto: SignInDto) {
		return this.authService.signIn(signInDto.email, signInDto.password);
	}

	@Public()
	@Post('admin/signin')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Sign in admin user' })
	@ApiResponse({ status: 200, description: 'User successfully signed in' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async signInAdmin(@Body() signInAdminDto: SignInAdminDto) {
		return this.authService.signInAdmin(signInAdminDto.email, signInAdminDto.password);
	}

	@Post('signout')
	@HttpCode(HttpStatus.OK)
	@UseGuards(SupabaseAuthGuard)
	@ApiBearerAuth('JWT-auth')
	@ApiOperation({ summary: 'Sign out user' })
	@ApiResponse({ status: 200, description: 'User successfully signed out' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async signOut(@Headers('authorization') authHeader: string) {
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new UnauthorizedException('Invalid authorization header');
		}

		const token = authHeader.substring(7); // Remove 'Bearer ' prefix
		return this.authService.signOut(token);
	}

	@Public()
	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Refresh access token' })
	@ApiResponse({ status: 200, description: 'Token successfully refreshed' })
	@ApiResponse({ status: 401, description: 'Invalid refresh token' })
	async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
		if (!refreshTokenDto.refresh_token) {
			throw new UnauthorizedException('Refresh token is required');
		}
		return this.authService.refreshToken(refreshTokenDto.refresh_token);
	}

	@Get('me')
	@UseGuards(SupabaseAuthGuard)
	@ApiBearerAuth('JWT-auth')
	@ApiOperation({ summary: 'Get current authenticated user' })
	@ApiResponse({ status: 200, description: 'User retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getCurrentUser(@CurrentUser() user: AuthUser) {
		if (!user) {
			throw new UnauthorizedException('User not found');
		}
		return user;
	}

	@Public()
	@Post('oauth/signin')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Initiate OAuth sign-in' })
	@ApiResponse({ status: 200, description: 'OAuth URL generated' })
	@ApiResponse({ status: 400, description: 'Bad request' })
	async oauthSignIn(@Body() oauthDto: OAuthProviderDto) {
		return this.authService.signInWithOAuth(oauthDto.provider, oauthDto.redirectTo);
	}

	@Public()
	@Post('oauth/callback')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Handle OAuth callback' })
	@ApiResponse({ status: 200, description: 'OAuth authentication successful' })
	@ApiResponse({ status: 400, description: 'Bad request' })
	async oauthCallback(@Body() callbackDto: OAuthCallbackDto) {
		return this.authService.handleOAuthCallback(callbackDto.code);
	}

	@Public()
	@Get('oauth/callback')
	@ApiOperation({ summary: 'Handle OAuth callback (GET)' })
	@ApiQuery({ name: 'code', required: true })
	@ApiQuery({ name: 'state', required: false })
	@ApiResponse({ status: 200, description: 'OAuth authentication successful' })
	@ApiResponse({ status: 400, description: 'Bad request' })
	async oauthCallbackGet(@Query('code') code: string) {
		if (!code) {
			throw new UnauthorizedException('Authorization code is required');
		}
		return this.authService.handleOAuthCallback(code);
	}

	@Public()
	@Post('password/reset-request')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Request password reset email' })
	@ApiResponse({ status: 200, description: 'Password reset email sent' })
	@ApiResponse({ status: 400, description: 'Bad request' })
	async requestPasswordReset(@Body() resetRequestDto: ResetPasswordRequestDto) {
		return this.authService.requestPasswordReset(resetRequestDto.email);
	}

	@Public()
	@Post('password/reset')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Reset password with token' })
	@ApiResponse({ status: 200, description: 'Password successfully reset' })
	@ApiResponse({ status: 400, description: 'Bad request' })
	@ApiResponse({ status: 401, description: 'Invalid or expired token' })
	async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
		return this.authService.resetPassword(resetPasswordDto.access_token, resetPasswordDto.new_password);
	}

	@Post('password/update')
	@HttpCode(HttpStatus.OK)
	@UseGuards(SupabaseAuthGuard)
	@ApiBearerAuth('JWT-auth')
	@ApiOperation({ summary: 'Update password for authenticated user' })
	@ApiResponse({ status: 200, description: 'Password successfully updated' })
	@ApiResponse({ status: 400, description: 'Bad request' })
	@ApiResponse({ status: 401, description: 'Unauthorized or incorrect current password' })
	async updatePassword(@Body() updatePasswordDto: UpdatePasswordDto, @CurrentUser() user: AuthUser) {
		if (!user || !user.email) {
			throw new UnauthorizedException('User not found');
		}
		return this.authService.updatePassword(updatePasswordDto.current_password, updatePasswordDto.new_password, user.email);
	}

	@Public()
	@Post('email/resend-verification')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Resend verification email' })
	@ApiResponse({ status: 200, description: 'Verification email sent' })
	@ApiResponse({ status: 400, description: 'Bad request' })
	async resendVerificationEmail(@Body() resendVerificationEmailDto: ResendVerificationEmailDto) {
		return this.authService.resendVerificationEmail(resendVerificationEmailDto.email);
	}
}
