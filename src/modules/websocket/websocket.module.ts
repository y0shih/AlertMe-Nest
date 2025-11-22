import { Module } from '@nestjs/common';
import { AlertsGateway } from './alerts.gateway';
import { TrackingGateway } from './tracking.gateway';
import { WsAuthGuard } from './websocket-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [AuthModule],
	providers: [AlertsGateway, TrackingGateway, WsAuthGuard],
	exports: [AlertsGateway, TrackingGateway],
})
export class WebsocketModule {}
