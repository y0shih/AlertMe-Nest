import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '../entities/auth-user.entity';

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
}
