import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto, StaffResponseDto } from '../../dto/staff.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('staff')
@UseGuards(SupabaseAuthGuard)
export class StaffController {
	constructor(private readonly staffService: StaffService) {}

	@Post()
	async create(@Body() createStaffDto: CreateStaffDto): Promise<StaffResponseDto> {
		return this.staffService.create(createStaffDto);
	}

	@Get()
	async findAll(
		@Query('page') page?: number,
		@Query('limit') limit?: number,
	): Promise<{ data: StaffResponseDto[]; total: number; page: number; limit: number }> {
		return this.staffService.findAll(page, limit);
	}

	@Get(':id')
	async findOne(@Param('id') id: string): Promise<StaffResponseDto> {
		return this.staffService.findOne(id);
	}

	@Put(':id')
	async update(@Param('id') id: string, @Body() updateStaffDto: UpdateStaffDto): Promise<StaffResponseDto> {
		return this.staffService.update(id, updateStaffDto);
	}

	@Delete(':id')
	async remove(@Param('id') id: string): Promise<{ message: string }> {
		await this.staffService.remove(id);
		return { message: 'Staff member deleted successfully' };
	}

	@Get('by-role/:roleId')
	async findByRole(@Param('roleId') roleId: string): Promise<StaffResponseDto[]> {
		return this.staffService.findByRole(roleId);
	}
}
