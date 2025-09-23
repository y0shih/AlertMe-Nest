import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { AuthUser } from './auth-user.entity';

@Entity('user_profiles')
export class UserProfile {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar' })
	username: string;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
	updated_at: Date;

	@OneToOne(() => AuthUser, (authUser) => authUser.profile, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'id' })
	authUser: AuthUser;
}
