import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CacheModule } from "@nestjs/cache-manager";
import KeyvRedis from "@keyv/redis";
import { FxRatesService } from "./services/fx-rates.service";
import { FxSnapshotService } from "./services/fx-snapshot.service";
import { FxRatesController } from "./controllers/fx-rates.controller";
import { FxRateSnapshot } from "./entities/fx-rate-snapshot.entity";
import { AppConfig } from "../config";

@Module({
	imports: [
		TypeOrmModule.forFeature([FxRateSnapshot]),
		CacheModule.registerAsync({
			inject: [AppConfig],
			useFactory: async (appConfig: AppConfig) => ({
				stores: [
					new KeyvRedis(
						`redis://${appConfig.redisHost}:${appConfig.redisPort}`,
					),
				],
			}),
		}),
	],
	controllers: [FxRatesController],
	providers: [FxRatesService, FxSnapshotService],
	exports: [FxRatesService],
})
export class FxRatesModule {}
