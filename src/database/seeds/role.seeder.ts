import { DataSource } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { Admin } from '../../entities/admin.entity';
import { AdminProfile } from '../../entities/admin-profile.entity';

export class RoleSeeder {
	public static async run(dataSource: DataSource): Promise<void> {
		const roleRepository = dataSource.getRepository(Role);
		const adminRepository = dataSource.getRepository(Admin);

		// Check if roles already exist
		const existingRoles = await roleRepository.count();
		if (existingRoles > 0) {
			console.log('Roles already exist, skipping role creation');
		} else {
			// Create default roles
			const roles = [
				{
					id: '550e8400-e29b-41d4-a716-446655440001', // Fixed UUID for user role
					name: 'user',
				},
				{
					id: '550e8400-e29b-41d4-a716-446655440002', // Fixed UUID for staff role
					name: 'staff',
				},
				{
					id: '550e8400-e29b-41d4-a716-446655440003', // Fixed UUID for admin role
					name: 'admin',
				},
				{
					id: '550e8400-e29b-41d4-a716-446655440004', // Fixed UUID for superadmin role
					name: 'superadmin',
				},
			];

			for (const roleData of roles) {
				const role = roleRepository.create(roleData);
				await roleRepository.save(role);
				console.log(`Created role: ${roleData.name} with ID: ${roleData.id}`);
			}
		}

		// Check if default admin already exists
		const existingAdmin = await adminRepository.findOne({
			where: { email: 'admin@repora.com' },
		});

		if (existingAdmin) {
			console.log('Default admin already exists, skipping admin creation');
		} else {
			// Get admin role
			const adminRole = await roleRepository.findOne({
				where: { name: 'admin' },
			});

			if (!adminRole) {
				throw new Error('Admin role not found. Please run role seeder first.');
			}

			// Use transaction to create both admin and admin_profile
			const queryRunner = dataSource.createQueryRunner();
			await queryRunner.connect();
			await queryRunner.startTransaction();

			try {
				// Create admin
				const admin = queryRunner.manager.create(Admin, {
					id: '338843fa-ec21-4ed3-9977-1708ff6f52eb', // Fixed UUID for default admin
					email: 'admin@repora.com',
					name: 'System Administrator',
					role_id: adminRole.id,
				});
				const savedAdmin = await queryRunner.manager.save(admin);

				// Create admin profile
				const adminProfile = queryRunner.manager.create(AdminProfile, {
					id: savedAdmin.id,
					username: 'sysadmin',
				});
				await queryRunner.manager.save(adminProfile);

				await queryRunner.commitTransaction();
				console.log(`Created default admin: ${admin.email} with ID: ${admin.id}`);
				console.log('Note: Please create this admin in Supabase Auth with password');
			} catch (error) {
				await queryRunner.rollbackTransaction();
				throw error;
			} finally {
				await queryRunner.release();
			}
		}

		console.log('Role and admin seeder completed successfully');
	}
}
