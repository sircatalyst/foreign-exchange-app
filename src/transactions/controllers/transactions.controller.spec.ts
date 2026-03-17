import { Test, TestingModule } from "@nestjs/testing";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "../services/transactions.service";
import { Transaction } from "../entities/transaction.entity";
import type { JwtPayload } from "../../common/decorators/current-user.decorator";

describe("TransactionsController", () => {
	let controller: TransactionsController;
	let transactionsService: jest.Mocked<
		Pick<TransactionsService, "getUserTransactions" | "getTransactionById">
	>;

	const mockUser: JwtPayload = {
		userId: "user-uuid-1",
		email: "test@example.com",
		role: "user",
	};

	beforeEach(async () => {
		transactionsService = {
			getUserTransactions: jest.fn(),
			getTransactionById: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [TransactionsController],
			providers: [
				{
					provide: TransactionsService,
					useValue: transactionsService,
				},
			],
		}).compile();

		controller = module.get<TransactionsController>(TransactionsController);
	});

	describe("list", () => {
		it("should return paginated transactions", async () => {
			const query = { page: 1, limit: 20 };
			const expected = { transactions: [], total: 0, page: 1, limit: 20 };
			transactionsService.getUserTransactions.mockResolvedValue(expected);

			const result = await controller.list(mockUser, query);

			expect(result).toEqual(expected);
			expect(
				transactionsService.getUserTransactions,
			).toHaveBeenCalledWith(mockUser.userId, query);
		});
	});

	describe("findOne", () => {
		it("should return a single transaction", async () => {
			const mockTx = { id: "tx-uuid-1", userId: "user-uuid-1" };
			transactionsService.getTransactionById.mockResolvedValue(
				mockTx as Transaction,
			);

			const result = await controller.findOne("tx-uuid-1", mockUser);

			expect(result).toEqual(mockTx);
			expect(transactionsService.getTransactionById).toHaveBeenCalledWith(
				"tx-uuid-1",
				mockUser.userId,
			);
		});
	});
});
