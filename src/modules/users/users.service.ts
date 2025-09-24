import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../../entities/auth-user.entity';
import { UserProfile } from '../../entities/user-profile.entity';
import { Role } from '../../entities/role.entity';
import { AuthUserRepository } from '../../repositories/auth-user.repository';
import { CreateUserDto, UpdateUserDto, UserQueryDto, UserResponseDto, PaginatedUserResponse, UserSearchDto } from '../../dto/user.dto';

@Injectable()
export class UsersService {
	constructor(
		private readonly authUserRepository: AuthUserRepository,
		@InjectRepository(UserProfile)
		private readonly userProfileRepository: Repository<UserProfile>,
		@InjectRepository(Role)
		private readonly roleRepository: Repository<Role>,
	) {}

	/**
	 * Find all users with pagination and filtering
	 * Requirements: 1.1, 2.1, 2.2, 2.4
	 */
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

	/**
	 * Find user by ID with proper error handling
	 * Requirements: 3.1, 3.4
	 */
	async findById(id: string): Promise<UserResponseDto> {
		if (!id) {
			throw new BadRequestException('User ID is required');
		}

		const user = await this.authUserRepository.findOne({
			where: { id },
			relations: ['role', 'profile'],
		});

		if (!user) {
			throw new NotFoundException(`User with ID ${id} not found`);
		}

		return this.mapToUserResponse(user);
	}

	/**
	 * Find user by email
	 * Requirements: 2.3, 3.1
	 */
	async findByEmail(email: string): Promise<UserResponseDto> {
		if (!email) {
			throw new BadRequestException('Email is required');
		}

		const user = await this.authUserRepository.findByEmail(email);

		if (!user) {
			throw new NotFoundException(`User with email ${email} not found`);
		}

		return this.mapToUserResponse(user);
	}

	/**
	 * Create new user with role assignment
	 * Requirements: 4.1, 4.2
	 */
	async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
		const { email, username, role_id } = createUserDto;

		// Check if user with email already exists
		const existingUserByEmail = await this.authUserRepository.findByEmail(email);
		if (existingUserByEmail) {
			throw new ConflictException('User with this email already exists');
		}

		// Check if username is already taken
		const existingUserByUsername = await this.authUserRepository.findByUsernameOrEmail(username);
		if (existingUserByUsername && existingUserByUsername.profile?.username === username) {
			throw new ConflictException('Username is already taken');
		}

		// Validate role exists
		const role = await this.roleRepository.findOne({ where: { id: role_id } });
		if (!role) {
			throw new BadRequestException('Invalid role ID provided');
		}

		// Create user with profile in a transaction
		const queryRunner = this.authUserRepository.manager.connection.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Create auth user
			const authUser = queryRunner.manager.create(AuthUser, {
				email,
				role_id,
			});
			const savedAuthUser = await queryRunner.manager.save(authUser);

			// Create user profile
			const userProfile = queryRunner.manager.create(UserProfile, {
				id: savedAuthUser.id, // Use same ID as auth user
				username,
			});
			await queryRunner.manager.save(userProfile);

			await queryRunner.commitTransaction();

			// Fetch the complete user with relations
			const createdUser = await this.authUserRepository.findOne({
				where: { id: savedAuthUser.id },
				relations: ['role', 'profile'],
			});

			if (!createdUser) {
				throw new BadRequestException('Failed to retrieve created user');
			}

			return this.mapToUserResponse(createdUser);
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw new BadRequestException('Failed to create user: ' + error.message);
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Update user profile with validation and username uniqueness checks
	 * Requirements: 1.2, 3.1, 4.2
	 */
	async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
		if (!id) {
			throw new BadRequestException('User ID is required');
		}

		const user = await this.authUserRepository.findOne({
			where: { id },
			relations: ['role', 'profile'],
		});

		if (!user) {
			throw new NotFoundException(`User with ID ${id} not found`);
		}

		const { username, role_id } = updateUserDto;

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

			// Update user profile if username changed
			if (username && username !== user.profile?.username) {
				if (user.profile) {
					await queryRunner.manager.update(UserProfile, { id }, { username });
				} else {
					// Create profile if it doesn't exist
					const userProfile = queryRunner.manager.create(UserProfile, {
						id,
						username,
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

	/**
	 * Delete user with proper cleanup and cascade handling
	 * Requirements: 4.1, 4.2
	 */
	async deleteUser(id: string): Promise<void> {
		if (!id) {
			throw new BadRequestException('User ID is required');
		}

		const user = await this.authUserRepository.findOne({
			where: { id },
			relations: ['profile'],
		});

		if (!user) {
			throw new NotFoundException(`User with ID ${id} not found`);
		}

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

	/**
	 * Search users with multiple criteria
	 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
	 */
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
			created_at: user.created_at,
			updated_at: user.updated_at,
		};
	}

	/**
	 * TEMPORARY: Get all roles for development testing
	 * FIXME: Remove when auth is properly set up
	 */
	async getAllRoles() {
		return await this.roleRepository.find();
	}
}
