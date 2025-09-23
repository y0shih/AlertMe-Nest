import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const authHeader = request.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new UnauthorizedException('Missing or invalid authorization header');
		}

		const token = authHeader.substring(7); // Remove 'Bearer ' prefix

		try {
			const user = await this.authService.getUserFromToken(token);

			if (!user) {
				throw new UnauthorizedException('Invalid token');
			}

			// Attach user to request for use in controllers
			request.user = user;
			return true;
		} catch (error) {
			throw new UnauthorizedException('Invalid token');
		}
	}
}
