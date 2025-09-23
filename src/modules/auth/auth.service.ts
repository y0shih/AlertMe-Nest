import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthUser } from '../../entities/auth-user.entity';
import { Role } from '../../entities/role.entity';

@Injectable()
export class AuthService {
	private supabase: SupabaseClient;

	constructor(
		@InjectRepository(AuthUser)
		private authUserRepository: Repository<AuthUser>,
		@InjectRepository(Role)
		private roleRepository: Repository<Role>,
		private configService: ConfigService,
	) {
		// Initialize Supabase client
		const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || 'https://your-project.supabase.co';
		const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || 'your-anon-key';
		this.supabase = createClient(supabaseUrl, supabaseAnonKey);
	}

	async signUp(email: string, password: string, username: string) {
		try {
			const { data, error } = await this.supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						username,
					},
				},
			});

			if (error) {
				throw new Error(error.message);
			}

			// Sync with our database if user was created
			if (data.user) {
				await this.syncSupabaseUser(data.user);
				return {
					message: 'Registration successful! Please check your email for verification.',
					user: data.user,
				};
			}

			throw new Error('Registration failed');
		} catch (error) {
			throw new Error(error.message);
		}
	}

	async signIn(email: string, password: string) {
		try {
			const { data, error } = await this.supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				throw new Error('Invalid credentials');
			}

			if (data.user && data.session) {
				// Sync user data with our database
				await this.syncSupabaseUser(data.user);

				// Get user from our database with role information
				const user = await this.authUserRepository.findOne({
					where: { email },
					relations: ['role', 'profile'],
				});

				return {
					access_token: data.session.access_token,
					refresh_token: data.session.refresh_token,
					user: user,
				};
			}

			throw new Error('Login failed');
		} catch (error) {
			throw new Error(error.message);
		}
	}

	async signOut(accessToken: string) {
		try {
			const { error } = await this.supabase.auth.signOut();
			if (error) {
				throw new Error(error.message);
			}
			return { message: 'Sign out successful' };
		} catch (error) {
			throw new Error(error.message);
		}
	}

	async refreshToken(refreshToken: string) {
		try {
			const { data, error } = await this.supabase.auth.refreshSession({
				refresh_token: refreshToken,
			});

			if (error) {
				throw new Error(error.message);
			}

			return {
				access_token: data.session?.access_token,
				refresh_token: data.session?.refresh_token,
			};
		} catch (error) {
			throw new Error(error.message);
		}
	}

	async getUser(accessToken: string) {
		try {
			const {
				data: { user },
				error,
			} = await this.supabase.auth.getUser(accessToken);

			if (error) {
				throw new Error(error.message);
			}

			if (user) {
				await this.syncSupabaseUser(user);

				const dbUser = await this.authUserRepository.findOne({
					where: { email: user.email },
					relations: ['role', 'profile'],
				});

				return dbUser;
			}

			return null;
		} catch (error) {
			throw new Error(error.message);
		}
	}

	/**
	 * Sync Supabase Auth user with our database
	 * This ensures our user tables stay in sync with Supabase Auth
	 */
	private async syncSupabaseUser(supabaseUser: any) {
		try {
			// Check if user exists in our database
			let user = await this.authUserRepository.findOne({
				where: { email: supabaseUser.email },
				relations: ['profile'],
			});

			// Get default user role
			const userRole = await this.roleRepository.findOne({ where: { name: 'user' } });
			if (!userRole) {
				throw new Error('Default user role not found');
			}

			if (!user) {
				// Create user in our database
				user = this.authUserRepository.create({
					email: supabaseUser.email,
					role_id: userRole.id,
					profile: {
						username: supabaseUser.user_metadata?.username || supabaseUser.email.split('@')[0],
					},
				});

				await this.authUserRepository.save(user);
			} else {
				// Update user profile if needed
				if (supabaseUser.user_metadata?.username && !user.profile) {
					user.profile = {
						id: user.id,
						username: supabaseUser.user_metadata.username,
						created_at: user.created_at,
						updated_at: user.updated_at,
						authUser: user,
					} as any;

					await this.authUserRepository.save(user);
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
			const payload = JSON.parse(atob(token.split('.')[1]));
			const supabaseUserId = payload.sub;

			const {
				data: { user },
				error,
			} = await this.supabase.auth.getUser(token);

			if (error || !user) {
				return null;
			}

			return await this.authUserRepository.findOne({
				where: { email: user.email },
				relations: ['role', 'profile'],
			});
		} catch (error) {
			return null;
		}
	}
}
