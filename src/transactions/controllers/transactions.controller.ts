import {
	Controller,
	Get,
	Param,
	Query,
	UseGuards,
	ParseUUIDPipe,
} from "@nestjs/common";
import { TransactionsService } from "../services/transactions.service";
import { QueryTransactionsDto } from "../dtos/query-transactions.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/decorators/current-user.decorator";
import {
	ApiTransactionsController,
	ApiListTransactions,
	ApiGetTransaction,
} from "../decorators/swagger.decorator";

@ApiTransactionsController()
@Controller("transactions")
@UseGuards(JwtAuthGuard)
export class TransactionsController {
	constructor(private transactionsService: TransactionsService) {}

	@Get()
	@ApiListTransactions()
	async list(
		@CurrentUser() user: JwtPayload,
		@Query() query: QueryTransactionsDto,
	) {
		return this.transactionsService.getUserTransactions(user.userId, query);
	}

	@Get(":id")
	@ApiGetTransaction()
	async findOne(
		@Param("id", ParseUUIDPipe) id: string,
		@CurrentUser() user: JwtPayload,
	) {
		return this.transactionsService.getTransactionById(id, user.userId);
	}
}
