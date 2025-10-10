import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from '../../entities/staff.entity';
import { StaffProfile } from '../../entities/staff-profile.entity';
import { Role } from '../../entities/role.entity';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [TypeOrmModule.forFeature([Staff, StaffProfile, Role]), AuthModule],
	controllers: [StaffController],
	providers: [StaffService],
	exports: [StaffService],
})
export class StaffModule {}
