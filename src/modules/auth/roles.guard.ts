import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators/roles.decorator';
import { AuthUser } from '../../entities/auth-user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);

		if (!requiredRoles) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const user = request.user as AuthUser;

		if (!user || !user.role) {
			throw new ForbiddenException('Access denied');
		}

		const hasRole = requiredRoles.some((role) => user.role.name === role);

		if (!hasRole) {
			throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
		}

		return true;
	}
}
