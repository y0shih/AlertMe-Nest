import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaffEntityAndPersonalFields1760000000000 implements MigrationInterface {
	name = 'AddStaffEntityAndPersonalFields1760000000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Create staff table
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "staff" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				"email" varchar UNIQUE NOT NULL,
				"name" varchar NOT NULL,
				"role_id" uuid NOT NULL,
				"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT "fk_staff_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id")
			)
		`);

		// Create staff_profiles table
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "staff_profiles" (
				"id" uuid PRIMARY KEY,
				"username" varchar NOT NULL,
				"phone_number" varchar,
				"address" text,
				"city" varchar,
				"state" varchar,
				"postal_code" varchar,
				"country" varchar,
				"profilepic" varchar,
				"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT "fk_staff_profiles_staff" FOREIGN KEY ("id") REFERENCES "staff"("id") ON DELETE CASCADE
			)
		`);

		// Add personal information fields to admin_profiles
		await queryRunner.query(`
			ALTER TABLE "admin_profiles"
			ADD COLUMN IF NOT EXISTS "phone_number" varchar,
			ADD COLUMN IF NOT EXISTS "address" text,
			ADD COLUMN IF NOT EXISTS "city" varchar,
			ADD COLUMN IF NOT EXISTS "state" varchar,
			ADD COLUMN IF NOT EXISTS "postal_code" varchar,
			ADD COLUMN IF NOT EXISTS "country" varchar,
			ADD COLUMN IF NOT EXISTS "profilepic" varchar
		`);

		// Add personal information fields to user_profiles
		await queryRunner.query(`
			ALTER TABLE "user_profiles"
			ADD COLUMN IF NOT EXISTS "phone_number" varchar,
			ADD COLUMN IF NOT EXISTS "address" text,
			ADD COLUMN IF NOT EXISTS "city" varchar,
			ADD COLUMN IF NOT EXISTS "state" varchar,
			ADD COLUMN IF NOT EXISTS "postal_code" varchar,
			ADD COLUMN IF NOT EXISTS "country" varchar,
			ADD COLUMN IF NOT EXISTS "profilepic" varchar
		`);

		// Update tasks.assigned_to to reference staff_profiles instead of admin_profiles
		// Note: This requires data migration if you have existing data
		await queryRunner.query(`
			-- Drop the existing foreign key constraint
			ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "fk_tasks_assigned_to";
			
			-- Make assigned_to nullable temporarily
			ALTER TABLE "tasks" ALTER COLUMN "assigned_to" DROP NOT NULL;
			
			-- Set all existing tasks assigned_to to NULL (you'll need to reassign them to staff)
			UPDATE "tasks" SET "assigned_to" = NULL WHERE "assigned_to" IS NOT NULL;
			
			-- Add new foreign key constraint referencing staff_profiles
			ALTER TABLE "tasks" 
			ADD CONSTRAINT "fk_tasks_assigned_to_staff" 
			FOREIGN KEY ("assigned_to") 
			REFERENCES "staff_profiles"("id");
		`);

		// Update report_responses.responded_by to reference staff_profiles instead of user_profiles
		await queryRunner.query(`
			-- Drop the existing foreign key constraint
			ALTER TABLE "report_responses" DROP CONSTRAINT IF EXISTS "fk_report_responses_responded_by";
			
			-- Make responded_by nullable temporarily
			ALTER TABLE "report_responses" ALTER COLUMN "responded_by" DROP NOT NULL;
			
			-- Set all existing responses responded_by to NULL
			UPDATE "report_responses" SET "responded_by" = NULL WHERE "responded_by" IS NOT NULL;
			
			-- Add new foreign key constraint referencing staff_profiles
			ALTER TABLE "report_responses" 
			ADD CONSTRAINT "fk_report_responses_responded_by_staff" 
			FOREIGN KEY ("responded_by") 
			REFERENCES "staff_profiles"("id");
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Revert report_responses.responded_by foreign key
		await queryRunner.query(`
			ALTER TABLE "report_responses" DROP CONSTRAINT IF EXISTS "fk_report_responses_responded_by_staff";
			ALTER TABLE "report_responses" 
			ADD CONSTRAINT "fk_report_responses_responded_by" 
			FOREIGN KEY ("responded_by") 
			REFERENCES "user_profiles"("id");
		`);

		// Revert tasks.assigned_to foreign key
		await queryRunner.query(`
			ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "fk_tasks_assigned_to_staff";
			ALTER TABLE "tasks" 
			ADD CONSTRAINT "fk_tasks_assigned_to" 
			FOREIGN KEY ("assigned_to") 
			REFERENCES "admin_profiles"("id");
		`);

		// Remove personal information fields from user_profiles
		await queryRunner.query(`
			ALTER TABLE "user_profiles"
			DROP COLUMN IF EXISTS "phone_number",
			DROP COLUMN IF EXISTS "address",
			DROP COLUMN IF EXISTS "city",
			DROP COLUMN IF EXISTS "state",
			DROP COLUMN IF EXISTS "postal_code",
			DROP COLUMN IF EXISTS "country",
			DROP COLUMN IF EXISTS "profilepic"
		`);

		// Remove personal information fields from admin_profiles
		await queryRunner.query(`
			ALTER TABLE "admin_profiles"
			DROP COLUMN IF EXISTS "phone_number",
			DROP COLUMN IF EXISTS "address",
			DROP COLUMN IF EXISTS "city",
			DROP COLUMN IF EXISTS "state",
			DROP COLUMN IF EXISTS "postal_code",
			DROP COLUMN IF EXISTS "country",
			DROP COLUMN IF EXISTS "profilepic"
		`);

		// Drop staff_profiles table
		await queryRunner.query(`DROP TABLE IF EXISTS "staff_profiles"`);

		// Drop staff table
		await queryRunner.query(`DROP TABLE IF EXISTS "staff"`);
	}
}
