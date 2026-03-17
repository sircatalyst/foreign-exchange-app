import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Transaction } from "./entities/transaction.entity";
import { TransactionsService } from "./services/transactions.service";
import { TransactionsController } from "./controllers/transactions.controller";
import { UsersModule } from "../users/users.module";

@Module({
	imports: [TypeOrmModule.forFeature([Transaction]), UsersModule],
	controllers: [TransactionsController],
	providers: [TransactionsService],
	exports: [TransactionsService],
})
export class TransactionsModule {}
