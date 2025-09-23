import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Report } from './report.entity';
import { AdminProfile } from './admin-profile.entity';
import { UserProfile } from './user-profile.entity';
import { ReportResponse } from './report-response.entity';
import { TaskStatus } from '../enums/user-role.enum';

@Entity('tasks')
export class Task {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	report_id: string;

	@Column({ type: 'uuid' })
	assigned_by: string;

	@Column({ type: 'uuid' })
	assigned_to: string;

	@Column({ type: 'text', nullable: true })
	task_details: string;

	@Column({
		type: 'enum',
		enum: TaskStatus,
		default: TaskStatus.NOT_RECEIVED,
	})
	status: TaskStatus;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
	updated_at: Date;

	@ManyToOne(() => Report, { eager: true })
	@JoinColumn({ name: 'report_id' })
	report: Report;

	@ManyToOne(() => AdminProfile, { eager: true })
	@JoinColumn({ name: 'assigned_by' })
	assignedBy: AdminProfile;

	@ManyToOne(() => UserProfile, { eager: true })
	@JoinColumn({ name: 'assigned_to' })
	assignedTo: UserProfile;

	@OneToMany(() => ReportResponse, (response) => response.task, { cascade: true })
	responses: ReportResponse[];
}
