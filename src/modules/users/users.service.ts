import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../../entities/auth-user.entity';
import { UserProfile } from '../../entities/user-profile.entity';
import { Admin } from '../../entities/admin.entity';
import { AdminProfile } from '../../entities/admin-profile.entity';
import { Staff } from '../../entities/staff.entity';
import { StaffProfile } from '../../entities/staff-profile.entity';
import { Role } from '../../entities/role.entity';
import { AuthUserRepository } from './user.repository';
import { UpdateUserDto, UserQueryDto, UserResponseDto, PaginatedUserResponse, UserSearchDto } from '../../dto/user.dto';

@Injectable()
export class UsersService {
	constructor(
		private readonly authUserRepository: AuthUserRepository,
		@InjectRepository(UserProfile)
		private readonly userProfileRepository: Repository<UserProfile>,
		@InjectRepository(Admin)
		private readonly adminRepository: Repository<Admin>,
		@InjectRepository(AdminProfile)
		private readonly adminProfileRepository: Repository<AdminProfile>,
		@InjectRepository(Staff)
		private readonly staffRepository: Repository<Staff>,
		@InjectRepository(StaffProfile)
		private readonly staffProfileRepository: Repository<StaffProfile>,
		@InjectRepository(Role)
		private readonly roleRepository: Repository<Role>,
	) {}

	async findAll(query: UserQueryDto): Promise<PaginatedUserResponse> {
		const { users, total } = await this.authUserRepository.findWithPagination(query);

		const userResponseData = users.map((user) => this.mapToUserResponse(user));

		const page = query.page || 1;
		const limit = query.limit || 10;
		const totalPages = Math.ceil(total / limit);

		return {
			data: userResponseData,
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		};
	}

	async findById(id: string): Promise<UserResponseDto> {
		if (!id) {
			throw new BadRequestException('User ID is required');
		}

		// Try to find in Admin table first
		const admin = await this.adminRepository.findOne({
			where: { id },
			relations: ['role', 'profile'],
		});

		if (admin) {
			return this.mapAdminToUserResponse(admin);
		}

		// Then try Staff table
		const staff = await this.staffRepository.findOne({
			where: { id },
			relations: ['role', 'profile'],
		});

		if (staff) {
			return this.mapStaffToUserResponse(staff);
		}

		// Finally try AuthUser table
		const user = await this.authUserRepository.findOne({
			where: { id },
			relations: ['role', 'profile'],
		});

		if (!user) {
			throw new NotFoundException(`User with ID ${id} not found`);
		}

		return this.mapToUserResponse(user);
	}

	async findByEmail(email: string): Promise<UserResponseDto> {
		if (!email) {
			throw new BadRequestException('Email is required');
		}

		// Try to find in Admin table first
		const admin = await this.adminRepository.findOne({
			where: { email },
			relations: ['role', 'profile'],
		});

		if (admin) {
			return this.mapAdminToUserResponse(admin);
		}

		// Then try Staff table
		const staff = await this.staffRepository.findOne({
			where: { email },
			relations: ['role', 'profile'],
		});

		if (staff) {
			return this.mapStaffToUserResponse(staff);
		}

		// Finally try AuthUser table
		const user = await this.authUserRepository.findByEmail(email);

		if (!user) {
			throw new NotFoundException(`User with email ${email} not found`);
		}

		return this.mapToUserResponse(user);
	}

	async updateUser(id: string, updateUserDto: UpdateUserDto, currentUserId: string): Promise<UserResponseDto> {
		if (!id) {
			throw new BadRequestException('User ID is required');
		}

		// Get current user (actor) information
		const currentUser = await this.findById(currentUserId);

		// Get target user information
		const user = await this.authUserRepository.findOne({
			where: { id },
			relations: ['role', 'profile'],
		});

		if (!user) {
			// Try to find in other tables
			const admin = await this.adminRepository.findOne({
				where: { id },
				relations: ['role', 'profile'],
			});

			if (admin) {
				// Check RBAC for admin users
				this.canModifyUser(currentUser.role.name, admin.role.name, currentUserId, id);
				throw new BadRequestException('Updating admin users is not supported through this endpoint');
			}

			const staff = await this.staffRepository.findOne({
				where: { id },
				relations: ['role', 'profile'],
			});

			if (staff) {
				// Check RBAC for staff users
				this.canModifyUser(currentUser.role.name, staff.role.name, currentUserId, id);
				throw new BadRequestException('Updating staff users is not supported through this endpoint');
			}

			throw new NotFoundException(`User with ID ${id} not found`);
		}

		// Check RBAC permissions
		this.canModifyUser(currentUser.role.name, user.role.name, currentUserId, id);

		const { username, role_id, phone_number, address, city, state, postal_code, country, profilepic } = updateUserDto;

		// Check username uniqueness if provided
		if (username && username !== user.profile?.username) {
			const existingUserByUsername = await this.authUserRepository.findByUsernameOrEmail(username);
			if (existingUserByUsername && existingUserByUsername.id !== id) {
				throw new ConflictException('Username is already taken');
			}
		}

		// Validate role if provided
		if (role_id && role_id !== user.role_id) {
			const role = await this.roleRepository.findOne({ where: { id: role_id } });
			if (!role) {
				throw new BadRequestException('Invalid role ID provided');
			}
		}

		// Update user in a transaction
		const queryRunner = this.authUserRepository.manager.connection.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Update auth user if role changed
			if (role_id && role_id !== user.role_id) {
				await queryRunner.manager.update(AuthUser, { id }, { role_id });
			}

			// Update user profile fields
			const profileUpdates: Partial<UserProfile> = {};
			if (username !== undefined) profileUpdates.username = username;
			if (phone_number !== undefined) profileUpdates.phone_number = phone_number;
			if (address !== undefined) profileUpdates.address = address;
			if (city !== undefined) profileUpdates.city = city;
			if (state !== undefined) profileUpdates.state = state;
			if (postal_code !== undefined) profileUpdates.postal_code = postal_code;
			if (country !== undefined) profileUpdates.country = country;
			if (profilepic !== undefined) profileUpdates.profilepic = profilepic;

			if (Object.keys(profileUpdates).length > 0) {
				if (user.profile) {
					await queryRunner.manager.update(UserProfile, { id }, profileUpdates);
				} else {
					// Create profile if it doesn't exist
					const userProfile = queryRunner.manager.create(UserProfile, {
						id,
						...profileUpdates,
					});
					await queryRunner.manager.save(userProfile);
				}
			}

			await queryRunner.commitTransaction();

			// Fetch updated user with relations
			const updatedUser = await this.authUserRepository.findOne({
				where: { id },
				relations: ['role', 'profile'],
			});

			if (!updatedUser) {
				throw new BadRequestException('Failed to retrieve updated user');
			}

			return this.mapToUserResponse(updatedUser);
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw new BadRequestException('Failed to update user: ' + error.message);
		} finally {
			await queryRunner.release();
		}
	}

	async deleteUser(id: string, currentUserId: string): Promise<void> {
		if (!id) {
			throw new BadRequestException('User ID is required');
		}

		// Get current user (actor) information
		const currentUser = await this.findById(currentUserId);

		// Try to find in Admin table first
		const admin = await this.adminRepository.findOne({
			where: { id },
			relations: ['role', 'profile'],
		});

		if (admin) {
			// Check RBAC permissions
			this.canModifyUser(currentUser.role.name, admin.role.name, currentUserId, id);
			const queryRunner = this.adminRepository.manager.connection.createQueryRunner();
			await queryRunner.connect();
			await queryRunner.startTransaction();

			try {
				// Delete admin profile first if exists
				if (admin.profile) {
					await queryRunner.manager.delete(AdminProfile, { id });
				}

				// Delete admin
				await queryRunner.manager.delete(Admin, { id });

				await queryRunner.commitTransaction();
				return;
			} catch (error) {
				await queryRunner.rollbackTransaction();
				throw new BadRequestException('Failed to delete admin user: ' + error.message);
			} finally {
				await queryRunner.release();
			}
		}

		// Then try Staff table
		const staff = await this.staffRepository.findOne({
			where: { id },
			relations: ['role', 'profile'],
		});

		if (staff) {
			// Check RBAC permissions
			this.canModifyUser(currentUser.role.name, staff.role.name, currentUserId, id);
			const queryRunner = this.staffRepository.manager.connection.createQueryRunner();
			await queryRunner.connect();
			await queryRunner.startTransaction();

			try {
				// Delete staff profile first if exists
				if (staff.profile) {
					await queryRunner.manager.delete(StaffProfile, { id });
				}

				// Delete staff
				await queryRunner.manager.delete(Staff, { id });

				await queryRunner.commitTransaction();
				return;
			} catch (error) {
				await queryRunner.rollbackTransaction();
				throw new BadRequestException('Failed to delete staff user: ' + error.message);
			} finally {
				await queryRunner.release();
			}
		}

		// Finally try AuthUser table
		const user = await this.authUserRepository.findOne({
			where: { id },
			relations: ['role', 'profile'],
		});

		if (!user) {
			throw new NotFoundException(`User with ID ${id} not found`);
		}

		// Check RBAC permissions
		this.canModifyUser(currentUser.role.name, user.role.name, currentUserId, id);

		// Delete user in a transaction (cascade will handle profile deletion)
		const queryRunner = this.authUserRepository.manager.connection.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Delete user profile first if exists
			if (user.profile) {
				await queryRunner.manager.delete(UserProfile, { id });
			}

			// Delete auth user
			await queryRunner.manager.delete(AuthUser, { id });

			await queryRunner.commitTransaction();
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw new BadRequestException('Failed to delete user: ' + error.message);
		} finally {
			await queryRunner.release();
		}
	}

	async searchUsers(criteria: UserSearchDto): Promise<UserResponseDto[]> {
		const users = await this.authUserRepository.searchUsers(criteria);
		return users.map((user) => this.mapToUserResponse(user));
	}
	/**
	 * Map AuthUser entity to UserResponseDto
	 * Private helper method for consistent response formatting
	 */
	private mapToUserResponse(user: AuthUser): UserResponseDto {
		return {
			id: user.id,
			email: user.email,
			username: user.profile?.username || '',
			role: {
				id: user.role.id,
				name: user.role.name,
			},
			phone_number: user.profile?.phone_number,
			address: user.profile?.address,
			city: user.profile?.city,
			state: user.profile?.state,
			postal_code: user.profile?.postal_code,
			country: user.profile?.country,
			profilepic: user.profile?.profilepic,
			created_at: user.created_at,
			updated_at: user.updated_at,
		};
	}

	/**
	 * Map Admin entity to UserResponseDto
	 * Private helper method for consistent response formatting
	 */
	private mapAdminToUserResponse(admin: Admin): UserResponseDto {
		return {
			id: admin.id,
			email: admin.email,
			username: admin.profile?.username || admin.name,
			role: {
				id: admin.role.id,
				name: admin.role.name,
			},
			phone_number: admin.profile?.phone_number,
			address: admin.profile?.address,
			city: admin.profile?.city,
			state: admin.profile?.state,
			postal_code: admin.profile?.postal_code,
			country: admin.profile?.country,
			profilepic: admin.profile?.profilepic,
			created_at: admin.created_at,
			updated_at: admin.updated_at,
		};
	}

	/**
	 * Map Staff entity to UserResponseDto
	 * Private helper method for consistent response formatting
	 */
	private mapStaffToUserResponse(staff: Staff): UserResponseDto {
		return {
			id: staff.id,
			email: staff.email,
			username: staff.profile?.username || staff.name,
			role: {
				id: staff.role.id,
				name: staff.role.name,
			},
			phone_number: staff.profile?.phone_number,
			address: staff.profile?.address,
			city: staff.profile?.city,
			state: staff.profile?.state,
			postal_code: staff.profile?.postal_code,
			country: staff.profile?.country,
			profilepic: staff.profile?.profilepic,
			created_at: staff.created_at,
			updated_at: staff.updated_at,
		};
	}

	/**
	 * TEMPORARY: Get all roles for development testing
	 * FIXME: Remove when auth is properly set up
	 */
	async getAllRoles() {
		return await this.roleRepository.find();
	}

	/**
	 * Get role hierarchy level for RBAC checks
	 * Higher number = higher privilege
	 */
	private getRoleLevel(roleName: string): number {
		const levels: Record<string, number> = {
			user: 1,
			staff: 2,
			admin: 3,
			superadmin: 4,
		};
		return levels[roleName] || 0;
	}

	/**
	 * Check if actor has permission to modify target user based on role hierarchy
	 */
	private canModifyUser(actorRole: string, targetRole: string, _actorId: string, _targetId: string): void {
		const actorLevel = this.getRoleLevel(actorRole);
		const targetLevel = this.getRoleLevel(targetRole);

		// Users cannot modify anyone (including themselves) through admin endpoints
		if (actorLevel <= 1) {
			throw new BadRequestException('Insufficient permissions to perform this action');
		}

		// Cannot modify users with equal or higher privilege
		if (targetLevel >= actorLevel) {
			throw new BadRequestException('Cannot modify users with equal or higher privileges');
		}
	}
}
