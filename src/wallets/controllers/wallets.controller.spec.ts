import { Test, TestingModule } from "@nestjs/testing";
import { WalletsController } from "./wallets.controller";
import { WalletsService } from "../services/wallets.service";
import { WalletBalance } from "../entities/wallet-balance.entity";
import { Transaction } from "../../transactions/entities/transaction.entity";
import type { JwtPayload } from "../../common/decorators/current-user.decorator";

describe("WalletsController", () => {
	let controller: WalletsController;
	let walletsService: jest.Mocked<
		Pick<
			WalletsService,
			| "getWalletByUserId"
			| "fundWallet"
			| "convertCurrency"
			| "tradeCurrency"
		>
	>;

	const mockUser: JwtPayload = {
		userId: "user-uuid-1",
		email: "test@example.com",
		role: "user",
	};

	beforeEach(async () => {
		walletsService = {
			getWalletByUserId: jest.fn(),
			fundWallet: jest.fn(),
			convertCurrency: jest.fn(),
			tradeCurrency: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [WalletsController],
			providers: [{ provide: WalletsService, useValue: walletsService }],
		}).compile();

		controller = module.get<WalletsController>(WalletsController);
	});

	describe("getWallet", () => {
		it("should return wallet balances", async () => {
			const expected = {
				balances: [{ currency: "NGN", amount: "1000" }],
			};
			walletsService.getWalletByUserId.mockResolvedValue(
				expected as { balances: WalletBalance[] },
			);

			const result = await controller.getWallet(mockUser);

			expect(result).toEqual(expected);
			expect(walletsService.getWalletByUserId).toHaveBeenCalledWith(
				mockUser.userId,
			);
		});
	});

	describe("fund", () => {
		it("should fund wallet", async () => {
			const dto = {
				currency: "NGN",
				amount: "500",
				idempotencyKey: "key-1",
			};
			const expected = { id: "tx-1", type: "funding" };
			walletsService.fundWallet.mockResolvedValue(
				expected as Transaction,
			);

			const result = await controller.fund(mockUser, dto);

			expect(result).toEqual(expected);
			expect(walletsService.fundWallet).toHaveBeenCalledWith(
				mockUser.userId,
				dto,
			);
		});
	});

	describe("convertCurrency", () => {
		it("should convert currency", async () => {
			const dto = {
				fromCurrency: "USD",
				toCurrency: "NGN",
				amount: "100",
				idempotencyKey: "key-2",
			};
			const expected = { id: "tx-2", type: "conversion" };
			walletsService.convertCurrency.mockResolvedValue(
				expected as Transaction,
			);

			const result = await controller.convertCurrency(mockUser, dto);

			expect(result).toEqual(expected);
			expect(walletsService.convertCurrency).toHaveBeenCalledWith(
				mockUser.userId,
				dto,
			);
		});
	});

	describe("tradeCurrency", () => {
		it("should trade currency", async () => {
			const dto = {
				fromCurrency: "USD",
				toCurrency: "NGN",
				amount: "100",
				idempotencyKey: "key-3",
			};
			const expected = { id: "tx-3", type: "trade" };
			walletsService.tradeCurrency.mockResolvedValue(
				expected as Transaction,
			);

			const result = await controller.tradeCurrency(mockUser, dto);

			expect(result).toEqual(expected);
			expect(walletsService.tradeCurrency).toHaveBeenCalledWith(
				mockUser.userId,
				dto,
			);
		});
	});
});
