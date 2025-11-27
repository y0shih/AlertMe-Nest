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

	constructor() {}

	private validateCoordinateData(data: any): boolean {
		return data && typeof data === 'object' && typeof data.lat === 'number' && typeof data.lng === 'number';
	}

	async handleConnection(client: Socket) {
		const userId = client.data.userId;
		const role = client.data.role;

		if (!userId || !role) {
			Logger.log('[Tracking] No user data, disconnecting...');
			client.disconnect();
			return;
		}

		Logger.log(`[Tracking] Client connected: ${userId} (${role})`);

		// Only staff and admins can connect to tracking
		if (role !== 'staff' && role !== 'admin' && role !== 'superadmin') {
			Logger.log(`[Tracking] Unauthorized role: ${role}, disconnecting...`);
			client.disconnect();
			return;
		}

		// Auto-join users to their respective rooms
		if (role === 'admin' || role === 'superadmin') {
			void client.join('admins');
			Logger.log(`[Tracking] ${userId} joined admins room`);
		}

		if (role === 'staff') {
			void client.join('staff');
			Logger.log(`[Tracking] ${userId} joined staff room`);
		}
	}

	handleDisconnect(client: Socket) {
		const userId = client.data.userId;
		Logger.log(`[Tracking] Client disconnected: ${userId}`);
	}

	/**
	 * Staff broadcasts GPS coordinates to all admins
	 */
	@SubscribeMessage('updateCoordinate')
	handleUpdateCoordinate(@ConnectedSocket() client: Socket, @MessageBody() data: { lat: number; lng: number }) {
		const userId = client.data.userId;
		const role = client.data.role;

		if (!this.validateCoordinateData(data)) {
			Logger.log('[Tracking] Invalid data in updateCoordinate');
			return;
		}

		// Only staff can broadcast coordinates
		if (role === 'staff') {
			// Broadcast to all admins
			this.server.to('admins').emit('coordinateUpdate', {
				staffId: userId,
				lat: data.lat,
				lng: data.lng,
			});

			Logger.log(`[Tracking] Staff ${userId} broadcasted coordinates to all admins`);
		}
	}

	/**
	 * Admin requests current positions of all staff
	 */
	@SubscribeMessage('requestAllPositions')
	handleRequestAllPositions(@ConnectedSocket() client: Socket) {
		const userId = client.data.userId;
		const role = client.data.role;

		// Only admins can request positions
		if (role === 'admin' || role === 'superadmin') {
			// Broadcast request to all staff
			this.server.to('staff').emit('positionRequest');

			Logger.log(`[Tracking] Admin ${userId} requested all staff positions`);
		}
	}
}
