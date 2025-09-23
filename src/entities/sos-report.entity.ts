import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UserProfile } from './user-profile.entity';

@Entity('sos_reports')
export class SosReport {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	user_id: string;

	@Column({ type: 'float' })
	lat: number;

	@Column({ type: 'float' })
	lng: number;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@ManyToOne(() => UserProfile, { eager: true })
	@JoinColumn({ name: 'user_id' })
	user: UserProfile;
}
