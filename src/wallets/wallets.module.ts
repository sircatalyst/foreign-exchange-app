import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Wallet } from "./entities/wallet.entity";
import { WalletBalance } from "./entities/wallet-balance.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import { WalletsService } from "./services/wallets.service";
import { WalletsController } from "./controllers/wallets.controller";
import { UsersModule } from "../users/users.module";
import { FxRatesModule } from "../fx-rates/fx-rates.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Wallet, WalletBalance, Transaction]),
		UsersModule,
		FxRatesModule,
	],
	controllers: [WalletsController],
	providers: [WalletsService],
	exports: [WalletsService],
})
export class WalletsModule {}
