import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto, StaffResponseDto } from '../../dto/staff.dto';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
	constructor(private readonly staffService: StaffService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new staff member (Admin)' })
	@ApiResponse({ status: 201, description: 'Staff member successfully created', type: StaffResponseDto })
	@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
	@ApiResponse({ status: 409, description: 'Staff member with this email already exists' })
	@ApiResponse({ status: 404, description: 'Role not found' })
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
	async findByRole(@Param('roleId') roleId: string): Promise<StaffResponseDto[]> {
		return this.staffService.findByRole(roleId);
	}

	@Get('query')
	@ApiOperation({ summary: 'Get staff members by IDs (single or multiple)' })
	@ApiQuery({ name: 'ids', required: true, description: 'Staff UUID(s) - can pass single or multiple', type: [String], isArray: true })
	@ApiResponse({ status: 200, description: 'Array of staff members', type: [StaffResponseDto] })
	@ApiResponse({ status: 404, description: 'Staff member not found' })
	async findMany(@Param('id') id: string): Promise<StaffResponseDto> {
		return this.staffService.findMany(id);
	}

	// @Get(':id')
	// @ApiOperation({ summary: 'Get staff member details by ID' })
	// @ApiParam({ name: 'id', description: 'Staff UUID', type: String })
	// @ApiResponse({ status: 200, description: 'Staff member details', type: StaffResponseDto })
	// @ApiResponse({ status: 404, description: 'Staff member not found' })
	// @Roles('admin', 'superadmin', 'staff')
	// async findOne(@Param('id') id: string): Promise<StaffResponseDto> {
	// 	return this.staffService.findOne(id);
	// }

	@Put(':id')
	@ApiOperation({ summary: 'Update staff member information (Admin)' })
	@ApiParam({ name: 'id', description: 'Staff UUID', type: String })
	@ApiResponse({ status: 200, description: 'Staff member successfully updated', type: StaffResponseDto })
	@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
	@ApiResponse({ status: 404, description: 'Staff member not found' })
	async update(@Param('id') id: string, @Body() updateStaffDto: UpdateStaffDto): Promise<StaffResponseDto> {
		return this.staffService.update(id, updateStaffDto);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete a staff member (Admin)' })
	@ApiParam({ name: 'id', description: 'Staff UUID', type: String })
	@ApiResponse({ status: 200, description: 'Staff member successfully deleted' })
	@ApiResponse({ status: 404, description: 'Staff member not found' })
	async remove(@Param('id') id: string): Promise<{ message: string }> {
		await this.staffService.remove(id);
		return { message: 'Staff member deleted successfully' };
	}
}
