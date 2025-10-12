import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthUser } from '../../entities/auth-user.entity';
import { Role } from '../../entities/role.entity';
import { UserProfile } from '../../entities/user-profile.entity';
import { Staff } from '../../entities/staff.entity';
import { StaffProfile } from '../../entities/staff-profile.entity';
import { Admin } from '../../entities/admin.entity';
import { AdminProfile } from '../../entities/admin-profile.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
	imports: [TypeOrmModule.forFeature([AuthUser, Role, UserProfile, Staff, StaffProfile, Admin, AdminProfile])],
	controllers: [AuthController],
	providers: [AuthService, SupabaseAuthGuard, RolesGuard],
	exports: [AuthService, SupabaseAuthGuard, RolesGuard],
})
export class AuthModule {}
