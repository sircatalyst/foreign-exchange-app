import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
	Index,
} from "typeorm";
import { Wallet } from "../../wallets/entities/wallet.entity";

export enum UserRole {
	USER = "user",
	ADMIN = "admin",
}

@Entity("users")
@Index(["role"])
@Index(["isVerified"])
export class User {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", unique: true, length: 255 })
	email: string;

	@Column({ name: "password_hash", select: false })
	passwordHash: string;

	@Column({ name: "first_name", length: 100 })
	firstName: string;

	@Column({ name: "last_name", length: 100 })
	lastName: string;

	@Column({ name: "is_verified", default: false })
	isVerified: boolean;

	@Column({ name: "otp_code", type: "varchar", nullable: true, length: 6 })
	otpCode: string | null;

	@Column({ name: "otp_expires_at", type: "timestamp", nullable: true })
	otpExpiresAt: Date | null;

	@Column({
		type: "enum",
		enum: UserRole,
		default: UserRole.USER,
	})
	role: UserRole;

	@CreateDateColumn({ name: "created_at" })
	createdAt: Date;

	@UpdateDateColumn({ name: "updated_at" })
	updatedAt: Date;

	@OneToOne(() => Wallet, (wallet) => wallet.user, { cascade: true })
	wallet: Wallet;
}
