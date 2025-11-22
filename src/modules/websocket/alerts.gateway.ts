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

		// Auto-join role-based rooms
		if (role === 'admin' || role === 'superadmin') {
			void client.join('admin_notifications');
			Logger.log(`[Alerts] ${userId} joined admin_notifications`);
		}

		if (role === 'staff') {
			void client.join('staff_notifications');
			Logger.log(`[Alerts] ${userId} joined staff_notifications`);
		}

		// Personal notification room
		void client.join(`user_${userId}`);
		Logger.log(`[Alerts] ${userId} joined user_${userId}`);
	}

	handleDisconnect(client: Socket) {
		const userId = client.data.userId;
		Logger.log(`[Alerts] Client disconnected: ${userId}`);
	}

	/**
	 * Client joins a report-specific room
	 */
	@SubscribeMessage('joinReport')
	handleJoinReport(@ConnectedSocket() client: Socket, @MessageBody() reportId: string) {
		const userId = client.data.userId;
		const role = client.data.role;

		// Only admin, superadmin, and assigned staff can join
		if (role === 'admin' || role === 'superadmin' || role === 'staff') {
			void client.join(`report_${reportId}`);
			Logger.log(`[Alerts] ${userId} joined report_${reportId}`);

			// Notify others in room
			client.to(`report_${reportId}`).emit('userJoinedReport', {
				userId,
				role,
			});
		}
	}

	/**
	 * Client leaves a report-specific room
	 */
	@SubscribeMessage('leaveReport')
	handleLeaveReport(@ConnectedSocket() client: Socket, @MessageBody() reportId: string) {
		const userId = client.data.userId;
		void client.leave(`report_${reportId}`);
		Logger.log(`[Alerts] ${userId} left report_${reportId}`);

		// Notify others
		client.to(`report_${reportId}`).emit('userLeftReport', {
			userId,
		});
	}

	/**
	 * Broadcast new report to all admins
	 */
	emitNewReport(reportData: { reportId: string; name: string; lat: number; lng: number; userId: string; createdAt: Date }) {
		this.server.to('admin_notifications').emit('newReport', reportData);
		Logger.log(`[Alerts] New report broadcast to admins: ${reportData.reportId}`);
	}

	/**
	 * Broadcast SOS alert to all admins and staff
	 */
	emitSosAlert(sosData: { sosId: string; name: string; lat: number; lng: number; userId: string; createdAt: Date }) {
		this.server.to('admin_notifications').emit('sosAlert', sosData);
		this.server.to('staff_notifications').emit('sosAlert', sosData);
		Logger.log(`[Alerts] SOS alert broadcast: ${sosData.sosId}`);
	}

	/**
	 * Notify assigned staff of new task
	 */
	emitTaskAssigned(taskData: { taskId: string; reportId: string; staffIds: string[] }) {
		taskData.staffIds.forEach((staffId) => {
			this.server.to(`user_${staffId}`).emit('taskAssigned', {
				taskId: taskData.taskId,
				reportId: taskData.reportId,
				message: 'You have been assigned to a new task',
			});
		});
		Logger.log(`[Alerts] Task assigned: ${taskData.taskId} to ${taskData.staffIds.length} staff`);
	}

	/**
	 * Broadcast status update to report room
	 */
	emitReportResponseCreated(responseData: {
		responseId: string;
		reportId: string;
		taskId: string;
		respondedBy: string;
		responseText: string;
		attachmentPaths?: string[];
		lat?: number;
		lng?: number;
	}) {
		this.server.to(`report_${responseData.reportId}`).emit('reportResponseCreated', {
			responseId: responseData.responseId,
			reportId: responseData.reportId,
			taskId: responseData.taskId,
			respondedBy: responseData.respondedBy,
			text: responseData.responseText,
			attachments: responseData.attachmentPaths,
			lat: responseData.lat,
			lng: responseData.lng,
			timestamp: new Date(),
		});
		Logger.log(`[Alerts] Response created for report: ${responseData.reportId}`);
	}

	/**
	 * Notify admin of task completion
	 */
	emitTaskCompleted(taskData: { taskId: string; reportId: string; completedBy: string }) {
		this.server.to('admin_notifications').emit('taskCompleted', {
			taskId: taskData.taskId,
			reportId: taskData.reportId,
			completedBy: taskData.completedBy,
			message: 'Task has been completed',
		});
		Logger.log(`[Alerts] Task completed: ${taskData.taskId}`);
	}

	/**
	 * Notify report owner and assigned staff of resolution
	 */
	emitReportResolved(reportData: { reportId: string; userId: string; assignedStaffIds: string[] }) {
		// Notify report owner
		this.server.to(`user_${reportData.userId}`).emit('reportResolved', {
			reportId: reportData.reportId,
			message: 'Your report has been resolved',
		});

		// Notify all assigned staff
		reportData.assignedStaffIds.forEach((staffId) => {
			this.server.to(`user_${staffId}`).emit('reportResolved', {
				reportId: reportData.reportId,
				message: 'Report has been resolved',
			});
		});
		Logger.log(`[Alerts] Report resolved: ${reportData.reportId}`);
	}

	/**
	 * Notify when report is closed
	 */
	emitReportClosed(reportData: { reportId: string; userId: string; assignedStaffIds: string[] }) {
		// Notify report owner
		this.server.to(`user_${reportData.userId}`).emit('reportClosed', {
			reportId: reportData.reportId,
			message: 'Your report has been closed',
		});

		// Notify all assigned staff
		reportData.assignedStaffIds.forEach((staffId) => {
			this.server.to(`user_${staffId}`).emit('reportClosed', {
				reportId: reportData.reportId,
				message: 'Report has been closed',
			});
		});
		Logger.log(`[Alerts] Report closed: ${reportData.reportId}`);
	}
}
