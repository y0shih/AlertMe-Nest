import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Report } from './report.entity';
import { AdminProfile } from './admin-profile.entity';
import { StaffProfile } from './staff-profile.entity';
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

	@ManyToOne(() => Report, (report) => report.tasks)
	@JoinColumn({ name: 'report_id' })
	report: Report;

	// Admin who assigned the task (references admin_profiles)
	@ManyToOne(() => AdminProfile, (adminProfile) => adminProfile.assignedTasks)
	@JoinColumn({ name: 'assigned_by' })
	assignedBy: AdminProfile;

	// Multiple staff members can be assigned to one task (many-to-many)
	@ManyToMany(() => StaffProfile, (staffProfile) => staffProfile.assignedTasks)
	@JoinTable({
		name: 'task_staff_assignments',
		joinColumn: { name: 'task_id', referencedColumnName: 'id' },
		inverseJoinColumn: { name: 'staff_profile_id', referencedColumnName: 'id' },
	})
	assignedStaff: StaffProfile[];

	@OneToMany(() => ReportResponse, (response) => response.task, { cascade: true })
	responses: ReportResponse[];
}
