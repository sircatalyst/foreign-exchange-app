import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1773766349724 implements MigrationInterface {
	name = "Migration1773766349724";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')`,
		);
		await queryRunner.query(
			`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password_hash" character varying NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "is_verified" boolean NOT NULL DEFAULT false, "otp_code" character varying(6), "otp_expires_at" TIMESTAMP, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_981f4b052442ff079fc3c0d0ac" ON "users" ("is_verified") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role") `,
		);
		await queryRunner.query(
			`CREATE TABLE "wallet_balances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "wallet_id" uuid NOT NULL, "currency" character varying(10) NOT NULL, "amount" numeric(20,8) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1b60b0d14369f9d839beb925a53" UNIQUE ("wallet_id", "currency"), CONSTRAINT "PK_eebe2c6f13f1a2de3457f8a885c" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_1b60b0d14369f9d839beb925a5" ON "wallet_balances" ("wallet_id", "currency") `,
		);
		await queryRunner.query(
			`CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_92558c08091598f7a4439586cd" UNIQUE ("user_id"), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TYPE "public"."transactions_type_enum" AS ENUM('funding', 'conversion', 'trade')`,
		);
		await queryRunner.query(
			`CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'completed', 'failed')`,
		);
		await queryRunner.query(
			`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "public"."transactions_type_enum" NOT NULL, "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'pending', "from_currency" character varying(10), "to_currency" character varying(10), "from_amount" numeric(20,8), "to_amount" numeric(20,8), "rate" numeric(20,8), "description" character varying(255) NOT NULL DEFAULT '', "idempotency_key" character varying(255), "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_cf7deade57337bfa5a1e73aadf" ON "transactions" ("user_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_f0a3677e1b8d83ff31f9300246" ON "transactions" ("user_id", "type") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_843ef91438dec68148bec2df9d" ON "transactions" ("user_id", "created_at") `,
		);
		await queryRunner.query(
			`CREATE TABLE "fx_rate_snapshots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "base_currency" character varying(3) NOT NULL, "quote_currency" character varying(3) NOT NULL, "rate" numeric(20,8) NOT NULL, "snapshot_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_dbeb9b5262e07e1cac7aabd408a" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_8f1462ef08a58ddbade7523b97" ON "fx_rate_snapshots" ("base_currency", "quote_currency", "snapshot_at") `,
		);
		await queryRunner.query(
			`ALTER TABLE "wallet_balances" ADD CONSTRAINT "FK_df71d0f9058318ebc25302aa365" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "wallets" ADD CONSTRAINT "FK_92558c08091598f7a4439586cda" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "transactions" ADD CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "transactions" DROP CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b"`,
		);
		await queryRunner.query(
			`ALTER TABLE "wallets" DROP CONSTRAINT "FK_92558c08091598f7a4439586cda"`,
		);
		await queryRunner.query(
			`ALTER TABLE "wallet_balances" DROP CONSTRAINT "FK_df71d0f9058318ebc25302aa365"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_8f1462ef08a58ddbade7523b97"`,
		);
		await queryRunner.query(`DROP TABLE "fx_rate_snapshots"`);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_843ef91438dec68148bec2df9d"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_f0a3677e1b8d83ff31f9300246"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_cf7deade57337bfa5a1e73aadf"`,
		);
		await queryRunner.query(`DROP TABLE "transactions"`);
		await queryRunner.query(
			`DROP TYPE "public"."transactions_status_enum"`,
		);
		await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
		await queryRunner.query(`DROP TABLE "wallets"`);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_1b60b0d14369f9d839beb925a5"`,
		);
		await queryRunner.query(`DROP TABLE "wallet_balances"`);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_981f4b052442ff079fc3c0d0ac"`,
		);
		await queryRunner.query(`DROP TABLE "users"`);
		await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
	}
}
