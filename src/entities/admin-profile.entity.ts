import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Admin } from './admin.entity';

@Entity('admin_profiles')
export class AdminProfile {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar' })
	username: string;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
	updated_at: Date;

	@OneToOne(() => Admin, (admin) => admin.profile, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'id' })
	admin: Admin;
}
