import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
	constructor(
		private authService: AuthService,
		private reflector: Reflector,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Check if route is public
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);

		if (isPublic) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const authHeader = request.headers.authorization as string | undefined;

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
		} catch (_error) {
			throw new UnauthorizedException('Invalid token');
		}
	}
}
