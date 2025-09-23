import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { AuthUser } from './auth-user.entity';
import { Admin } from './admin.entity';

@Entity('roles')
export class Role {
	@PrimaryColumn({ type: 'uuid' })
	id: string;

	@Column({
		type: 'enum',
		enum: ['user', 'staff', 'admin', 'superadmin'],
		default: 'user',
	})
	name: string;

	@OneToMany(() => AuthUser, (authUser) => authUser.role)
	authUsers: AuthUser[];

	@OneToMany(() => Admin, (admin) => admin.role)
	admins: Admin[];
}
