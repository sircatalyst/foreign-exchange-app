import { IsOptional, IsNumberString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ConvertCurrencyDto } from "./convert-currency.dto";

export class TradeCurrencyDto extends ConvertCurrencyDto {
	@ApiPropertyOptional({
		example: "0.00065",
		description: "Expected exchange rate (optional, for slippage guard)",
	})
	@IsOptional()
	@IsNumberString()
	expectedRate?: string;

	@ApiPropertyOptional({
		example: "0.005",
		description: "Maximum slippage tolerance (default: 0.01 = 1%)",
	})
	@IsOptional()
	@IsNumberString()
	slippageTolerance?: string;
}
