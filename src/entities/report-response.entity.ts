import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Report } from './report.entity';
import { Task } from './task.entity';
import { UserProfile } from './user-profile.entity';

@Entity('report_responses')
export class ReportResponse {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	report_id: string;

	@Column({ type: 'uuid' })
	task_id: string;

	@Column({ type: 'uuid' })
	responded_by: string;

	@Column({ type: 'text' })
	response_text: string;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	responded_at: Date;

	@ManyToOne(() => Report, { eager: true })
	@JoinColumn({ name: 'report_id' })
	report: Report;

	@ManyToOne(() => Task, { eager: true })
	@JoinColumn({ name: 'task_id' })
	task: Task;

	@ManyToOne(() => UserProfile, { eager: true })
	@JoinColumn({ name: 'responded_by' })
	respondedBy: UserProfile;
}
