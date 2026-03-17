import { Test, TestingModule } from "@nestjs/testing";
import { FxRatesController } from "./fx-rates.controller";
import { FxRatesService } from "../services/fx-rates.service";
import { FxSnapshotService } from "../services/fx-snapshot.service";

describe("FxRatesController", () => {
	let controller: FxRatesController;
	let fxRatesService: jest.Mocked<Pick<FxRatesService, "getSupportedRates">>;
	let fxSnapshotService: jest.Mocked<
		Pick<FxSnapshotService, "getRateHistory">
	>;

	beforeEach(async () => {
		fxRatesService = {
			getSupportedRates: jest.fn(),
		};

		fxSnapshotService = {
			getRateHistory: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [FxRatesController],
			providers: [
				{ provide: FxRatesService, useValue: fxRatesService },
				{ provide: FxSnapshotService, useValue: fxSnapshotService },
			],
		}).compile();

		controller = module.get<FxRatesController>(FxRatesController);
	});

	describe("getRates", () => {
		it("should return supported rates", async () => {
			const expected = {
				currencies: [{ currency: "USD", rate: "0.0024" }],
			};
			fxRatesService.getSupportedRates.mockResolvedValue(expected);

			const result = await controller.getRates();

			expect(result).toEqual(expected);
		});
	});

	describe("getRateHistory", () => {
		it("should return paginated rate history", async () => {
			const expected = {
				snapshots: [
					{
						id: "snap-1",
						baseCurrency: "NGN",
						quoteCurrency: "USD",
						rate: "0.0024",
					},
				],
				total: 1,
				page: 1,
				limit: 20,
			};
			fxSnapshotService.getRateHistory.mockResolvedValue(
				expected as ReturnType<
					typeof fxSnapshotService.getRateHistory
				> extends Promise<infer T>
					? T
					: never,
			);

			const result = await controller.getRateHistory(
				"2024-01-01",
				"2024-12-31",
				undefined,
				undefined,
				"USD",
			);

			expect(result).toEqual(expected);
			expect(fxSnapshotService.getRateHistory).toHaveBeenCalledWith(
				expect.any(Date),
				expect.any(Date),
				1,
				20,
				"USD",
			);
		});

		it("should work without currency filter", async () => {
			const expected = {
				snapshots: [],
				total: 0,
				page: 1,
				limit: 20,
			};
			fxSnapshotService.getRateHistory.mockResolvedValue(
				expected as ReturnType<
					typeof fxSnapshotService.getRateHistory
				> extends Promise<infer T>
					? T
					: never,
			);

			const result = await controller.getRateHistory(
				"2024-01-01",
				"2024-12-31",
			);

			expect(result).toEqual(expected);
			expect(fxSnapshotService.getRateHistory).toHaveBeenCalledWith(
				expect.any(Date),
				expect.any(Date),
				1,
				20,
				undefined,
			);
		});
	});
});
