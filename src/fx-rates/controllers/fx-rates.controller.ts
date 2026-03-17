import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { FxRatesService } from "../services/fx-rates.service";
import { FxSnapshotService } from "../services/fx-snapshot.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AdminOnly } from "../../auth/decorators/roles.decorator";
import {
	ApiFxRatesController,
	ApiGetRates,
	ApiGetRateHistory,
} from "../decorators/swagger.decorator";

@ApiFxRatesController()
@Controller("fx")
@UseGuards(JwtAuthGuard)
export class FxRatesController {
	constructor(
		private fxRatesService: FxRatesService,
		private fxSnapshotService: FxSnapshotService,
	) {}

	@Get("rates")
	@ApiGetRates()
	async getRates() {
		return this.fxRatesService.getSupportedRates();
	}

	@Get("rates/history")
	@AdminOnly()
	@ApiGetRateHistory()
	async getRateHistory(
		@Query("from") from: string,
		@Query("to") to: string,
		@Query("page") page?: string,
		@Query("limit") limit?: string,
		@Query("currency") currency?: string,
	) {
		return this.fxSnapshotService.getRateHistory(
			new Date(from),
			new Date(to),
			page ? parseInt(page, 10) : 1,
			limit ? parseInt(limit, 10) : 20,
			currency,
		);
	}
}
