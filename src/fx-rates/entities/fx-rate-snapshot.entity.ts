import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	Index,
} from "typeorm";

@Entity("fx_rate_snapshots")
@Index(["baseCurrency", "quoteCurrency", "snapshotAt"])
export class FxRateSnapshot {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "base_currency", length: 3 })
	baseCurrency: string;

	@Column({ name: "quote_currency", length: 3 })
	quoteCurrency: string;

	@Column({
		type: "decimal",
		precision: 20,
		scale: 8,
	})
	rate: string;

	@CreateDateColumn({ name: "snapshot_at", type: "timestamptz" })
	snapshotAt: Date;
}
