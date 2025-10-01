import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { Task } from './task.entity';
import { ReportResponse } from './report-response.entity';
import { ReportStatus } from '../enums/user-role.enum';

@Entity('reports')
export class Report {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar' })
	name: string;

	@Column({ type: 'text' })
	details: string;

	@Column({
		type: 'enum',
		enum: ReportStatus,
		default: ReportStatus.PENDING,
	})
	status: ReportStatus;

	@Column({ type: 'varchar', nullable: true })
	attachment_path: string;

	@Column({ type: 'float' })
	lat: number;

	@Column({ type: 'float' })
	lng: number;

	@Column({ type: 'uuid' })
	user_id: string;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
	updated_at: Date;

	@ManyToOne(() => UserProfile)
	@JoinColumn({ name: 'user_id' })
	user: UserProfile;

	@OneToMany(() => Task, (task) => task.report, { cascade: true })
	tasks: Task[];

	@OneToMany(() => ReportResponse, (response) => response.report, { cascade: true })
	responses: ReportResponse[];
}
