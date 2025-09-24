import { DataSource } from 'typeorm';
import { Role } from '../../entities/role.entity';

export class RoleSeeder {
	public static async run(dataSource: DataSource): Promise<void> {
		const roleRepository = dataSource.getRepository(Role);

		// Check if roles already exist
		const existingRoles = await roleRepository.count();
		if (existingRoles > 0) {
			console.log('Roles already exist, skipping seeder');
			return;
		}

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

		console.log('Role seeder completed successfully');
	}
}
