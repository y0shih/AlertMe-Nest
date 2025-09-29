import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../../entities/auth-user.entity';
import { SosReport } from '../../entities/sos-report.entity';

@Injectable()
export class NotificationsService {
	private readonly logger = new Logger(NotificationsService.name);

	constructor(
		@InjectRepository(AuthUser)
		private readonly authUserRepository: Repository<AuthUser>,
	) {}

	// Notify Admins first, then Staff
	async notifySos(sos: SosReport): Promise<void> {
		// Admins first
		const admins = await this.authUserRepository.find({
			where: { role: { name: 'admin' } as any },
			relations: ['role', 'profile'],
			order: { created_at: 'ASC' },
		});

		for (const admin of admins) {
			await this.sendNotificationToUser(admin, {
				type: 'SOS',
				sosId: sos.id,
				userId: sos.user_id,
				lat: sos.lat,
				lng: sos.lng,
				priority: 'high',
			});
		}

		// Then Staff
		const staff = await this.authUserRepository.find({
			where: { role: { name: 'staff' } as any },
			relations: ['role', 'profile'],
			order: { created_at: 'ASC' },
		});

		for (const s of staff) {
			await this.sendNotificationToUser(s, {
				type: 'SOS',
				sosId: sos.id,
				userId: sos.user_id,
				lat: sos.lat,
				lng: sos.lng,
				priority: 'normal',
			});
		}
	}

	// Stubbed notification sender (replace with email/SMS/push provider)
	private async sendNotificationToUser(user: AuthUser, payload: Record<string, unknown>): Promise<void> {
		this.logger.log(`Notify ${user.role?.name} ${user.email} => ${JSON.stringify(payload)}`);
	}
}
