import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '../entities/auth-user.entity';
import { UserQueryDto, UserSearchDto } from '../dto/user.dto';

@Injectable()
export class AuthUserRepository extends Repository<AuthUser> {
	constructor(private dataSource: DataSource) {
		super(AuthUser, dataSource.createEntityManager());
	}

	async findByEmail(email: string): Promise<AuthUser | null> {
		return this.findOne({
			where: { email },
			relations: ['role', 'profile'],
		});
	}

	async findUsersWithProfiles(): Promise<AuthUser[]> {
		return this.find({
			relations: ['role', 'profile'],
		});
	}

	/**
	 * Find users with pagination support
	 * Requirement 2.1: WHEN an admin searches users by username THEN the system SHALL return matching user profiles with pagination
	 */
	async findWithPagination(query: UserQueryDto): Promise<{ users: AuthUser[]; total: number }> {
		const { page = 1, limit = 10, search, role } = query;
		const skip = (page - 1) * limit;

		const queryBuilder = this.createQueryBuilder('user').leftJoinAndSelect('user.role', 'role').leftJoinAndSelect('user.profile', 'profile');

		// Apply search filter if provided
		if (search) {
			queryBuilder.andWhere('(LOWER(profile.username) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))', { search: `%${search}%` });
		}

		// Apply role filter if provided
		// Requirement 2.2: WHEN an admin filters users by role THEN the system SHALL return users with the specified role
		if (role) {
			queryBuilder.andWhere('LOWER(role.name) = LOWER(:role)', { role });
		}

		// Get total count for pagination
		const total = await queryBuilder.getCount();

		// Apply pagination
		const users = await queryBuilder.orderBy('user.created_at', 'DESC').skip(skip).take(limit).getMany();

		return { users, total };
	}

	/**
	 * Search users with multiple criteria
	 * Requirement 2.4: WHEN searching with multiple criteria THEN the system SHALL apply AND logic between filters
	 */
	async searchUsers(criteria: UserSearchDto): Promise<AuthUser[]> {
		const queryBuilder = this.createQueryBuilder('user').leftJoinAndSelect('user.role', 'role').leftJoinAndSelect('user.profile', 'profile');

		let hasConditions = false;

		// Search by username
		if (criteria.username) {
			queryBuilder.andWhere('LOWER(profile.username) LIKE LOWER(:username)', {
				username: `%${criteria.username}%`,
			});
			hasConditions = true;
		}

		// Search by email
		// Requirement 2.3: WHEN an admin searches users by email THEN the system SHALL return matching users
		if (criteria.email) {
			queryBuilder.andWhere('LOWER(user.email) LIKE LOWER(:email)', {
				email: `%${criteria.email}%`,
			});
			hasConditions = true;
		}

		// Filter by role
		if (criteria.role) {
			queryBuilder.andWhere('LOWER(role.name) = LOWER(:role)', { role: criteria.role });
			hasConditions = true;
		}

		// If no criteria provided, return empty array
		// Requirement 2.5: WHEN no users match the criteria THEN the system SHALL return an empty result set
		if (!hasConditions) {
			return [];
		}

		return queryBuilder.orderBy('user.created_at', 'DESC').getMany();
	}

	/**
	 * Find user by username or email for flexible lookup
	 * Supports both username and email-based searches
	 */
	async findByUsernameOrEmail(identifier: string): Promise<AuthUser | null> {
		return this.createQueryBuilder('user')
			.leftJoinAndSelect('user.role', 'role')
			.leftJoinAndSelect('user.profile', 'profile')
			.where('LOWER(user.email) = LOWER(:identifier)', { identifier })
			.orWhere('LOWER(profile.username) = LOWER(:identifier)', { identifier })
			.getOne();
	}
}
