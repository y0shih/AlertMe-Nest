import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Role } from './role.entity';
import { StaffProfile } from './staff-profile.entity';

@Entity('staff')
export class Staff {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', unique: true })
	email: string;

	@Column({ type: 'varchar' })
	name: string;

	@Column({ type: 'uuid' })
	role_id: string;

	@Column({ type: 'boolean', default: true })
	is_new_user: boolean;

	@Column({ type: 'int', default: 0 })
	task_given: number;

	@Column({ type: 'int', default: 0 })
	task_completed: number;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
	updated_at: Date;

	@ManyToOne(() => Role, { eager: true })
	@JoinColumn({ name: 'role_id' })
	role: Role;

	@OneToOne(() => StaffProfile, (profile) => profile.staff, { cascade: true })
	profile: StaffProfile;
}
