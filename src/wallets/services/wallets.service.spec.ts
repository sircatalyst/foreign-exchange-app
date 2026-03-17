import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import { WalletsService } from "./wallets.service";
import { Wallet } from "../entities/wallet.entity";
import { WalletBalance } from "../entities/wallet-balance.entity";
import {
	Transaction,
	TransactionType,
	TransactionStatus,
} from "../../transactions/entities/transaction.entity";
import { AppConfig } from "../../config";
import { FxRatesService } from "../../fx-rates/services/fx-rates.service";
import { LogService } from "../../logging/log.service";

describe("WalletsService", () => {
	let service: WalletsService;
	let walletRepo: jest.Mocked<
		Pick<Repository<Wallet>, "create" | "save" | "findOne">
	>;
	let walletBalanceRepo: jest.Mocked<
		Pick<Repository<WalletBalance>, "create" | "save">
	>;
	let txRepo: jest.Mocked<Pick<Repository<Transaction>, "findOne">>;
	let fxRatesService: jest.Mocked<Pick<FxRatesService, "getRate">>;
	let logService: jest.Mocked<Pick<LogService, "log" | "warn" | "error">>;
	let appConfig: Partial<AppConfig>;
	let dataSource: Partial<DataSource>;

	const mockWallet: Partial<Wallet> = {
		id: "wallet-uuid-1",
		userId: "user-uuid-1",
		balances: [],
	};

	const mockBalance: Partial<WalletBalance> = {
		id: "balance-uuid-1",
		walletId: "wallet-uuid-1",
		currency: "NGN",
		amount: "1000.00000000",
	};

	const mockTransaction: Partial<Transaction> = {
		id: "tx-uuid-1",
		userId: "user-uuid-1",
		type: TransactionType.FUNDING,
		status: TransactionStatus.COMPLETED,
		toCurrency: "NGN",
		toAmount: "500",
		idempotencyKey: "idem-key-1",
		description: "Wallet funded with 500 NGN",
	};

	// Helper to create a mock EntityManager for transaction tests
	function createMockManager(overrides: Record<string, unknown> = {}) {
		const balanceQb = {
			where: jest.fn().mockReturnThis(),
			setLock: jest.fn().mockReturnThis(),
			getOne: jest.fn().mockResolvedValue(mockBalance),
		};
		const repo = {
			create: jest.fn().mockImplementation((data: unknown) => data),
			save: jest.fn().mockImplementation(async (data: unknown) => ({
				id: "tx-uuid-new",
				...(typeof data === "object" ? data : {}),
			})),
			update: jest.fn().mockResolvedValue(undefined),
			createQueryBuilder: jest.fn().mockReturnValue(balanceQb),
			findOne: jest.fn(),
		};
		const manager = {
			getRepository: jest.fn().mockReturnValue(repo),
			findOne: jest.fn(),
			create: jest
				.fn()
				.mockImplementation((_entity: unknown, data: unknown) => data),
			save: jest
				.fn()
				.mockImplementation(
					async (_entity: unknown, data: unknown) => ({
						id: "saved-uuid",
						...(typeof data === "object" ? data : {}),
					}),
				),
			...overrides,
		};
		return { manager: manager as unknown as EntityManager, repo };
	}

	beforeEach(async () => {
		walletRepo = {
			create: jest.fn().mockImplementation((data: unknown) => data),
			save: jest.fn().mockResolvedValue(mockWallet),
			findOne: jest.fn(),
		};

		walletBalanceRepo = {
			create: jest.fn().mockImplementation((data: unknown) => data),
			save: jest.fn().mockResolvedValue([]),
		};

		txRepo = {
			findOne: jest.fn(),
		};

		fxRatesService = {
			getRate: jest.fn().mockResolvedValue("1.5"),
		};

		logService = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		appConfig = {
			supportedCurrencies: ["NGN", "USD", "EUR", "GBP"],
		} as Partial<AppConfig>;

		// Default dataSource mock
		const { manager } = createMockManager();
		dataSource = {
			transaction: jest
				.fn()
				.mockImplementation(
					async (cb: (m: EntityManager) => Promise<unknown>) =>
						cb(manager),
				),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				WalletsService,
				{ provide: getRepositoryToken(Wallet), useValue: walletRepo },
				{
					provide: getRepositoryToken(WalletBalance),
					useValue: walletBalanceRepo,
				},
				{ provide: getRepositoryToken(Transaction), useValue: txRepo },
				{ provide: DataSource, useValue: dataSource },
				{ provide: AppConfig, useValue: appConfig },
				{ provide: FxRatesService, useValue: fxRatesService },
				{ provide: LogService, useValue: logService },
			],
		}).compile();

		service = module.get<WalletsService>(WalletsService);
	});

	describe("createWalletForUser", () => {
		it("should create a wallet with balances for all supported currencies", async () => {
			const result = await service.createWalletForUser("user-uuid-1");

			expect(walletRepo.create).toHaveBeenCalledWith({
				userId: "user-uuid-1",
			});
			expect(walletRepo.save).toHaveBeenCalled();
			expect(walletBalanceRepo.create).toHaveBeenCalledTimes(4); // NGN, USD, EUR, GBP
			expect(walletBalanceRepo.save).toHaveBeenCalled();
			expect(result).toEqual(mockWallet);
		});
	});

	describe("createWalletForUserWithManager", () => {
		it("should create wallet using entity manager", async () => {
			const { manager } = createMockManager();

			const result = await service.createWalletForUserWithManager(
				manager,
				"user-uuid-1",
			);

			expect(result).toBeDefined();
			expect(manager.getRepository).toHaveBeenCalled();
		});
	});

	describe("getWalletByUserId", () => {
		it("should return wallet balances", async () => {
			walletRepo.findOne.mockResolvedValue({
				...mockWallet,
				balances: [mockBalance as WalletBalance],
			} as Wallet);

			const result = await service.getWalletByUserId("user-uuid-1");

			expect(result).toEqual({
				balances: [mockBalance],
			});
		});

		it("should throw NotFoundException if wallet not found", async () => {
			walletRepo.findOne.mockResolvedValue(null);

			await expect(
				service.getWalletByUserId("user-uuid-1"),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe("fundWallet", () => {
		const fundDto = {
			currency: "NGN",
			amount: "500",
			idempotencyKey: "idem-key-1",
		};

		it("should return existing transaction on duplicate idempotency key", async () => {
			txRepo.findOne!.mockResolvedValue(mockTransaction as Transaction);

			const result = await service.fundWallet("user-uuid-1", fundDto);

			expect(result).toEqual(mockTransaction);
			expect(dataSource.transaction).not.toHaveBeenCalled();
		});

		it("should throw BadRequestException for unsupported currency", async () => {
			txRepo.findOne.mockResolvedValue(null);

			await expect(
				service.fundWallet("user-uuid-1", {
					...fundDto,
					currency: "XYZ",
				}),
			).rejects.toThrow(BadRequestException);
		});

		it("should throw NotFoundException if wallet not found", async () => {
			txRepo.findOne.mockResolvedValue(null);
			walletRepo.findOne.mockResolvedValue(null);

			await expect(
				service.fundWallet("user-uuid-1", fundDto),
			).rejects.toThrow(NotFoundException);
		});

		it("should fund wallet successfully", async () => {
			txRepo.findOne.mockResolvedValue(null);
			walletRepo.findOne.mockResolvedValue(mockWallet as Wallet);

			const result = await service.fundWallet("user-uuid-1", fundDto);

			expect(result).toBeDefined();
			expect(dataSource.transaction).toHaveBeenCalled();
		});

		it("should throw NotFoundException if currency balance not found in wallet", async () => {
			txRepo.findOne.mockResolvedValue(null);
			walletRepo.findOne.mockResolvedValue(mockWallet as Wallet);

			const balanceQb = {
				where: jest.fn().mockReturnThis(),
				setLock: jest.fn().mockReturnThis(),
				getOne: jest.fn().mockResolvedValue(null), // balance not found
			};
			const repo = {
				createQueryBuilder: jest.fn().mockReturnValue(balanceQb),
			};
			const manager = {
				getRepository: jest.fn().mockReturnValue(repo),
			} as unknown as EntityManager;

			(dataSource.transaction as jest.Mock).mockImplementation(
				async (cb: (m: EntityManager) => Promise<unknown>) =>
					cb(manager),
			);

			await expect(
				service.fundWallet("user-uuid-1", fundDto),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe("convertCurrency", () => {
		const convertDto = {
			fromCurrency: "USD",
			toCurrency: "NGN",
			amount: "100",
			idempotencyKey: "convert-key-1",
		};

		it("should throw BadRequestException for same currency conversion", async () => {
			await expect(
				service.convertCurrency("user-uuid-1", {
					...convertDto,
					toCurrency: "USD",
				}),
			).rejects.toThrow(BadRequestException);
		});

		it("should return existing transaction on duplicate idempotency key", async () => {
			txRepo.findOne.mockResolvedValue(mockTransaction as Transaction);

			const result = await service.convertCurrency(
				"user-uuid-1",
				convertDto,
			);

			expect(result).toEqual(mockTransaction);
		});

		it("should throw BadRequestException for zero or negative amount", async () => {
			txRepo.findOne.mockResolvedValue(null);

			await expect(
				service.convertCurrency("user-uuid-1", {
					...convertDto,
					amount: "0",
				}),
			).rejects.toThrow(BadRequestException);
		});

		it("should convert currency successfully", async () => {
			txRepo.findOne.mockResolvedValue(null);
			fxRatesService.getRate.mockResolvedValue("450.5");

			const mockFromBalance = {
				id: "b1",
				walletId: "wallet-uuid-1",
				currency: "USD",
				amount: "1000.00000000",
			};
			const mockToBalance = {
				id: "b2",
				walletId: "wallet-uuid-1",
				currency: "NGN",
				amount: "500.00000000",
			};

			const manager = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(mockWallet) // wallet lookup
					.mockResolvedValueOnce(mockFromBalance) // first currency alphabetically (NGN < USD -> NGN)
					.mockResolvedValueOnce(mockToBalance), // second currency
				create: jest
					.fn()
					.mockImplementation(
						(_entity: unknown, data: unknown) => data,
					),
				save: jest
					.fn()
					.mockImplementation(
						async (_entity: unknown, data: unknown) => {
							if (Array.isArray(data)) return data;
							return {
								id: "tx-uuid-new",
								...(typeof data === "object" ? data : {}),
							};
						},
					),
			} as unknown as EntityManager;

			(dataSource.transaction as jest.Mock).mockImplementation(
				async (cb: (m: EntityManager) => Promise<unknown>) =>
					cb(manager),
			);

			const result = await service.convertCurrency(
				"user-uuid-1",
				convertDto,
			);

			expect(result).toBeDefined();
			expect(fxRatesService.getRate).toHaveBeenCalledWith("USD", "NGN");
		});

		it("should use provided transactionType", async () => {
			txRepo.findOne.mockResolvedValue(null);
			fxRatesService.getRate.mockResolvedValue("1.5");

			const mockFromBalance = {
				id: "b1",
				walletId: "wallet-uuid-1",
				currency: "NGN",
				amount: "1000.00000000",
			};
			const mockToBalance = {
				id: "b2",
				walletId: "wallet-uuid-1",
				currency: "USD",
				amount: "500.00000000",
			};

			const savedTx = { id: "tx-uuid-new", type: TransactionType.TRADE };
			const manager = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(mockWallet)
					.mockResolvedValueOnce(mockFromBalance)
					.mockResolvedValueOnce(mockToBalance),
				create: jest
					.fn()
					.mockImplementation(
						(_entity: unknown, data: unknown) => data,
					),
				save: jest
					.fn()
					.mockImplementation(
						async (_entity: unknown, data: unknown) => {
							if (Array.isArray(data)) return data;
							return {
								...savedTx,
								...(typeof data === "object" ? data : {}),
							};
						},
					),
			} as unknown as EntityManager;

			(dataSource.transaction as jest.Mock).mockImplementation(
				async (cb: (m: EntityManager) => Promise<unknown>) =>
					cb(manager),
			);

			const result = await service.convertCurrency(
				"user-uuid-1",
				{
					fromCurrency: "NGN",
					toCurrency: "USD",
					amount: "100",
					idempotencyKey: "trade-key",
				},
				TransactionType.TRADE,
			);

			expect(result).toBeDefined();
		});

		it("should throw NotFoundException if wallet not found in transaction", async () => {
			txRepo.findOne.mockResolvedValue(null);
			fxRatesService.getRate.mockResolvedValue("1.5");

			const manager = {
				findOne: jest.fn().mockResolvedValueOnce(null), // wallet not found
				create: jest.fn(),
				save: jest.fn(),
			} as unknown as EntityManager;

			(dataSource.transaction as jest.Mock).mockImplementation(
				async (cb: (m: EntityManager) => Promise<unknown>) =>
					cb(manager),
			);

			await expect(
				service.convertCurrency("user-uuid-1", convertDto),
			).rejects.toThrow(NotFoundException);
		});

		it("should throw BadRequestException if fromBalance is null", async () => {
			txRepo.findOne.mockResolvedValue(null);
			fxRatesService.getRate.mockResolvedValue("1.5");

			const manager = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(mockWallet) // wallet
					.mockResolvedValueOnce(null) // first balance (NGN, alphabetical)
					.mockResolvedValueOnce(null), // second balance (USD)
				create: jest.fn(),
				save: jest.fn(),
			} as unknown as EntityManager;

			(dataSource.transaction as jest.Mock).mockImplementation(
				async (cb: (m: EntityManager) => Promise<unknown>) =>
					cb(manager),
			);

			await expect(
				service.convertCurrency("user-uuid-1", convertDto),
			).rejects.toThrow(BadRequestException);
		});

		it("should throw BadRequestException for insufficient balance", async () => {
			txRepo.findOne.mockResolvedValue(null);
			fxRatesService.getRate.mockResolvedValue("450.5");

			const mockFromBalance = {
				id: "b1",
				walletId: "wallet-uuid-1",
				currency: "USD",
				amount: "10.00000000",
			};
			const mockToBalance = {
				id: "b2",
				walletId: "wallet-uuid-1",
				currency: "NGN",
				amount: "500.00000000",
			};

			const manager = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(mockWallet)
					.mockResolvedValueOnce(mockToBalance) // first alphabetically: NGN
					.mockResolvedValueOnce(mockFromBalance), // second alphabetically: USD
				create: jest.fn(),
				save: jest.fn(),
			} as unknown as EntityManager;

			(dataSource.transaction as jest.Mock).mockImplementation(
				async (cb: (m: EntityManager) => Promise<unknown>) =>
					cb(manager),
			);

			await expect(
				service.convertCurrency("user-uuid-1", convertDto),
			).rejects.toThrow(BadRequestException);
			expect(logService.warn).toHaveBeenCalled();
		});

		it("should create new toBalance when destination currency has no existing balance", async () => {
			txRepo.findOne.mockResolvedValue(null);
			fxRatesService.getRate.mockResolvedValue("450.5");

			const mockFromBalance = {
				id: "b1",
				walletId: "wallet-uuid-1",
				currency: "USD",
				amount: "1000.00000000",
			};

			const manager = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(mockWallet)
					.mockResolvedValueOnce(null) // first alphabetically: NGN → toBalance is null
					.mockResolvedValueOnce(mockFromBalance), // second alphabetically: USD → fromBalance
				create: jest
					.fn()
					.mockImplementation(
						(_entity: unknown, data: unknown) => data,
					),
				save: jest
					.fn()
					.mockImplementation(
						async (_entity: unknown, data: unknown) => {
							if (Array.isArray(data)) return data;
							return {
								id: "tx-uuid-new",
								...(typeof data === "object" ? data : {}),
							};
						},
					),
			} as unknown as EntityManager;

			(dataSource.transaction as jest.Mock).mockImplementation(
				async (cb: (m: EntityManager) => Promise<unknown>) =>
					cb(manager),
			);

			const result = await service.convertCurrency(
				"user-uuid-1",
				convertDto,
			);

			expect(result).toBeDefined();
			// manager.create should have been called to create the new balance
			expect(manager.create).toHaveBeenCalled();
		});
	});

	describe("tradeCurrency", () => {
		const tradeDto = {
			fromCurrency: "USD",
			toCurrency: "NGN",
			amount: "100",
			idempotencyKey: "trade-key-1",
			expectedRate: undefined as string | undefined,
			slippageTolerance: undefined as string | undefined,
		};

		it("should delegate to convertCurrency with TRADE type", async () => {
			txRepo.findOne.mockResolvedValue(null);
			fxRatesService.getRate.mockResolvedValue("450.5");

			const mockFromBalance = {
				id: "b1",
				walletId: "wallet-uuid-1",
				currency: "NGN",
				amount: "0.00000000",
			};
			const mockToBalance = {
				id: "b2",
				walletId: "wallet-uuid-1",
				currency: "USD",
				amount: "1000.00000000",
			};

			const manager = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(mockWallet)
					.mockResolvedValueOnce(mockFromBalance)
					.mockResolvedValueOnce(mockToBalance),
				create: jest
					.fn()
					.mockImplementation(
						(_entity: unknown, data: unknown) => data,
					),
				save: jest
					.fn()
					.mockImplementation(
						async (_entity: unknown, data: unknown) => {
							if (Array.isArray(data)) return data;
							return {
								id: "tx-uuid-new",
								type: TransactionType.TRADE,
								...(typeof data === "object" ? data : {}),
							};
						},
					),
			} as unknown as EntityManager;

			(dataSource.transaction as jest.Mock).mockImplementation(
				async (cb: (m: EntityManager) => Promise<unknown>) =>
					cb(manager),
			);

			const result = await service.tradeCurrency("user-uuid-1", tradeDto);

			expect(result).toBeDefined();
		});

		it("should throw BadRequestException if slippage exceeds tolerance", async () => {
			fxRatesService.getRate.mockResolvedValue("500.0");

			await expect(
				service.tradeCurrency("user-uuid-1", {
					...tradeDto,
					expectedRate: "450.0",
					slippageTolerance: "0.01", // 1% tolerance, but rate moved ~11%
				}),
			).rejects.toThrow(BadRequestException);
		});

		it("should proceed if slippage within tolerance", async () => {
			txRepo.findOne.mockResolvedValue(null);
			fxRatesService.getRate.mockResolvedValue("451.0");

			const mockFromBalance = {
				id: "b1",
				walletId: "wallet-uuid-1",
				currency: "NGN",
				amount: "0.00000000",
			};
			const mockToBalance = {
				id: "b2",
				walletId: "wallet-uuid-1",
				currency: "USD",
				amount: "1000.00000000",
			};

			const manager = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(mockWallet)
					.mockResolvedValueOnce(mockFromBalance)
					.mockResolvedValueOnce(mockToBalance),
				create: jest
					.fn()
					.mockImplementation(
						(_entity: unknown, data: unknown) => data,
					),
				save: jest
					.fn()
					.mockImplementation(
						async (_entity: unknown, data: unknown) => {
							if (Array.isArray(data)) return data;
							return {
								id: "tx-uuid-new",
								...(typeof data === "object" ? data : {}),
							};
						},
					),
			} as unknown as EntityManager;

			(dataSource.transaction as jest.Mock).mockImplementation(
				async (cb: (m: EntityManager) => Promise<unknown>) =>
					cb(manager),
			);

			const result = await service.tradeCurrency("user-uuid-1", {
				...tradeDto,
				expectedRate: "450.0",
				slippageTolerance: "0.05",
			});

			expect(result).toBeDefined();
		});
	});
});
