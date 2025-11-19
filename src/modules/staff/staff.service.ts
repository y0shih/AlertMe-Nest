import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Staff } from '../../entities/staff.entity';
import { StaffProfile } from '../../entities/staff-profile.entity';
import { Role } from '../../entities/role.entity';
import { CreateStaffDto, UpdateStaffDto, StaffResponseDto } from '../../dto/staff.dto';

@Injectable()
export class StaffService {
	constructor(
		@InjectRepository(Staff)
		private staffRepository: Repository<Staff>,
		@InjectRepository(StaffProfile)
		private staffProfileRepository: Repository<StaffProfile>,
		@InjectRepository(Role)
		private roleRepository: Repository<Role>,
		private dataSource: DataSource,
	) {}

	async create(createStaffDto: CreateStaffDto): Promise<StaffResponseDto> {
		// Check if email already exists
		const existingStaff = await this.staffRepository.findOne({
			where: { email: createStaffDto.email },
		});

		if (existingStaff) {
			throw new ConflictException('Staff member with this email already exists');
		}

		// Verify role exists
		const role = await this.roleRepository.findOne({
			where: { id: createStaffDto.role_id },
		});

		if (!role) {
			throw new NotFoundException('Role not found');
		}

		// Use transaction to create both staff and profile
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Create staff
			const staff = this.staffRepository.create({
				email: createStaffDto.email,
				name: createStaffDto.name,
				role_id: createStaffDto.role_id,
				task_given: 0,
				task_completed: 0,
			});

			const savedStaff = await queryRunner.manager.save(Staff, staff);

			// Create profile
			const profile = this.staffProfileRepository.create({
				id: savedStaff.id,
				username: createStaffDto.username,
				phone_number: createStaffDto.phone_number,
				address: createStaffDto.address,
				city: createStaffDto.city,
				state: createStaffDto.state,
				postal_code: createStaffDto.postal_code,
				country: createStaffDto.country,
				profilepic: createStaffDto.profilepic,
			});

			const savedProfile = await queryRunner.manager.save(StaffProfile, profile);

			await queryRunner.commitTransaction();

			// Return formatted response
			return this.mapToResponseDto(savedStaff, savedProfile, role);
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}

	async findAll(page: number = 1, limit: number = 10): Promise<{ data: StaffResponseDto[]; total: number; page: number; limit: number }> {
		const [staff, total] = await this.staffRepository.findAndCount({
			relations: ['profile', 'role'],
			skip: (page - 1) * limit,
			take: limit,
			order: { created_at: 'DESC' },
		});

		const data = staff.map((s) => this.mapToResponseDto(s, s.profile, s.role));

		return { data, total, page, limit };
	}

	async findOne(id: string): Promise<StaffResponseDto> {
		const staff = await this.staffRepository.findOne({
			where: { id },
			relations: ['profile', 'role'],
		});

		if (!staff) {
			throw new NotFoundException('Staff member not found');
		}

		return this.mapToResponseDto(staff, staff.profile, staff.role);
	}

	async findByRole(roleId: string): Promise<StaffResponseDto[]> {
		const staff = await this.staffRepository.find({
			where: { role_id: roleId },
			relations: ['profile', 'role'],
			order: { name: 'ASC' },
		});

		return staff.map((s) => this.mapToResponseDto(s, s.profile, s.role));
	}

	async update(id: string, updateStaffDto: UpdateStaffDto): Promise<StaffResponseDto> {
		const staff = await this.staffRepository.findOne({
			where: { id },
			relations: ['profile', 'role'],
		});

		if (!staff) {
			throw new NotFoundException('Staff member not found');
		}

		// Update staff entity if name is provided
		if (updateStaffDto.name) {
			staff.name = updateStaffDto.name;
			await this.staffRepository.save(staff);
		}

		// Update profile
		const profile = staff.profile;
		Object.assign(profile, {
			username: updateStaffDto.username ?? profile.username,
			phone_number: updateStaffDto.phone_number ?? profile.phone_number,
			address: updateStaffDto.address ?? profile.address,
			city: updateStaffDto.city ?? profile.city,
			state: updateStaffDto.state ?? profile.state,
			postal_code: updateStaffDto.postal_code ?? profile.postal_code,
			country: updateStaffDto.country ?? profile.country,
			profilepic: updateStaffDto.profilepic ?? profile.profilepic,
		});

		const updatedProfile = await this.staffProfileRepository.save(profile);

		return this.mapToResponseDto(staff, updatedProfile, staff.role);
	}

	async updateProfile(id: string, updateStaffDto: UpdateStaffDto): Promise<StaffResponseDto> {
		// Re-use the update logic but restrict what can be updated if needed
		// For now, it seems safe to reuse the update logic as the DTO controls the fields
		return this.update(id, updateStaffDto);
	}

	async remove(id: string): Promise<void> {
		const staff = await this.staffRepository.findOne({ where: { id } });

		if (!staff) {
			throw new NotFoundException('Staff member not found');
		}

		await this.staffRepository.remove(staff);
	}

	private mapToResponseDto(staff: Staff, profile: StaffProfile, _role: Role): StaffResponseDto {
		return {
			id: staff.id,
			email: staff.email,
			name: staff.name,
			role_id: staff.role_id,
			is_new_user: staff.is_new_user,
			profile: {
				id: profile.id,
				username: profile.username,
				phone_number: profile.phone_number,
				address: profile.address,
				city: profile.city,
				state: profile.state,
				postal_code: profile.postal_code,
				country: profile.country,
				profilepic: profile.profilepic,
			},
			task_given: staff.task_given,
			task_completed: staff.task_completed,
			created_at: staff.created_at,
			updated_at: staff.updated_at,
		};
	}
}
