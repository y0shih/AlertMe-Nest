import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class WsAuthGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const token: string = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

		if (!token) {
			client.disconnect();
			return false;
		}

		try {
			const user = await this.authService.getUserFromToken(token);

			if (!user) {
				client.disconnect();
				return false;
			}

			// Attach user info to socket
			client.data.user = user;
			client.data.userId = user.id;
			client.data.email = user.email;
			// Extract role name safely
			client.data.role = user['role']?.name || 'user';

			return true;
		} catch {
			client.disconnect();
			return false;
		}
	}
}
