import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

export enum TransactionType {
	FUNDING = "funding",
	CONVERSION = "conversion",
	TRADE = "trade",
}

export enum TransactionStatus {
	PENDING = "pending",
	COMPLETED = "completed",
	FAILED = "failed",
}

@Entity("transactions")
@Index(["userId", "createdAt"])
@Index(["userId", "type"])
@Index(["userId", "idempotencyKey"], {
	unique: true,
	where: '"idempotency_key" IS NOT NULL',
})
export class Transaction {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "user_id" })
	userId: string;

	@ManyToOne(() => User)
	@JoinColumn({ name: "user_id" })
	user: User;

	@Column({
		type: "enum",
		enum: TransactionType,
	})
	type: TransactionType;

	@Column({
		type: "enum",
		enum: TransactionStatus,
		default: TransactionStatus.PENDING,
	})
	status: TransactionStatus;

	@Column({
		name: "from_currency",
		type: "varchar",
		nullable: true,
		length: 10,
	})
	fromCurrency: string | null;

	@Column({
		name: "to_currency",
		type: "varchar",
		nullable: true,
		length: 10,
	})
	toCurrency: string | null;

	@Column({
		name: "from_amount",
		type: "decimal",
		precision: 20,
		scale: 8,
		nullable: true,
		transformer: { to: (v: string) => v, from: (v: string) => v },
	})
	fromAmount: string | null;

	@Column({
		name: "to_amount",
		type: "decimal",
		precision: 20,
		scale: 8,
		nullable: true,
		transformer: { to: (v: string) => v, from: (v: string) => v },
	})
	toAmount: string | null;

	@Column({
		type: "decimal",
		precision: 20,
		scale: 8,
		nullable: true,
		transformer: { to: (v: string) => v, from: (v: string) => v },
	})
	rate: string | null;

	@Column({ length: 255, default: "" })
	description: string;

	@Column({
		name: "idempotency_key",
		type: "varchar",
		nullable: true,
		length: 255,
	})
	idempotencyKey: string | null;

	@Column({ type: "jsonb", nullable: true })
	metadata: Record<string, unknown> | null;

	@CreateDateColumn({ name: "created_at" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at" })
	updatedAt: Date;
}
