import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { Admin } from './admin.entity';
import { Task } from './task.entity';

@Entity('admin_profiles')
export class AdminProfile {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar' })
	username: string;

	@Column({ type: 'varchar', nullable: true })
	phone_number?: string;

	@Column({ type: 'text', nullable: true })
	address?: string;

	@Column({ type: 'varchar', nullable: true })
	city?: string;

	@Column({ type: 'varchar', nullable: true })
	state?: string;

	@Column({ type: 'varchar', nullable: true })
	postal_code?: string;

	@Column({ type: 'varchar', nullable: true })
	country?: string;

	@Column({ type: 'varchar', nullable: true })
	profilepic?: string;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
	updated_at: Date;

	@OneToOne(() => Admin, (admin) => admin.profile, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'id' })
	admin: Admin;

	@OneToMany(() => Task, (task) => task.assignedBy)
	assignedTasks: Task[];
}
