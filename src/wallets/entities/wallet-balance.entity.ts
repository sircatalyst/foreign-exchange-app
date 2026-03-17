import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Unique,
	Index,
} from "typeorm";
import { Wallet } from "./wallet.entity";

@Entity("wallet_balances")
@Unique(["walletId", "currency"])
@Index(["walletId", "currency"])
export class WalletBalance {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "wallet_id" })
	walletId: string;

	@ManyToOne(() => Wallet, (wallet) => wallet.balances)
	@JoinColumn({ name: "wallet_id" })
	wallet: Wallet;

	@Column({ length: 10 })
	currency: string;

	@Column({
		type: "decimal",
		precision: 20,
		scale: 8,
		default: "0",
		transformer: {
			to: (value: string) => value,
			from: (value: string) => value,
		},
	})
	amount: string;

	@CreateDateColumn({ name: "created_at" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at" })
	updatedAt: Date;
}
