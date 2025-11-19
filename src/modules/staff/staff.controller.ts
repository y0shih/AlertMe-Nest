import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto, StaffResponseDto } from '../../dto/staff.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Staff')
@ApiBearerAuth('JWT-auth')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('staff')
export class StaffController {
	constructor(private readonly staffService: StaffService) { }

	@Post()
	@ApiOperation({ summary: 'Create a new staff member (Admin)' })
	@ApiResponse({ status: 201, description: 'Staff member successfully created', type: StaffResponseDto })
	@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
	@ApiResponse({ status: 409, description: 'Staff member with this email already exists' })
	@ApiResponse({ status: 404, description: 'Role not found' })
	@Roles('admin', 'superadmin')
	async create(@Body() createStaffDto: CreateStaffDto): Promise<StaffResponseDto> {
		return this.staffService.create(createStaffDto);
	}

	@Get()
	@ApiOperation({ summary: 'Get all staff members with pagination (Admin)' })
	@ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
	@ApiResponse({
		status: 200,
		description: 'List of staff members with pagination metadata',
		schema: {
			type: 'object',
			properties: {
				data: { type: 'array', items: { $ref: '#/components/schemas/StaffResponseDto' } },
				total: { type: 'number' },
				page: { type: 'number' },
				limit: { type: 'number' },
			},
		},
	})
	@Roles('admin', 'superadmin', 'staff')
	async findAll(
		@Query('page') page?: number,
		@Query('limit') limit?: number,
	): Promise<{ data: StaffResponseDto[]; total: number; page: number; limit: number }> {
		return this.staffService.findAll(page, limit);
	}

	@Get('by-role/:roleId')
	@ApiOperation({ summary: 'Get all staff members by role ID (Admin)' })
	@ApiParam({ name: 'roleId', description: 'Role UUID', type: String })
	@ApiResponse({ status: 200, description: 'List of staff members with the specified role', type: [StaffResponseDto] })
	@Roles('admin', 'superadmin')
	async findByRole(@Param('roleId') roleId: string): Promise<StaffResponseDto[]> {
		return this.staffService.findByRole(roleId);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get staff member details by ID' })
	@ApiParam({ name: 'id', description: 'Staff UUID', type: String })
	@ApiResponse({ status: 200, description: 'Staff member details', type: StaffResponseDto })
	@ApiResponse({ status: 404, description: 'Staff member not found' })
	@Roles('admin', 'superadmin', 'staff')
	async findOne(@Param('id') id: string): Promise<StaffResponseDto> {
		return this.staffService.findOne(id);
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update staff member information (Admin)' })
	@ApiParam({ name: 'id', description: 'Staff UUID', type: String })
	@ApiResponse({ status: 200, description: 'Staff member successfully updated', type: StaffResponseDto })
	@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
	@ApiResponse({ status: 404, description: 'Staff member not found' })
	@Roles('admin', 'superadmin')
	async update(@Param('id') id: string, @Body() updateStaffDto: UpdateStaffDto): Promise<StaffResponseDto> {
		return this.staffService.update(id, updateStaffDto);
	}

	@Put('me')
	@ApiOperation({ summary: 'Update current staff member profile' })
	@ApiResponse({ status: 200, description: 'Profile successfully updated', type: StaffResponseDto })
	@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Roles('staff', 'admin', 'superadmin')
	async updateProfile(@CurrentUser() user: any, @Body() updateStaffDto: UpdateStaffDto): Promise<StaffResponseDto> {
		// The user object from CurrentUser might be AuthUser, Staff, or Admin
		// We need to ensure it's a staff member or find the staff record associated with the email
		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		// If the user object has an ID and it's a staff member (checked by Roles guard somewhat, but let's be safe)
		// In our system, the CurrentUser decorator returns the entity found in findUserByEmailHierarchy
		// So if they are logged in as staff, user should be a Staff entity

		// However, let's rely on the service to find the staff by ID or Email if needed. 
		// But here we have the ID from the authenticated user.

		return this.staffService.updateProfile(user.id, updateStaffDto);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete a staff member (Admin)' })
	@ApiParam({ name: 'id', description: 'Staff UUID', type: String })
	@ApiResponse({ status: 200, description: 'Staff member successfully deleted' })
	@ApiResponse({ status: 404, description: 'Staff member not found' })
	@Roles('admin', 'superadmin')
	async remove(@Param('id') id: string): Promise<{ message: string }> {
		await this.staffService.remove(id);
		return { message: 'Staff member deleted successfully' };
	}
}
