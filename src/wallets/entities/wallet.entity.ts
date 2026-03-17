import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
	JoinColumn,
	OneToMany,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { WalletBalance } from "./wallet-balance.entity";

@Entity("wallets")
export class Wallet {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "user_id" })
	userId: string;

	@OneToOne(() => User, (user) => user.wallet)
	@JoinColumn({ name: "user_id" })
	user: User;

	@OneToMany(() => WalletBalance, (balance) => balance.wallet, {
		cascade: true,
	})
	balances: WalletBalance[];

	@CreateDateColumn({ name: "created_at" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at" })
	updatedAt: Date;
}
