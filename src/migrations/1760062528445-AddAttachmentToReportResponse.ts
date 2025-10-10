import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttachmentToReportResponse1760062528445 implements MigrationInterface {
	name = 'AddAttachmentToReportResponse1760062528445';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "staff" DROP CONSTRAINT "fk_staff_role"`);
		await queryRunner.query(`ALTER TABLE "staff_profiles" DROP CONSTRAINT "fk_staff_profiles_staff"`);
		await queryRunner.query(`ALTER TABLE "report_responses" DROP CONSTRAINT "FK_dbb27f35b0289c78318f029b5c1"`);
		await queryRunner.query(`ALTER TABLE "report_responses" DROP CONSTRAINT "fk_report_responses_responded_by_staff"`);
		await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_5770b28d72ca90c43b1381bf787"`);
		await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "fk_tasks_assigned_to_staff"`);
		await queryRunner.query(`ALTER TABLE "admin" DROP CONSTRAINT "FK_admin_role"`);
		await queryRunner.query(`ALTER TABLE "auth_users" DROP CONSTRAINT "FK_auth_users_role"`);
		await queryRunner.query(`ALTER TABLE "report_responses" ADD "attachment_path" character varying`);
		await queryRunner.query(`ALTER TABLE "staff" ALTER COLUMN "created_at" SET DEFAULT now()`);
		await queryRunner.query(`ALTER TABLE "staff" ALTER COLUMN "updated_at" SET DEFAULT now()`);
		await queryRunner.query(`ALTER TABLE "staff_profiles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
		await queryRunner.query(`ALTER TABLE "staff_profiles" ALTER COLUMN "created_at" SET DEFAULT now()`);
		await queryRunner.query(`ALTER TABLE "staff_profiles" ALTER COLUMN "updated_at" SET DEFAULT now()`);
		await queryRunner.query(
			`ALTER TABLE "staff" ADD CONSTRAINT "FK_c3fe01125c99573751fe5e55666" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "staff_profiles" ADD CONSTRAINT "FK_6d4c6c0b447e39147b4a6dcbede" FOREIGN KEY ("id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "report_responses" ADD CONSTRAINT "FK_dbb27f35b0289c78318f029b5c1" FOREIGN KEY ("responded_by") REFERENCES "staff_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "tasks" ADD CONSTRAINT "FK_5770b28d72ca90c43b1381bf787" FOREIGN KEY ("assigned_to") REFERENCES "staff_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_5770b28d72ca90c43b1381bf787"`);
		await queryRunner.query(`ALTER TABLE "report_responses" DROP CONSTRAINT "FK_dbb27f35b0289c78318f029b5c1"`);
		await queryRunner.query(`ALTER TABLE "staff_profiles" DROP CONSTRAINT "FK_6d4c6c0b447e39147b4a6dcbede"`);
		await queryRunner.query(`ALTER TABLE "staff" DROP CONSTRAINT "FK_c3fe01125c99573751fe5e55666"`);
		await queryRunner.query(`ALTER TABLE "staff_profiles" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
		await queryRunner.query(`ALTER TABLE "staff_profiles" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
		await queryRunner.query(`ALTER TABLE "staff_profiles" ALTER COLUMN "id" DROP DEFAULT`);
		await queryRunner.query(`ALTER TABLE "staff" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
		await queryRunner.query(`ALTER TABLE "staff" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
		await queryRunner.query(`ALTER TABLE "report_responses" DROP COLUMN "attachment_path"`);
		await queryRunner.query(
			`ALTER TABLE "auth_users" ADD CONSTRAINT "FK_auth_users_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "admin" ADD CONSTRAINT "FK_admin_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_assigned_to_staff" FOREIGN KEY ("assigned_to") REFERENCES "staff_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "tasks" ADD CONSTRAINT "FK_5770b28d72ca90c43b1381bf787" FOREIGN KEY ("assigned_to") REFERENCES "admin_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "report_responses" ADD CONSTRAINT "fk_report_responses_responded_by_staff" FOREIGN KEY ("responded_by") REFERENCES "staff_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "report_responses" ADD CONSTRAINT "FK_dbb27f35b0289c78318f029b5c1" FOREIGN KEY ("responded_by") REFERENCES "user_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "staff_profiles" ADD CONSTRAINT "fk_staff_profiles_staff" FOREIGN KEY ("id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "staff" ADD CONSTRAINT "fk_staff_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
	}
}
