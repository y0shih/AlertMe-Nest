import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { AuthUser } from './auth-user.entity';
import { Report } from './report.entity';

@Entity('user_profiles')
export class UserProfile {
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
	profilepic: string;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
	updated_at: Date;

	@OneToOne(() => AuthUser, (authUser) => authUser.profile, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'id' })
	authUser: AuthUser;

	@OneToMany(() => Report, (report) => report.user)
	reports: Report[];
}
