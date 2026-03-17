import {
	IsString,
	IsUppercase,
	Length,
	IsNumberString,
	IsNotEmpty,
	MaxLength,
	ValidationOptions,
} from "class-validator";
import { registerDecorator } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import Decimal from "decimal.js";

function IsPositiveDecimalString(validationOptions?: ValidationOptions) {
	return function (object: object, propertyName: string) {
		registerDecorator({
			name: "isPositiveDecimalString",
			target: object.constructor,
			propertyName,
			constraints: [],
			options: validationOptions,
			validator: {
				validate(value: string) {
					try {
						return new Decimal(value).greaterThan(0);
					} catch {
						return false;
					}
				},
				defaultMessage: () =>
					`${propertyName} must be a positive decimal number`,
			},
		});
	};
}

export class FundWalletDto {
	@ApiProperty({ example: "NGN" })
	@IsString()
	@IsUppercase()
	@Length(3, 3)
	currency: string;

	@ApiProperty({ example: "50000.00" })
	@IsNumberString()
	@IsPositiveDecimalString()
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
