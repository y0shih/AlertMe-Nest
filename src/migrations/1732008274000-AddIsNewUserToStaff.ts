import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsNewUserToStaff1732008274000 implements MigrationInterface {
	name = 'AddIsNewUserToStaff1732008274000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "staff" ADD "is_new_user" boolean NOT NULL DEFAULT true`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "is_new_user"`);
	}
}
