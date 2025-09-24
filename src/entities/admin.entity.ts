import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Role } from './role.entity';
import { AdminProfile } from './admin-profile.entity';

@Entity('admin')
export class Admin {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', unique: true })
	email: string;

	@Column({ type: 'varchar' })
	name: string;

	@Column({ type: 'varchar' })
	role_id: string;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
	updated_at: Date;

	@ManyToOne(() => Role, { eager: true })
	@JoinColumn({ name: 'role_id' })
	role: Role;

	@OneToOne(() => AdminProfile, (profile) => profile.admin, { cascade: true })
	profile: AdminProfile;
}
