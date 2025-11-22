import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTaskStaffManyToMany1737536400000 implements MigrationInterface {
	name = 'UpdateTaskStaffManyToMany1737536400000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// 1. Update report_responses table - change attachment_path to attachment_paths (JSON array)
		await queryRunner.query(`
			ALTER TABLE "report_responses" 
			ADD COLUMN "attachment_paths" json
		`);

		// Migrate existing attachment_path data to attachment_paths array
		await queryRunner.query(`
			UPDATE "report_responses" 
			SET "attachment_paths" = json_build_array("attachment_path")
			WHERE "attachment_path" IS NOT NULL
		`);

		// Drop old attachment_path column
		await queryRunner.query(`
			ALTER TABLE "report_responses" 
			DROP COLUMN "attachment_path"
		`);

		// 2. Add GPS coordinates to report_responses
		await queryRunner.query(`
			ALTER TABLE "report_responses" 
			ADD COLUMN "lat" float,
			ADD COLUMN "lng" float
		`);

		// 3. Add is_reviewed flag to report_responses
		await queryRunner.query(`
			ALTER TABLE "report_responses" 
			ADD COLUMN "is_reviewed" boolean NOT NULL DEFAULT false
		`);

		// 4. Create junction table for many-to-many relationship between tasks and staff
		await queryRunner.query(`
			CREATE TABLE "task_staff_assignments" (
				"task_id" uuid NOT NULL,
				"staff_profile_id" uuid NOT NULL,
				CONSTRAINT "PK_task_staff_assignments" PRIMARY KEY ("task_id", "staff_profile_id")
			)
		`);

		// Add foreign keys
		await queryRunner.query(`
			ALTER TABLE "task_staff_assignments"
			ADD CONSTRAINT "FK_task_staff_assignments_task"
			FOREIGN KEY ("task_id") REFERENCES "tasks"("id")
			ON DELETE CASCADE ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE "task_staff_assignments"
			ADD CONSTRAINT "FK_task_staff_assignments_staff"
			FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id")
			ON DELETE CASCADE ON UPDATE CASCADE
		`);

		// Create indexes for better query performance
		await queryRunner.query(`
			CREATE INDEX "IDX_task_staff_assignments_task_id"
			ON "task_staff_assignments" ("task_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "IDX_task_staff_assignments_staff_profile_id"
			ON "task_staff_assignments" ("staff_profile_id")
		`);

		// 5. Migrate existing task assignments from tasks.assigned_to to junction table
		await queryRunner.query(`
			INSERT INTO "task_staff_assignments" ("task_id", "staff_profile_id")
			SELECT "id", "assigned_to"
			FROM "tasks"
			WHERE "assigned_to" IS NOT NULL
		`);

		// 6. Drop the old assigned_to column from tasks table
		await queryRunner.query(`
			ALTER TABLE "tasks" 
			DROP CONSTRAINT IF EXISTS "FK_task_assigned_to_staff_profile"
		`);

		await queryRunner.query(`
			ALTER TABLE "tasks" 
			DROP COLUMN "assigned_to"
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// 1. Re-add assigned_to column to tasks
		await queryRunner.query(`
			ALTER TABLE "tasks" 
			ADD COLUMN "assigned_to" uuid
		`);

		// Restore first assignment from junction table (if multiple staff, take first one)
		await queryRunner.query(`
			UPDATE "tasks" t
			SET "assigned_to" = (
				SELECT "staff_profile_id" 
				FROM "task_staff_assignments" 
				WHERE "task_id" = t."id" 
				LIMIT 1
			)
		`);

		// Add foreign key constraint back
		await queryRunner.query(`
			ALTER TABLE "tasks"
			ADD CONSTRAINT "FK_task_assigned_to_staff_profile"
			FOREIGN KEY ("assigned_to") REFERENCES "staff_profiles"("id")
			ON DELETE SET NULL ON UPDATE CASCADE
		`);

		// 2. Drop junction table
		await queryRunner.query(`DROP TABLE "task_staff_assignments"`);

		// 3. Remove is_reviewed from report_responses
		await queryRunner.query(`
			ALTER TABLE "report_responses" 
			DROP COLUMN "is_reviewed"
		`);

		// 4. Remove GPS coordinates from report_responses
		await queryRunner.query(`
			ALTER TABLE "report_responses" 
			DROP COLUMN "lat",
			DROP COLUMN "lng"
		`);

		// 5. Revert attachment_paths back to attachment_path
		await queryRunner.query(`
			ALTER TABLE "report_responses" 
			ADD COLUMN "attachment_path" varchar
		`);

		// Restore first attachment from array (if multiple, take first one)
		await queryRunner.query(`
			UPDATE "report_responses" 
			SET "attachment_path" = "attachment_paths"->0
			WHERE "attachment_paths" IS NOT NULL 
			AND json_array_length("attachment_paths") > 0
		`);

		await queryRunner.query(`
			ALTER TABLE "report_responses" 
			DROP COLUMN "attachment_paths"
		`);
	}
}
