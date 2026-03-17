import {
	IsOptional,
	IsInt,
	Min,
	Max,
	IsIn,
	IsString,
	IsUppercase,
	Length,
	IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryTransactionsDto {
	@ApiPropertyOptional({
		example: 1,
		description: "Page number (starts at 1)",
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	@Type(() => Number)
	page?: number = 1;

	@ApiPropertyOptional({
		example: 20,
		description: "Items per page (max: 100)",
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(100)
	@Type(() => Number)
	limit?: number = 20;

	@ApiPropertyOptional({ enum: ["conversion", "funding", "trade"] })
	@IsOptional()
	@IsIn(["conversion", "funding", "trade"])
	type?: string;

	@ApiPropertyOptional({
		example: "NGN",
		description: "Filter by currency",
	})
	@IsOptional()
	@IsString()
	@IsUppercase()
	@Length(3, 3)
	currency?: string;

	@ApiPropertyOptional({
		example: "2024-01-01",
		description: "Start date (ISO 8601)",
	})
	@IsOptional()
	@IsDateString()
	from?: string;

	@ApiPropertyOptional({
		example: "2024-12-31",
		description: "End date (ISO 8601)",
	})
	@IsOptional()
	@IsDateString()
	to?: string;
}
