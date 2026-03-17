import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { TransactionsService } from "./transactions.service";
import {
	Transaction,
	TransactionType,
	TransactionStatus,
} from "../entities/transaction.entity";
import { LogService } from "../../logging/log.service";

describe("TransactionsService", () => {
	let service: TransactionsService;
	let logService: jest.Mocked<Pick<LogService, "log" | "warn" | "error">>;

	const mockTransaction: Partial<Transaction> = {
		id: "tx-uuid-1",
		userId: "user-uuid-1",
		type: TransactionType.FUNDING,
		status: TransactionStatus.COMPLETED,
		toCurrency: "NGN",
		toAmount: "500",
		description: "Wallet funded with 500 NGN",
		createdAt: new Date(),
	};

	const mockQueryBuilder = {
		where: jest.fn().mockReturnThis(),
		andWhere: jest.fn().mockReturnThis(),
		orderBy: jest.fn().mockReturnThis(),
		skip: jest.fn().mockReturnThis(),
		take: jest.fn().mockReturnThis(),
		getManyAndCount: jest.fn().mockResolvedValue([[mockTransaction], 1]),
	};

	const txRepo = {
		findOne: jest.fn(),
		createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
	};

	beforeEach(async () => {
		logService = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		// Reset mocks
		txRepo.findOne.mockReset();
		mockQueryBuilder.where.mockClear().mockReturnThis();
		mockQueryBuilder.andWhere.mockClear().mockReturnThis();
		mockQueryBuilder.getManyAndCount
			.mockReset()
			.mockResolvedValue([[mockTransaction], 1]);

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TransactionsService,
				{ provide: getRepositoryToken(Transaction), useValue: txRepo },
				{ provide: LogService, useValue: logService },
			],
		}).compile();

		service = module.get<TransactionsService>(TransactionsService);
	});

	describe("getUserTransactions", () => {
		it("should return paginated transactions with defaults", async () => {
			const result = await service.getUserTransactions("user-uuid-1", {});

			expect(result).toEqual({
				transactions: [mockTransaction],
				total: 1,
				page: 1,
				limit: 20,
			});
			expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
			expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
		});

		it("should apply page and limit", async () => {
			await service.getUserTransactions("user-uuid-1", {
				page: 2,
				limit: 10,
			});

			expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
			expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
		});

		it("should filter by type", async () => {
			await service.getUserTransactions("user-uuid-1", {
				type: TransactionType.FUNDING,
			});

			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
				"tx.type = :type",
				{ type: TransactionType.FUNDING },
			);
		});

		it("should filter by currency", async () => {
			await service.getUserTransactions("user-uuid-1", {
				currency: "NGN",
			});

			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
				"(tx.fromCurrency = :currency OR tx.toCurrency = :currency)",
				{ currency: "NGN" },
			);
		});

		it("should filter by date range", async () => {
			await service.getUserTransactions("user-uuid-1", {
				from: "2024-01-01",
				to: "2024-12-31",
			});

			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
				"tx.createdAt >= :from",
				{ from: expect.any(Date) },
			);
			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
				"tx.createdAt < :to",
				{ to: expect.any(Date) },
			);
		});

		it("should return empty array when no transactions", async () => {
			mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

			const result = await service.getUserTransactions("user-uuid-1", {});

			expect(result.transactions).toEqual([]);
			expect(result.total).toBe(0);
		});
	});

	describe("getTransactionById", () => {
		it("should return transaction by id", async () => {
			txRepo.findOne.mockResolvedValue(mockTransaction as Transaction);

			const result = await service.getTransactionById(
				"tx-uuid-1",
				"user-uuid-1",
			);

			expect(result).toEqual(mockTransaction);
			expect(txRepo.findOne).toHaveBeenCalledWith({
				where: { id: "tx-uuid-1", userId: "user-uuid-1" },
			});
		});

		it("should throw NotFoundException if transaction not found", async () => {
			txRepo.findOne.mockResolvedValue(null);

			await expect(
				service.getTransactionById("tx-uuid-1", "user-uuid-1"),
			).rejects.toThrow(NotFoundException);
		});
	});
});
