import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FxRateSnapshot } from "../entities/fx-rate-snapshot.entity";
import { FxRatesService } from "./fx-rates.service";
import { AppConfig } from "../../config";
import { LogService } from "../../logging/log.service";

@Injectable()
export class FxSnapshotService {
	constructor(
		@InjectRepository(FxRateSnapshot)
		private readonly snapshotRepo: Repository<FxRateSnapshot>,
		private readonly fxRatesService: FxRatesService,
		private readonly appConfig: AppConfig,
		private readonly logService: LogService,
	) {}

	@Cron("0 * * * *")
	async captureSnapshot(): Promise<void> {
		const baseCurrency = "NGN";
		const currencies = this.appConfig.supportedCurrencies;
		try {
			const rates = await this.fxRatesService.getRates(baseCurrency);

			const snapshots = currencies
				.filter((c) => c !== baseCurrency && rates[c])
				.map((currency) =>
					this.snapshotRepo.create({
						baseCurrency,
						quoteCurrency: currency,
						rate: rates[currency],
					}),
				);

			await this.snapshotRepo.save(snapshots);

			this.logService.log({
				Service: "FxSnapshotService",
				Method: "captureSnapshot",
				Action: "SNAPSHOT_CAPTURED",
				User: "system",
				Payload: { baseCurrency, count: snapshots.length },
			});
		} catch (error) {
			this.logService.error({
				Service: "FxSnapshotService",
				Method: "captureSnapshot",
				Action: "SNAPSHOT_FAILED",
				User: "system",
				Payload: { baseCurrency, error: (error as Error).message },
			});
		}
	}

	async getRateHistory(
		from: Date,
		to: Date,
		page: number = 1,
		limit: number = 20,
		currency?: string,
	): Promise<{
		snapshots: FxRateSnapshot[];
		total: number;
		page: number;
		limit: number;
	}> {
		const skip = (page - 1) * limit;

		const qb = this.snapshotRepo
			.createQueryBuilder("snap")
			.where("snap.snapshotAt BETWEEN :from AND :to", { from, to })
			.orderBy("snap.snapshotAt", "ASC")
			.skip(skip)
			.take(limit);

		if (currency) {
			qb.andWhere("snap.quoteCurrency = :currency", { currency });
		}

		const [snapshots, total] = await qb.getManyAndCount();

		return { snapshots, total, page, limit };
	}
}
