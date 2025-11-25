import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToStaff1763645000000 implements MigrationInterface {
	name = 'AddStatusToStaff1763645000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Create enum type if it doesn't exist
		await queryRunner.query(`
			DO $$ BEGIN
				CREATE TYPE "staff_status_enum" AS ENUM('active', 'inactive');
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`);

		// Add status column with default value 'active'
		await queryRunner.query(`
			ALTER TABLE "staff" 
			ADD "status" "staff_status_enum" NOT NULL DEFAULT 'active'
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Drop the status column
		await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "status"`);

		// Drop the enum type
		await queryRunner.query(`DROP TYPE "staff_status_enum"`);
	}
}
