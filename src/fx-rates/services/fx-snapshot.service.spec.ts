import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FxSnapshotService } from "./fx-snapshot.service";
import { FxRateSnapshot } from "../entities/fx-rate-snapshot.entity";
import { FxRatesService } from "./fx-rates.service";
import { AppConfig } from "../../config";
import { LogService } from "../../logging/log.service";

describe("FxSnapshotService", () => {
	let service: FxSnapshotService;
	let fxRatesService: jest.Mocked<Pick<FxRatesService, "getRates">>;
	let logService: jest.Mocked<Pick<LogService, "log" | "warn" | "error">>;

	const mockQueryBuilder = {
		where: jest.fn().mockReturnThis(),
		andWhere: jest.fn().mockReturnThis(),
		orderBy: jest.fn().mockReturnThis(),
		skip: jest.fn().mockReturnThis(),
		take: jest.fn().mockReturnThis(),
		getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
	};

	const snapshotRepo = {
		create: jest.fn().mockImplementation((data: unknown) => data),
		save: jest.fn().mockResolvedValue([]),
		createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
	};

	beforeEach(async () => {
		fxRatesService = {
			getRates: jest.fn(),
		};

		logService = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		const appConfig = {
			supportedCurrencies: ["NGN", "USD", "EUR"],
		} as Partial<AppConfig>;

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				FxSnapshotService,
				{
					provide: getRepositoryToken(FxRateSnapshot),
					useValue: snapshotRepo,
				},
				{ provide: FxRatesService, useValue: fxRatesService },
				{ provide: AppConfig, useValue: appConfig },
				{ provide: LogService, useValue: logService },
			],
		}).compile();

		service = module.get<FxSnapshotService>(FxSnapshotService);
	});

	describe("captureSnapshot", () => {
		it("should capture rate snapshots for supported currencies", async () => {
			fxRatesService.getRates.mockResolvedValue({
				USD: "0.0024",
				EUR: "0.0021",
			});

			await service.captureSnapshot();

			expect(fxRatesService.getRates).toHaveBeenCalledWith("NGN");
			expect(snapshotRepo.create).toHaveBeenCalledTimes(2); // USD and EUR (not NGN)
			expect(snapshotRepo.save).toHaveBeenCalled();
			expect(logService.log).toHaveBeenCalled();
		});

		it("should log error if rate fetch fails", async () => {
			fxRatesService.getRates.mockRejectedValue(new Error("API down"));

			await service.captureSnapshot();

			expect(logService.error).toHaveBeenCalled();
		});
	});

	describe("getRateHistory", () => {
		it("should query rate history for date range with defaults", async () => {
			const from = new Date("2024-01-01");
			const to = new Date("2024-12-31");

			const result = await service.getRateHistory(from, to);

			expect(snapshotRepo.createQueryBuilder).toHaveBeenCalledWith(
				"snap",
			);
			expect(mockQueryBuilder.where).toHaveBeenCalledWith(
				"snap.snapshotAt BETWEEN :from AND :to",
				{ from, to },
			);
			expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
			expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
			expect(result).toEqual({
				snapshots: [],
				total: 0,
				page: 1,
				limit: 20,
			});
		});

		it("should filter by currency when provided", async () => {
			const from = new Date("2024-01-01");
			const to = new Date("2024-12-31");

			await service.getRateHistory(from, to, 1, 20, "USD");

			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
				"snap.quoteCurrency = :currency",
				{ currency: "USD" },
			);
		});

		it("should apply pagination parameters", async () => {
			const from = new Date("2024-01-01");
			const to = new Date("2024-12-31");

			await service.getRateHistory(from, to, 3, 10);

			expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
			expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
		});
	});
});
