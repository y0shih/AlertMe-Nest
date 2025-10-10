import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixRoleIdDataType1760000000001 implements MigrationInterface {
	name = 'FixRoleIdDataType1760000000001';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Fix admin.role_id column type from varchar to uuid
		await queryRunner.query(`
			-- Drop foreign key constraint if exists
			ALTER TABLE "admin" DROP CONSTRAINT IF EXISTS "FK_admin_role";
			
			-- Change column type to uuid
			ALTER TABLE "admin" 
			ALTER COLUMN "role_id" TYPE uuid USING "role_id"::uuid;
			
			-- Re-add foreign key constraint
			ALTER TABLE "admin" 
			ADD CONSTRAINT "FK_admin_role" 
			FOREIGN KEY ("role_id") 
			REFERENCES "roles"("id");
		`);

		// Fix auth_users.role_id column type from varchar to uuid
		await queryRunner.query(`
			-- Drop foreign key constraint if exists
			ALTER TABLE "auth_users" DROP CONSTRAINT IF EXISTS "FK_auth_users_role";
			
			-- Change column type to uuid
			ALTER TABLE "auth_users" 
			ALTER COLUMN "role_id" TYPE uuid USING "role_id"::uuid;
			
			-- Re-add foreign key constraint
			ALTER TABLE "auth_users" 
			ADD CONSTRAINT "FK_auth_users_role" 
			FOREIGN KEY ("role_id") 
			REFERENCES "roles"("id");
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Revert auth_users.role_id to varchar
		await queryRunner.query(`
			ALTER TABLE "auth_users" DROP CONSTRAINT IF EXISTS "FK_auth_users_role";
			ALTER TABLE "auth_users" 
			ALTER COLUMN "role_id" TYPE varchar USING "role_id"::varchar;
			ALTER TABLE "auth_users" 
			ADD CONSTRAINT "FK_auth_users_role" 
			FOREIGN KEY ("role_id") 
			REFERENCES "roles"("id");
		`);

		// Revert admin.role_id to varchar
		await queryRunner.query(`
			ALTER TABLE "admin" DROP CONSTRAINT IF EXISTS "FK_admin_role";
			ALTER TABLE "admin" 
			ALTER COLUMN "role_id" TYPE varchar USING "role_id"::varchar;
			ALTER TABLE "admin" 
			ADD CONSTRAINT "FK_admin_role" 
			FOREIGN KEY ("role_id") 
			REFERENCES "roles"("id");
		`);
	}
}
