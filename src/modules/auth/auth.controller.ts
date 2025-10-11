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
	VerifyEmailDto,
} from '../../dto/auth.dto';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser } from '../../entities/auth-user.entity';
import { Public } from './decorators/public.decorator';

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

	@Public()
	@Post('signin')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Sign in user' })
	@ApiResponse({ status: 200, description: 'User successfully signed in' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async signIn(@Body() signInDto: SignInDto) {
		return this.authService.signIn(signInDto.email, signInDto.password);
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
	async resendVerificationEmail(@Body() verifyEmailDto: VerifyEmailDto) {
		return this.authService.resendVerificationEmail(verifyEmailDto.email);
	}
}
