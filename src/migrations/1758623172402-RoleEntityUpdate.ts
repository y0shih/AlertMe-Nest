import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleEntityUpdate1758623172402 implements MigrationInterface {
	name = 'RoleEntityUpdate1758623172402';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "admin" DROP CONSTRAINT "FK_fd32421f2d93414e46a8fcfd86b"`);
		await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "role_id"`);
		await queryRunner.query(`ALTER TABLE "admin" ADD "role_id" uuid NOT NULL`);
		await queryRunner.query(`ALTER TABLE "auth_users" DROP CONSTRAINT "FK_b9a6f5e2eb8d3372d2158cbd96f"`);
		await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "PK_c1433d71a4838793a49dcad46ab"`);
		await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "id"`);
		await queryRunner.query(`ALTER TABLE "roles" ADD "id" uuid NOT NULL`);
		await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id")`);
		await queryRunner.query(`ALTER TABLE "auth_users" DROP COLUMN "role_id"`);
		await queryRunner.query(`ALTER TABLE "auth_users" ADD "role_id" uuid NOT NULL`);
		await queryRunner.query(
			`ALTER TABLE "admin" ADD CONSTRAINT "FK_fd32421f2d93414e46a8fcfd86b" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "auth_users" ADD CONSTRAINT "FK_b9a6f5e2eb8d3372d2158cbd96f" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "auth_users" DROP CONSTRAINT "FK_b9a6f5e2eb8d3372d2158cbd96f"`);
		await queryRunner.query(`ALTER TABLE "admin" DROP CONSTRAINT "FK_fd32421f2d93414e46a8fcfd86b"`);
		await queryRunner.query(`ALTER TABLE "auth_users" DROP COLUMN "role_id"`);
		await queryRunner.query(`ALTER TABLE "auth_users" ADD "role_id" character varying NOT NULL`);
		await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "PK_c1433d71a4838793a49dcad46ab"`);
		await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "id"`);
		await queryRunner.query(`ALTER TABLE "roles" ADD "id" character varying NOT NULL`);
		await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id")`);
		await queryRunner.query(
			`ALTER TABLE "auth_users" ADD CONSTRAINT "FK_b9a6f5e2eb8d3372d2158cbd96f" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "role_id"`);
		await queryRunner.query(`ALTER TABLE "admin" ADD "role_id" character varying NOT NULL`);
		await queryRunner.query(
			`ALTER TABLE "admin" ADD CONSTRAINT "FK_fd32421f2d93414e46a8fcfd86b" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
	}
}
