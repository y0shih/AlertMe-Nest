import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthUser } from '../../entities/auth-user.entity';
import { UserProfile } from '../../entities/user-profile.entity';
import { Admin } from '../../entities/admin.entity';
import { AdminProfile } from '../../entities/admin-profile.entity';
import { Role } from '../../entities/role.entity';
import { AuthUserRepository } from './user.repository';
import { RoleRepository } from '../../repositories/role.repository';

@Module({
	imports: [TypeOrmModule.forFeature([AuthUser, UserProfile, Admin, AdminProfile, Role])],
	controllers: [UsersController],
	providers: [UsersService, AuthUserRepository, RoleRepository],
	exports: [UsersService], // Export for potential use by other modules
})
export class UsersModule {}
