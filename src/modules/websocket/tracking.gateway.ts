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
import { validate as uuidValidate } from 'uuid';

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

	private validateReportId(reportId: any): boolean {
		return !!(reportId && typeof reportId === 'string' && reportId.trim() !== '' && uuidValidate(reportId));
	}

	private validateCoordinateData(data: any): boolean {
		return data && typeof data === 'object' && this.validateReportId(data.reportId) && typeof data.lat === 'number' && typeof data.lng === 'number';
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
		}
	}

	handleDisconnect(client: Socket) {
		const userId = client.data.userId;
		Logger.log(`[Tracking] Client disconnected: ${userId}`);
	}

	/**
	 * Staff/Admin joins a report tracking room
	 */
	@SubscribeMessage('joinReport')
	handleJoinReport(@ConnectedSocket() client: Socket, @MessageBody() reportId: string) {
		const userId = client.data.userId;
		const role = client.data.role;

		if (!this.validateReportId(reportId)) {
			Logger.log('[Tracking] Invalid reportId in joinReport');
			return;
		}

		// Only staff and admin can join tracking
		if (role === 'staff' || role === 'admin' || role === 'superadmin') {
			void client.join(`report_${reportId}`);
			Logger.log(`[Tracking] ${userId} joined report_${reportId}`);

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

		if (!this.validateReportId(reportId)) {
			Logger.log('[Tracking] Invalid reportId in leaveReport');
			return;
		}

		void client.leave(`report_${reportId}`);
		Logger.log(`[Tracking] ${userId} left report_${reportId}`);

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

		if (!this.validateCoordinateData(data)) {
			Logger.log('[Tracking] Invalid data in updateCoordinate');
			return;
		}

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

			Logger.log(`[Tracking] Staff ${userId} updated coordinates for report ${data.reportId}`);
		}
	}

	/**
	 * Admin requests current positions of all staff in a report
	 */
	@SubscribeMessage('requestPositions')
	handleRequestPositions(@ConnectedSocket() client: Socket, @MessageBody() reportId: string) {
		const role = client.data.role;

		if (!this.validateReportId(reportId)) {
			Logger.log('[Tracking] Invalid reportId in requestPositions');
			return;
		}

		// Only admins can request positions
		if (role === 'admin' || role === 'superadmin') {
			// Broadcast request to all staff in the room
			this.server.to(`report_${reportId}`).emit('positionRequest', {
				reportId,
			});

			Logger.log(`[Tracking] Admin requested positions for report ${reportId}`);
		}
	}
}
