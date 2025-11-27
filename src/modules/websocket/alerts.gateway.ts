import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsAuthGuard } from './websocket-auth.guard';
import { ReportStatus } from '../../enums/user-role.enum';

@UseGuards(WsAuthGuard)
@WebSocketGateway({
	cors: {
		origin: '*',
		credentials: false,
	},
	namespace: 'alerts',
})
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	constructor() {}

	async handleConnection(client: Socket) {
		const userId = client.data.userId;
		const role = client.data.role;

		if (!userId || !role) {
			Logger.log('[Alerts] No user data, disconnecting...');
			client.disconnect();
			return;
		}

		Logger.log(`[Alerts] Client connected: ${userId} (${role})`);

		// Everyone joins the 'everyone' room for report alerts
		void client.join('everyone');
		Logger.log(`[Alerts] ${userId} joined everyone room`);

		// Staff and admins join special room for SOS alerts
		if (role === 'staff' || role === 'admin' || role === 'superadmin') {
			void client.join('staff_and_admins');
			Logger.log(`[Alerts] ${userId} joined staff_and_admins room`);
		}
	}

	handleDisconnect(client: Socket) {
		const userId = client.data.userId;
		Logger.log(`[Alerts] Client disconnected: ${userId}`);
	}

	/**
	 * Broadcast new report to everyone
	 */
	emitNewReport(reportData: { reportId: string; status: ReportStatus }) {
		this.server.to('everyone').emit('newReport', reportData);
		Logger.log(`[Alerts] New report broadcast to everyone: ${reportData.reportId} (${reportData.status})`);
	}

	/**
	 * Broadcast SOS alert to staff and admins only
	 */
	emitSosAlert(sosData: { reportId: string }) {
		this.server.to('staff_and_admins').emit('sosAlert', sosData);
		Logger.log(`[Alerts] SOS alert broadcast to staff and admins: ${sosData.reportId}`);
	}
}
