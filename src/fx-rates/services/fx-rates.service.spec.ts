import { Test, TestingModule } from "@nestjs/testing";
import {
	BadRequestException,
	ServiceUnavailableException,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FxRatesService } from "./fx-rates.service";
import { AppConfig } from "../../config";
import { LogService } from "../../logging/log.service";
import { FxRateSnapshot } from "../entities/fx-rate-snapshot.entity";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("FxRatesService", () => {
	let service: FxRatesService;
	let cacheManager: { get: jest.Mock; set: jest.Mock };
	let logService: jest.Mocked<Partial<LogService>>;
	let appConfig: Partial<AppConfig>;
	let snapshotRepo: { find: jest.Mock };

	beforeEach(async () => {
		cacheManager = {
			get: jest.fn().mockResolvedValue(null),
			set: jest.fn().mockResolvedValue(undefined),
		};

		logService = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		appConfig = {
			fxCacheTtl: 300,
			fxApiKey: "test-api-key",
			fxBaseUrl: "https://v6.exchangerate-api.com/v6",
			supportedCurrencies: ["NGN", "USD", "EUR", "GBP"],
		} as Partial<AppConfig>;

		snapshotRepo = {
			find: jest.fn().mockResolvedValue([]),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				FxRatesService,
				{ provide: CACHE_MANAGER, useValue: cacheManager },
				{ provide: AppConfig, useValue: appConfig },
				{ provide: LogService, useValue: logService },
				{
					provide: getRepositoryToken(FxRateSnapshot),
					useValue: snapshotRepo,
				},
			],
		}).compile();

		service = module.get<FxRatesService>(FxRatesService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("getRates", () => {
		it("should return cached rates if available", async () => {
			const cachedRates = { USD: "0.0024", EUR: "0.0021" };
			cacheManager.get.mockResolvedValue(cachedRates);

			const result = await service.getRates("NGN");

			expect(result).toEqual(cachedRates);
			expect(cacheManager.get).toHaveBeenCalledWith(
				"foreign-exchange-app:fx_rates:NGN",
			);
		});

		it("should fetch from API if cache miss", async () => {
			cacheManager.get.mockResolvedValue(null);
			mockedAxios.get.mockResolvedValue({
				data: {
					result: "success",
					conversion_rates: { USD: 0.0024, EUR: 0.0021 },
				},
			});

			const result = await service.getRates("NGN");

			expect(result).toEqual({ USD: "0.0024", EUR: "0.0021" });
			expect(cacheManager.set).toHaveBeenCalledWith(
				"foreign-exchange-app:fx_rates:NGN",
				{ USD: "0.0024", EUR: "0.0021" },
				300_000,
			);
		});

		it("should throw ServiceUnavailableException when API fails and no snapshots", async () => {
			cacheManager.get.mockResolvedValue(null);
			mockedAxios.get.mockRejectedValue(new Error("Network error"));
			snapshotRepo.find.mockResolvedValue([]);

			await expect(service.getRates("NGN")).rejects.toThrow(
				ServiceUnavailableException,
			);
		});

		it("should retry API call before failing", async () => {
			cacheManager.get.mockResolvedValue(null);
			mockedAxios.get.mockRejectedValue(new Error("Network error"));
			snapshotRepo.find.mockResolvedValue([]);

			await expect(service.getRates("NGN")).rejects.toThrow(
				ServiceUnavailableException,
			);

			expect(mockedAxios.get).toHaveBeenCalledTimes(2);
			expect(logService.warn).toHaveBeenCalledWith(
				expect.objectContaining({ Action: "FX_API_RETRY" }),
			);
		});

		it("should succeed on second retry attempt", async () => {
			cacheManager.get.mockResolvedValue(null);
			mockedAxios.get
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValueOnce({
					data: {
						result: "success",
						conversion_rates: { USD: 0.0024, EUR: 0.0021 },
					},
				});

			const result = await service.getRates("NGN");

			expect(result).toEqual({ USD: "0.0024", EUR: "0.0021" });
			expect(mockedAxios.get).toHaveBeenCalledTimes(2);
		});

		it("should fallback to snapshot rates when API fails", async () => {
			const snapshotTime = new Date("2025-01-01T12:00:00Z");
			cacheManager.get.mockResolvedValue(null);
			mockedAxios.get.mockRejectedValue(new Error("Network error"));
			snapshotRepo.find.mockResolvedValue([
				{
					baseCurrency: "NGN",
					quoteCurrency: "USD",
					rate: "0.0024",
					snapshotAt: snapshotTime,
				},
				{
					baseCurrency: "NGN",
					quoteCurrency: "EUR",
					rate: "0.0021",
					snapshotAt: snapshotTime,
				},
			]);

			const result = await service.getRates("NGN");

			expect(result).toEqual({ USD: "0.0024", EUR: "0.0021" });
			expect(logService.warn).toHaveBeenCalledWith(
				expect.objectContaining({ Action: "FX_STALE_RATE_SERVED" }),
			);
			expect(cacheManager.set).toHaveBeenCalledWith(
				"foreign-exchange-app:fx_rates:NGN",
				{ USD: "0.0024", EUR: "0.0021" },
				150_000,
			);
		});

		it("should throw on non-success API response", async () => {
			cacheManager.get.mockResolvedValue(null);
			mockedAxios.get.mockResolvedValue({
				data: {
					result: "error",
					"error-type": "invalid-key",
				},
			});

			await expect(service.getRates("NGN")).rejects.toThrow(
				ServiceUnavailableException,
			);
		});
	});

	describe("getRate", () => {
		it("should return '1' for same currency", async () => {
			const result = await service.getRate("USD", "USD");

			expect(result).toBe("1");
		});

		it("should return rate for valid currency pair", async () => {
			cacheManager.get.mockResolvedValue({ NGN: "415.5" });

			const result = await service.getRate("USD", "NGN");

			expect(result).toBe("415.5");
		});

		it("should throw BadRequestException for unavailable rate", async () => {
			cacheManager.get.mockResolvedValue({ NGN: "415.5" });

			await expect(service.getRate("USD", "XYZ")).rejects.toThrow(
				BadRequestException,
			);
		});
	});

	describe("getSupportedRates", () => {
		it("should return wrapped currencies list", async () => {
			cacheManager.get.mockResolvedValue({
				USD: "0.0024",
				EUR: "0.0021",
				GBP: "0.0018",
			});

			const result = await service.getSupportedRates();

			expect(result).toEqual({
				currencies: [
					{ currency: "USD", rate: "0.0024" },
					{ currency: "EUR", rate: "0.0021" },
					{ currency: "GBP", rate: "0.0018" },
				],
			});
		});

		it("should filter out baseCurrency and unavailable rates", async () => {
			cacheManager.get.mockResolvedValue({ USD: "0.0024" });

			const result = await service.getSupportedRates();

			expect(result.currencies).toHaveLength(1);
			expect(result.currencies[0].currency).toBe("USD");
		});
	});
});
