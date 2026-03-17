import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Transaction } from "../entities/transaction.entity";
import { QueryTransactionsDto } from "../dtos/query-transactions.dto";
import { LogService } from "../../logging/log.service";

@Injectable()
export class TransactionsService {
	constructor(
		@InjectRepository(Transaction)
		private readonly txRepo: Repository<Transaction>,
		private readonly logService: LogService,
	) {}

	async getUserTransactions(
		userId: string,
		query: QueryTransactionsDto,
	): Promise<{
		transactions: Transaction[];
		total: number;
		page: number;
		limit: number;
	}> {
		const { page = 1, limit = 20, type, currency, from, to } = query;
		const skip = (page - 1) * limit;

		const qb = this.txRepo
			.createQueryBuilder("tx")
			.where("tx.userId = :userId", { userId })
			.orderBy("tx.createdAt", "DESC")
			.skip(skip)
			.take(limit);

		if (type) {
			qb.andWhere("tx.type = :type", { type });
		}

		if (currency) {
			qb.andWhere(
				"(tx.fromCurrency = :currency OR tx.toCurrency = :currency)",
				{ currency },
			);
		}

		if (from) {
			qb.andWhere("tx.createdAt >= :from", { from: new Date(from) });
		}

		if (to) {
			const toDate = new Date(to);
			toDate.setDate(toDate.getDate() + 1);
			qb.andWhere("tx.createdAt < :to", { to: toDate });
		}

		const [transactions, total] = await qb.getManyAndCount();

		this.logService.log({
			Service: "TransactionsService",
			Method: "getUserTransactions",
			Action: "TRANSACTIONS_FETCHED",
			User: userId,
			Returns: { total, page, limit },
		});

		return { transactions, total, page, limit };
	}

	async getTransactionById(id: string, userId: string): Promise<Transaction> {
		const transaction = await this.txRepo.findOne({
			where: { id, userId },
		});

		if (!transaction) {
			throw new NotFoundException("Transaction not found");
		}

		this.logService.log({
			Service: "TransactionsService",
			Method: "getTransactionById",
			Action: "TRANSACTION_FETCHED",
			User: userId,
			Returns: { id },
		});

		return transaction;
	}
}
