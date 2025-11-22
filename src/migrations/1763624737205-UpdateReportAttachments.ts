import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateReportAttachments1763624737205 implements MigrationInterface {
	name = 'UpdateReportAttachments1763624737205';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Add new column
		await queryRunner.query(`ALTER TABLE "reports" ADD "attachment_paths" json`);

		// Migrate existing data: convert single string to JSON array
		await queryRunner.query(`
            UPDATE "reports" 
            SET "attachment_paths" = json_build_array("attachment_path") 
            WHERE "attachment_path" IS NOT NULL
        `);

		// Drop old column
		await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "attachment_path"`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Add old column
		await queryRunner.query(`ALTER TABLE "reports" ADD "attachment_path" character varying`);

		// Migrate data back: take first element of array
		await queryRunner.query(`
            UPDATE "reports" 
            SET "attachment_path" = "attachment_paths"->>0 
            WHERE "attachment_paths" IS NOT NULL AND json_array_length("attachment_paths") > 0
        `);

		// Drop new column
		await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "attachment_paths"`);
	}
}
