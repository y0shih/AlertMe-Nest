import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, Provider } from '@supabase/supabase-js';
import { AuthUser } from '../../entities/auth-user.entity';
import { Role } from '../../entities/role.entity';
import { UserProfile } from '../../entities/user-profile.entity';
import { Staff } from '../../entities/staff.entity';
import { StaffProfile } from '../../entities/staff-profile.entity';
import { Admin } from '../../entities/admin.entity';
import { AdminProfile } from '../../entities/admin-profile.entity';

@Injectable()
export class AuthService {
	private supabase: SupabaseClient;

	constructor(
		@InjectRepository(AuthUser)
		private authUserRepository: Repository<AuthUser>,
		@InjectRepository(Role)
		private roleRepository: Repository<Role>,
		@InjectRepository(UserProfile)
		private userProfileRepository: Repository<UserProfile>,
		@InjectRepository(Staff)
		private staffRepository: Repository<Staff>,
		@InjectRepository(StaffProfile)
		private staffProfileRepository: Repository<StaffProfile>,
		@InjectRepository(Admin)
		private adminRepository: Repository<Admin>,
		@InjectRepository(AdminProfile)
		private adminProfileRepository: Repository<AdminProfile>,
		private configService: ConfigService,
	) {
		// Initialize Supabase client
		const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || 'https://your-project.supabase.co';
		const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || 'your-anon-key';
		this.supabase = createClient(supabaseUrl, supabaseAnonKey);
	}

	async signUp(email: string, password: string, username: string, phone_number?: string) {
		try {
			// Check if user already exists
			const existingUser = await this.authUserRepository.findOne({ where: { email } });
			if (existingUser) {
				throw new ConflictException('User with this email already exists');
			}

			const { data, error } = await this.supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						username,
						phone_number,
					},
				},
			});

			if (error) {
				throw new BadRequestException(error.message);
			}

			// Sync with our database if user was created
			if (data.user) {
				await this.syncSupabaseUser(data.user, { username, phone_number });
				return {
					message: 'Registration successful! Please check your email for verification.',
					user: data.user,
					requiresEmailVerification: true,
				};
			}

			throw new BadRequestException('Registration failed');
		} catch (error) {
			if (error instanceof ConflictException || error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException(error instanceof Error ? error.message : 'Registration failed');
		}
	}

	async registerStaff(email: string, password: string, username: string, name: string, phone_number?: string) {
		try {
			// Check if staff with email already exists
			const existingStaff = await this.staffRepository.findOne({ where: { email } });
			if (existingStaff) {
				throw new ConflictException('Staff with this email already exists');
			}

			// Check if username is already taken
			const existingStaffProfile = await this.staffProfileRepository.findOne({ where: { username } });
			if (existingStaffProfile) {
				throw new ConflictException('Username is already taken');
			}

			// Create user in Supabase Auth
			const { data, error } = await this.supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						username,
						phone_number,
						user_type: 'staff',
					},
				},
			});

			if (error) {
				throw new BadRequestException(error.message);
			}

			// Get staff role
			const staffRole = await this.roleRepository.findOne({ where: { name: 'staff' } });
			if (!staffRole) {
				throw new BadRequestException('Staff role not found');
			}

			// Create staff in our database if Supabase user was created
			if (data.user) {
				const queryRunner = this.staffRepository.manager.connection.createQueryRunner();
				await queryRunner.connect();
				await queryRunner.startTransaction();

				try {
					// Create staff
					const staff = queryRunner.manager.create(Staff, {
						email,
						name,
						role_id: staffRole.id,
					});
					const savedStaff = await queryRunner.manager.save(staff);

					// Create staff profile
					const staffProfile = queryRunner.manager.create(StaffProfile, {
						id: savedStaff.id,
						username,
						phone_number,
					});
					await queryRunner.manager.save(staffProfile);

					await queryRunner.commitTransaction();

					return {
						message: 'Staff registration successful!',
						staff: {
							id: savedStaff.id,
							email: savedStaff.email,
							name: savedStaff.name,
							username,
							role: staffRole.name,
						},
						requiresEmailVerification: false, // Admin created, so no email verification needed
					};
				} catch (dbError) {
					await queryRunner.rollbackTransaction();
					// If database creation fails, try to delete the Supabase user
					await this.supabase.auth.admin.deleteUser(data.user.id);
					throw new BadRequestException('Failed to create staff: ' + (dbError instanceof Error ? dbError.message : 'Unknown error'));
				} finally {
					await queryRunner.release();
				}
			}

			throw new BadRequestException('Staff registration failed');
		} catch (error) {
			if (error instanceof ConflictException || error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException(error instanceof Error ? error.message : 'Staff registration failed');
		}
	}

	async signIn(email: string, password: string) {
		try {
			const { data, error } = await this.supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				throw new UnauthorizedException('Invalid credentials');
			}

			if (data.user && data.session) {
				// Sync user data with our database
				await this.syncSupabaseUser(data.user);

				// Get user from our database with role information
				// Check hierarchy: Admin -> Staff -> User
				let user: any = await this.adminRepository.findOne({
					where: { email },
					relations: ['role', 'profile'],
				});

				if (!user) {
					const staff = await this.staffRepository.findOne({
						where: { email },
						relations: ['role', 'profile'],
					});
					user = staff;
				}

				if (!user) {
					const authUser = await this.authUserRepository.findOne({
						where: { email },
						relations: ['role', 'profile'],
					});
					user = authUser;
				}

				return {
					access_token: data.session.access_token,
					refresh_token: data.session.refresh_token,
					user: user,
					expires_in: data.session.expires_in,
					expires_at: data.session.expires_at,
				};
			}

			throw new UnauthorizedException('Login failed');
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}
			throw new UnauthorizedException(error instanceof Error ? error.message : 'Login failed');
		}
	}

	async signOut(_accessToken: string) {
		try {
			const { error } = await this.supabase.auth.signOut();
			if (error) {
				throw new BadRequestException(error.message);
			}
			return { message: 'Sign out successful' };
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException(error instanceof Error ? error.message : 'Sign out failed');
		}
	}

	async refreshToken(refreshToken: string) {
		try {
			const { data, error } = await this.supabase.auth.refreshSession({
				refresh_token: refreshToken,
			});

			if (error) {
				throw new UnauthorizedException(error.message);
			}

			return {
				access_token: data.session?.access_token,
				refresh_token: data.session?.refresh_token,
				expires_in: data.session?.expires_in,
				expires_at: data.session?.expires_at,
			};
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}
			throw new UnauthorizedException(error instanceof Error ? error.message : 'Token refresh failed');
		}
	}

	async getUser(accessToken: string) {
		try {
			const {
				data: { user },
				error,
			} = await this.supabase.auth.getUser(accessToken);

			if (error) {
				throw new UnauthorizedException(error.message);
			}

			if (user) {
				await this.syncSupabaseUser(user);

				// Check hierarchy: Admin -> Staff -> User
				let dbUser: any = await this.adminRepository.findOne({
					where: { email: user.email },
					relations: ['role', 'profile'],
				});

				if (!dbUser) {
					dbUser = await this.staffRepository.findOne({
						where: { email: user.email },
						relations: ['role', 'profile'],
					});
				}

				if (!dbUser) {
					dbUser = await this.authUserRepository.findOne({
						where: { email: user.email },
						relations: ['role', 'profile'],
					});
				}

				return dbUser;
			}

			return null;
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}
			throw new UnauthorizedException(error instanceof Error ? error.message : 'Failed to get user');
		}
	}

	/**
	 * Sync Supabase Auth user with our database
	 * This ensures our user tables stay in sync with Supabase Auth
	 */
	private async syncSupabaseUser(supabaseUser: any, additionalData?: { username?: string; phone_number?: string }) {
		try {
			// Check if user exists in our database
			let user = await this.authUserRepository.findOne({
				where: { email: supabaseUser.email },
				relations: ['profile'],
			});

			// Get default user role
			const userRole = await this.roleRepository.findOne({ where: { name: 'user' } });
			if (!userRole) {
				throw new BadRequestException('Default user role not found');
			}

			if (!user) {
				// Create user in our database
				user = this.authUserRepository.create({
					email: supabaseUser.email,
					supabase_id: supabaseUser.id,
					role_id: userRole.id,
				});

				await this.authUserRepository.save(user);

				// Create user profile
				const username =
					additionalData?.username || supabaseUser.user_metadata?.username || supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0];

				const profile = this.userProfileRepository.create({
					id: user.id,
					username,
					phone_number: additionalData?.phone_number || supabaseUser.user_metadata?.phone_number,
					profilepic: supabaseUser.user_metadata?.avatar_url,
				});

				await this.userProfileRepository.save(profile);
			} else {
				// Update supabase_id if not set
				if (!user.supabase_id && supabaseUser.id) {
					user.supabase_id = supabaseUser.id;
					await this.authUserRepository.save(user);
				}

				// Update user profile if needed
				if (!user.profile) {
					const username =
						additionalData?.username || supabaseUser.user_metadata?.username || supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0];

					const profile = this.userProfileRepository.create({
						id: user.id,
						username,
						phone_number: additionalData?.phone_number || supabaseUser.user_metadata?.phone_number,
						profilepic: supabaseUser.user_metadata?.avatar_url,
					});

					await this.userProfileRepository.save(profile);
				} else if (supabaseUser.user_metadata?.avatar_url && !user.profile.profilepic) {
					// Update profile picture from OAuth provider
					user.profile.profilepic = supabaseUser.user_metadata.avatar_url;
					await this.userProfileRepository.save(user.profile);
				}
			}

			return user;
		} catch (error) {
			console.error('Error syncing Supabase user:', error);
			throw error;
		}
	}

	/**
	 * Get user by Supabase JWT token
	 */
	async getUserFromToken(token: string): Promise<AuthUser | null> {
		try {
			const {
				data: { user },
				error,
			} = await this.supabase.auth.getUser(token);

			if (error || !user) {
				return null;
			}

			// Check hierarchy: Admin -> Staff -> User
			let dbUser: any = await this.adminRepository.findOne({
				where: { email: user.email },
				relations: ['role', 'profile'],
			});

			if (!dbUser) {
				dbUser = await this.staffRepository.findOne({
					where: { email: user.email },
					relations: ['role', 'profile'],
				});
			}

			if (!dbUser) {
				dbUser = await this.authUserRepository.findOne({
					where: { email: user.email },
					relations: ['role', 'profile'],
				});
			}

			return dbUser;
		} catch (_error) {
			return null;
		}
	}

	/**
	 * Initiate OAuth sign-in with a provider
	 */
	async signInWithOAuth(provider: Provider, redirectTo?: string) {
		try {
			const { data, error } = await this.supabase.auth.signInWithOAuth({
				provider,
				options: {
					redirectTo: redirectTo || `${this.configService.get<string>('APP_URL')}/auth/callback`,
				},
			});

			if (error) {
				throw new BadRequestException(error.message);
			}

			return {
				url: data.url,
				provider: data.provider,
			};
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException(error instanceof Error ? error.message : 'OAuth sign-in failed');
		}
	}

	/**
	 * Handle OAuth callback
	 */
	async handleOAuthCallback(code: string) {
		try {
			const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);

			if (error) {
				throw new BadRequestException(error.message);
			}

			if (data.user && data.session) {
				// Sync OAuth user with our database
				await this.syncSupabaseUser(data.user);

				// Get user from our database
				const user = await this.authUserRepository.findOne({
					where: { email: data.user.email },
					relations: ['role', 'profile'],
				});

				return {
					access_token: data.session.access_token,
					refresh_token: data.session.refresh_token,
					user: user,
					expires_in: data.session.expires_in,
					expires_at: data.session.expires_at,
				};
			}

			throw new BadRequestException('OAuth callback failed');
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException(error instanceof Error ? error.message : 'OAuth callback failed');
		}
	}

	/**
	 * Request password reset email
	 */
	async requestPasswordReset(email: string) {
		try {
			const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${this.configService.get<string>('APP_URL')}/auth/reset-password`,
			});

			if (error) {
				throw new BadRequestException(error.message);
			}

			return {
				message: 'Password reset email sent. Please check your inbox.',
			};
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException(error instanceof Error ? error.message : 'Password reset request failed');
		}
	}

	/**
	 * Update password with reset token
	 */
	async resetPassword(accessToken: string, newPassword: string) {
		try {
			// Set the session using the access token from email link
			const { error: sessionError } = await this.supabase.auth.setSession({
				access_token: accessToken,
				refresh_token: accessToken, // In password reset flow, the token works for both
			});

			if (sessionError) {
				throw new UnauthorizedException('Invalid or expired reset token');
			}

			// Update the password
			const { error } = await this.supabase.auth.updateUser({
				password: newPassword,
			});

			if (error) {
				throw new BadRequestException(error.message);
			}

			return {
				message: 'Password successfully reset',
			};
		} catch (error) {
			if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException(error instanceof Error ? error.message : 'Password reset failed');
		}
	}

	/**
	 * Update password for authenticated user
	 */
	async updatePassword(currentPassword: string, newPassword: string, email: string) {
		try {
			// Verify current password
			const { error: signInError } = await this.supabase.auth.signInWithPassword({
				email,
				password: currentPassword,
			});

			if (signInError) {
				throw new UnauthorizedException('Current password is incorrect');
			}

			// Update to new password
			const { error } = await this.supabase.auth.updateUser({
				password: newPassword,
			});

			if (error) {
				throw new BadRequestException(error.message);
			}

			return {
				message: 'Password successfully updated',
			};
		} catch (error) {
			if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException(error instanceof Error ? error.message : 'Password update failed');
		}
	}

	/**
	 * Resend verification email
	 */
	async resendVerificationEmail(email: string) {
		try {
			const { error } = await this.supabase.auth.resend({
				type: 'signup',
				email,
			});

			if (error) {
				throw new BadRequestException(error.message);
			}

			return {
				message: 'Verification email sent. Please check your inbox.',
			};
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException(error instanceof Error ? error.message : 'Failed to resend verification email');
		}
	}
}
