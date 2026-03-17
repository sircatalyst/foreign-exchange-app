import {
	IsString,
	IsUppercase,
	Length,
	IsNumberString,
	IsNotEmpty,
	MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ConvertCurrencyDto {
	@ApiProperty({
		example: "NGN",
		description: "Source currency (3-letter ISO code)",
	})
	@IsString()
	@IsUppercase()
	@IsNotEmpty()
	@Length(3, 3)
	fromCurrency: string;

	@ApiProperty({ example: "USD", description: "Target currency" })
	@IsString()
	@IsUppercase()
	@IsNotEmpty()
	@Length(3, 3)
	toCurrency: string;

	@ApiProperty({
		example: "50000",
		description: "Amount in source currency (non-negative string)",
	})
	@IsNumberString()
	@IsNotEmpty()
	amount: string;

	@ApiProperty({
		example: "550e8400-e29b-41d4-a716-446655440000",
		description:
			"Idempotency key — resubmitting the same key returns the original transaction without re-executing",
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(64)
	idempotencyKey: string;
}
