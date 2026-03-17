import {
	Controller,
	Get,
	Post,
	Body,
	UseGuards,
	HttpCode,
	HttpStatus,
} from "@nestjs/common";
import { WalletsService } from "../services/wallets.service";
import { FundWalletDto } from "../dtos/fund-wallet.dto";
import { ConvertCurrencyDto } from "../dtos/convert-currency.dto";
import { TradeCurrencyDto } from "../dtos/trade-currency.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/decorators/current-user.decorator";
import {
	ApiWalletsController,
	ApiGetWallet,
	ApiFundWallet,
	ApiConvertCurrency,
	ApiTradeCurrency,
} from "../decorators/swagger.decorator";

@ApiWalletsController()
@Controller("wallet")
@UseGuards(JwtAuthGuard)
export class WalletsController {
	constructor(private walletsService: WalletsService) {}

	@Get()
	@ApiGetWallet()
	async getWallet(@CurrentUser() user: JwtPayload) {
		return this.walletsService.getWalletByUserId(user.userId);
	}

	@Post("fund")
	@ApiFundWallet()
	async fund(@CurrentUser() user: JwtPayload, @Body() dto: FundWalletDto) {
		return this.walletsService.fundWallet(user.userId, dto);
	}

	@Post("convert")
	@HttpCode(HttpStatus.OK)
	@ApiConvertCurrency()
	async convertCurrency(
		@CurrentUser() user: JwtPayload,
		@Body() dto: ConvertCurrencyDto,
	) {
		return this.walletsService.convertCurrency(user.userId, dto);
	}

	@Post("trade")
	@HttpCode(HttpStatus.OK)
	@ApiTradeCurrency()
	async tradeCurrency(
		@CurrentUser() user: JwtPayload,
		@Body() dto: TradeCurrencyDto,
	) {
		return this.walletsService.tradeCurrency(user.userId, dto);
	}
}
