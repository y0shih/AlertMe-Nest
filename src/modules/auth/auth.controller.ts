import { Controller, Post, Body, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignUpDto, SignInDto, RefreshTokenDto } from '../../dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('signup')
	@ApiOperation({ summary: 'Sign up a new user' })
	@ApiResponse({ status: 201, description: 'User successfully created' })
	@ApiResponse({ status: 400, description: 'Bad request' })
	async signUp(@Body() signUpDto: SignUpDto) {
		return this.authService.signUp(signUpDto.email, signUpDto.password, signUpDto.username);
	}

	@Post('signin')
	@ApiOperation({ summary: 'Sign in user' })
	@ApiResponse({ status: 200, description: 'User successfully signed in' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async signIn(@Body() signInDto: SignInDto) {
		return this.authService.signIn(signInDto.email, signInDto.password);
	}

	@Post('signout')
	@ApiOperation({ summary: 'Sign out user' })
	@ApiBearerAuth('JWT-auth')
	@ApiHeader({ name: 'authorization', description: 'Bearer token' })
	@ApiResponse({ status: 200, description: 'User successfully signed out' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async signOut(@Headers('authorization') authHeader: string) {
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new UnauthorizedException('Invalid authorization header');
		}

		const token = authHeader.substring(7); // Remove 'Bearer ' prefix
		return this.authService.signOut(token);
	}

	@Post('refresh')
	async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
		if (!refreshTokenDto.refresh_token) {
			throw new UnauthorizedException('Refresh token is required');
		}
		return this.authService.refreshToken(refreshTokenDto.refresh_token);
	}

	@Get('me')
	async getCurrentUser(@Headers('authorization') authHeader: string) {
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new UnauthorizedException('Invalid authorization header');
		}

		const token = authHeader.substring(7);
		const user = await this.authService.getUserFromToken(token);

		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		return user;
	}
}
