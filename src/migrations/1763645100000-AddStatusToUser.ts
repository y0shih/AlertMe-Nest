import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToUser1763645100000 implements MigrationInterface {
	name = 'AddStatusToUser1763645100000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Create enum type if it doesn't exist
		await queryRunner.query(`
			DO $$ BEGIN
				CREATE TYPE "user_status_enum" AS ENUM('active', 'inactive');
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`);

		// Add status column with default value 'active'
		await queryRunner.query(`
			ALTER TABLE "auth_users" 
			ADD "status" "user_status_enum" NOT NULL DEFAULT 'active'
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Drop the status column
		await queryRunner.query(`ALTER TABLE "auth_users" DROP COLUMN "status"`);

		// Drop the enum type
		await queryRunner.query(`DROP TYPE "user_status_enum"`);
	}
}
