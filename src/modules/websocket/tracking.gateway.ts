import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	OnGatewayConnection,
	OnGatewayDisconnect,
	MessageBody,
	ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsAuthGuard } from './websocket-auth.guard';
import { AuthService } from '../auth/auth.service';

@UseGuards(WsAuthGuard)
@WebSocketGateway({
	cors: {
		origin: '*',
		credentials: false,
	},
	namespace: 'tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	constructor(private readonly authService: AuthService) {}

	async handleConnection(client: Socket) {
		try {
			const token: string | undefined = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

			if (!token || typeof token !== 'string') {
				Logger.log('[Tracking] No token provided, disconnecting...');
				client.disconnect();
				return;
			}

			const user = await this.authService.getUserFromToken(token);

			if (!user) {
				Logger.log('[Tracking] Invalid token or user not found, disconnecting...');
				client.disconnect();
				return;
			}

			client.data.user = user;
			client.data.userId = user.id;
			client.data.email = user.email;
			client.data.role = user['role']?.name || 'user';

			const userId = client.data.userId;
			const role = client.data.role;

			Logger.log(`[Tracking] Client connected: ${userId} (${role})`);

			// Only staff and admins can connect to tracking
			if (role !== 'staff' && role !== 'admin' && role !== 'superadmin') {
				Logger.log(`[Tracking] Unauthorized role: ${role}, disconnecting...`);
				client.disconnect();
			}
		} catch (error) {
			Logger.error('[Tracking] Connection error:', error);
			client.disconnect();
		}
	}

	handleDisconnect(client: Socket) {
		const userId = client.data.userId;
		console.log(`[Tracking] Client disconnected: ${userId}`);
	}

	/**
	 * Staff/Admin joins a report tracking room
	 */
	@SubscribeMessage('joinReport')
	handleJoinReport(@ConnectedSocket() client: Socket, @MessageBody() reportId: string) {
		const userId = client.data.userId;
		const role = client.data.role;

		// Only staff and admin can join tracking
		if (role === 'staff' || role === 'admin' || role === 'superadmin') {
			void client.join(`report_${reportId}`);
			console.log(`[Tracking] ${userId} joined report_${reportId}`);

			// Notify others in tracking room
			client.to(`report_${reportId}`).emit('userJoinedTracking', {
				userId,
				role,
			});
		}
	}

	/**
	 * Staff/Admin leaves a report tracking room
	 */
	@SubscribeMessage('leaveReport')
	handleLeaveReport(@ConnectedSocket() client: Socket, @MessageBody() reportId: string) {
		const userId = client.data.userId;
		void client.leave(`report_${reportId}`);
		console.log(`[Tracking] ${userId} left report_${reportId}`);

		// Notify others
		client.to(`report_${reportId}`).emit('userLeftTracking', {
			userId,
		});
	}

	/**
	 * Staff broadcasts GPS coordinates
	 */
	@SubscribeMessage('updateCoordinate')
	handleUpdateCoordinate(@ConnectedSocket() client: Socket, @MessageBody() data: { reportId: string; lat: number; lng: number }) {
		const userId = client.data.userId;
		const role = client.data.role;

		// Only staff can broadcast coordinates
		if (role === 'staff') {
			// Broadcast to all in report room (other staff + admins)
			// Note: Does NOT include report owner (user)
			this.server.to(`report_${data.reportId}`).emit('coordinateUpdate', {
				staffId: userId,
				lat: data.lat,
				lng: data.lng,
				timestamp: new Date(),
			});

			console.log(`[Tracking] Staff ${userId} updated coordinates for report ${data.reportId}`);
		}
	}

	/**
	 * Admin requests current positions of all staff in a report
	 */
	@SubscribeMessage('requestPositions')
	handleRequestPositions(@ConnectedSocket() client: Socket, @MessageBody() reportId: string) {
		const role = client.data.role;

		// Only admins can request positions
		if (role === 'admin' || role === 'superadmin') {
			// Broadcast request to all staff in the room
			this.server.to(`report_${reportId}`).emit('positionRequest', {
				reportId,
			});

			console.log(`[Tracking] Admin requested positions for report ${reportId}`);
		}
	}
}
