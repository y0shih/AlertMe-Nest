import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1763624737203 implements MigrationInterface {
	name = 'Migrations1763624737203';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "staff_profiles" ADD "email" character varying`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "staff_profiles" DROP COLUMN "email"`);
	}
}
