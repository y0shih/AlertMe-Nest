import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Role } from './role.entity';
import { UserProfile } from './user-profile.entity';

@Entity('auth_users')
export class AuthUser {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', unique: true })
	email: string;

	// Removed password field - handled by Supabase Auth
	// @Column({ type: 'varchar' })
	// password: string;

	@Column({ type: 'varchar', nullable: true })
	supabase_id: string; // Supabase Auth user ID for syncing

	@Column({ type: 'varchar' })
	role_id: string;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
	updated_at: Date;

	@ManyToOne(() => Role, { eager: true })
	@JoinColumn({ name: 'role_id' })
	role: Role;

	@OneToOne(() => UserProfile, (profile) => profile.authUser, { cascade: true })
	profile: UserProfile;
}
