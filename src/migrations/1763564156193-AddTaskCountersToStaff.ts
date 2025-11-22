import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskCountersToStaff1763564156193 implements MigrationInterface {
	name = 'AddTaskCountersToStaff1763564156193';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "staff" ADD "task_given" integer NOT NULL DEFAULT '0'`);
		await queryRunner.query(`ALTER TABLE "staff" ADD "task_completed" integer NOT NULL DEFAULT '0'`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "task_completed"`);
		await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "task_given"`);
	}
}
