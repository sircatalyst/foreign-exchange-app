import {
	Injectable,
	BadRequestException,
	ServiceUnavailableException,
	Inject,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { Cache } from "cache-manager";
import axios from "axios";
import { AppConfig } from "../../config";
import { LogService } from "../../logging/log.service";
import { FxRateSnapshot } from "../entities/fx-rate-snapshot.entity";

@Injectable()
export class FxRatesService {
	private readonly MAX_RETRIES = 2;
	private readonly RETRY_DELAY_MS = 500;

	constructor(
		private readonly appConfig: AppConfig,
		private readonly logService: LogService,
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
		@InjectRepository(FxRateSnapshot)
		private readonly snapshotRepo: Repository<FxRateSnapshot>,
	) {}

	async getRates(baseCurrency: string): Promise<Record<string, string>> {
		const cacheKey = `foreign-exchange-app:fx_rates:${baseCurrency}`;
		const ttl = this.appConfig.fxCacheTtl;

		const cached =
			await this.cacheManager.get<Record<string, string>>(cacheKey);
		if (cached) {
			this.logService.log({
				Service: "FxRatesService",
				Method: "getRates",
				Action: "RATES_FETCHED",
				User: "system",
				Payload: { baseCurrency, source: "cache" },
			});
			return cached;
		}

		try {
			const rates = await this.fetchWithRetry(baseCurrency);

			await this.cacheManager.set(cacheKey, rates, ttl * 1000);

			this.logService.log({
				Service: "FxRatesService",
				Method: "getRates",
				Action: "RATES_FETCHED",
				User: "system",
				Payload: { baseCurrency, source: "api" },
			});

			return rates;
		} catch (error) {
			this.logService.error({
				Service: "FxRatesService",
				Method: "getRates",
				Action: "FX_API_ERROR",
				User: "system",
				Payload: { baseCurrency, error: (error as Error).message },
			});

			const fallback = await this.fallbackToSnapshot(baseCurrency);
			if (fallback) {
				await this.cacheManager.set(
					cacheKey,
					fallback,
					(ttl / 2) * 1000,
				);
				return fallback;
			}

			throw new ServiceUnavailableException(
				"FX rate service is currently unavailable. Please try again later.",
			);
		}
	}

	async getRate(fromCurrency: string, toCurrency: string): Promise<string> {
		if (fromCurrency === toCurrency) return "1";

		const rates = await this.getRates(fromCurrency);
		const rate = rates[toCurrency];

		if (!rate) {
			throw new BadRequestException(
				`Exchange rate for ${fromCurrency} → ${toCurrency} not available`,
			);
		}

		return rate;
	}

	async getSupportedRates(): Promise<{
		currencies: { currency: string; rate: string }[];
	}> {
		const baseCurrency = "NGN";
		const supported = this.appConfig.supportedCurrencies;
		const rates = await this.getRates(baseCurrency);

		const currencies = supported
			.filter((c) => c !== baseCurrency && rates[c])
			.map((c) => ({ currency: c, rate: rates[c] }));

		return { currencies };
	}

	private async fetchWithRetry(
		baseCurrency: string,
	): Promise<Record<string, string>> {
		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
			try {
				return await this.fetchFromApi(baseCurrency);
			} catch (error) {
				lastError = error as Error;
				this.logService.warn({
					Service: "FxRatesService",
					Method: "fetchWithRetry",
					Action: "FX_API_RETRY",
					User: "system",
					Payload: {
						baseCurrency,
						attempt,
						maxRetries: this.MAX_RETRIES,
						error: lastError.message,
					},
				});
				if (attempt < this.MAX_RETRIES) {
					await this.delay(this.RETRY_DELAY_MS * attempt);
				}
			}
		}

		throw lastError;
	}

	private async fallbackToSnapshot(
		baseCurrency: string,
	): Promise<Record<string, string> | null> {
		try {
			const snapshots = await this.snapshotRepo.find({
				where: { baseCurrency },
				order: { snapshotAt: "DESC" },
				take: 200,
			});

			if (snapshots.length === 0) return null;

			const latestTime = snapshots[0].snapshotAt.getTime();
			const latestSnapshots = snapshots.filter(
				(s) => s.snapshotAt.getTime() === latestTime,
			);

			const rates: Record<string, string> = {};
			for (const snapshot of latestSnapshots) {
				rates[snapshot.quoteCurrency] = snapshot.rate;
			}

			const staleAgeMs = Date.now() - latestTime;

			this.logService.warn({
				Service: "FxRatesService",
				Method: "fallbackToSnapshot",
				Action: "FX_STALE_RATE_SERVED",
				User: "system",
				Payload: {
					baseCurrency,
					staleAgeSeconds: Math.round(staleAgeMs / 1000),
					rateCount: Object.keys(rates).length,
				},
			});

			return rates;
		} catch {
			return null;
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private async fetchFromApi(
		baseCurrency: string,
	): Promise<Record<string, string>> {
		const apiKey = this.appConfig.fxApiKey;
		const baseUrl = this.appConfig.fxBaseUrl;
		const url = `${baseUrl}/${apiKey}/latest/${baseCurrency}`;

		const response = await axios.get(url, { timeout: 5000 });

		if (response.data.result !== "success") {
			throw new Error(`FX API error: ${response.data["error-type"]}`);
		}

		const rates: Record<string, string> = {};
		for (const [currency, rate] of Object.entries(
			response.data.conversion_rates,
		)) {
			rates[currency] = String(rate);
		}

		this.logService.log({
			Service: "FxRatesService",
			Method: "fetchFromApi",
			Action: "RATES_FETCHED_FROM_API",
			User: "system",
			Payload: { baseCurrency, currencyCount: Object.keys(rates).length },
		});

		return rates;
	}
}
