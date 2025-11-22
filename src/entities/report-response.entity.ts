import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Report } from './report.entity';
import { Task } from './task.entity';
import { StaffProfile } from './staff-profile.entity';

@Entity('report_responses')
export class ReportResponse {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	report_id: string;

	@Column({ type: 'uuid' })
	task_id: string;

	@Column({ type: 'uuid', nullable: true })
	responded_by: string;

	@Column({ type: 'text' })
	response_text: string;

	@Column({ type: 'json', nullable: true })
	attachment_paths?: string[];

	@Column({ type: 'float', nullable: true })
	lat?: number;

	@Column({ type: 'float', nullable: true })
	lng?: number;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	responded_at: Date;

	@ManyToOne(() => Report, (report) => report.responses)
	@JoinColumn({ name: 'report_id' })
	report: Report;

	@ManyToOne(() => Task, (task) => task.responses)
	@JoinColumn({ name: 'task_id' })
	task: Task;

	// Staff member who responded (references staff_profiles)
	@ManyToOne(() => StaffProfile, (staffProfile) => staffProfile.responses)
	@JoinColumn({ name: 'responded_by' })
	respondedBy: StaffProfile;
}
