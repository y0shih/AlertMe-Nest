import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthUser } from '../../entities/auth-user.entity';
import { NotificationsService } from './notifications.service';

@Module({
	imports: [TypeOrmModule.forFeature([AuthUser])],
	providers: [NotificationsService],
	exports: [NotificationsService],
})
export class NotificationsModule {}
