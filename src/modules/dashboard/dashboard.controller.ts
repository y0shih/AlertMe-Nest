import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto, DashboardQueryDto } from '../../dto/dashboard.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@Get()
	@ApiOperation({ summary: 'Get dashboard statistics and graphs data with optional filters' })
	@ApiResponse({
		status: 200,
		description: 'Dashboard data retrieved successfully',
		type: DashboardResponseDto,
	})
	@Roles('user', 'staff', 'admin', 'superadmin')
	async getDashboard(@Query() query: DashboardQueryDto): Promise<DashboardResponseDto> {
		return this.dashboardService.getDashboardData(query);
	}
}
