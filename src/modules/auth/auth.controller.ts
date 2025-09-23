import { Controller, Post, Body, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto, SignInDto, RefreshTokenDto } from '../../dto/auth.dto';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('signup')
	async signUp(@Body() signUpDto: SignUpDto) {
		return this.authService.signUp(signUpDto.email, signUpDto.password, signUpDto.username);
	}

	@Post('signin')
	async signIn(@Body() signInDto: SignInDto) {
		return this.authService.signIn(signInDto.email, signInDto.password);
	}

	@Post('signout')
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
