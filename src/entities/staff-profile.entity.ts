import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany, ManyToMany } from 'typeorm';
import { Staff } from './staff.entity';
import { ReportResponse } from './report-response.entity';
import { Task } from './task.entity';

@Entity('staff_profiles')
export class StaffProfile {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', nullable: true })
	email: string;

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

	@OneToOne(() => Staff, (staff) => staff.profile, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'id' })
	staff: Staff;

	@ManyToMany(() => Task, (task) => task.assignedStaff)
	assignedTasks: Task[];

	@OneToMany(() => ReportResponse, (response) => response.respondedBy)
	responses: ReportResponse[];
}
