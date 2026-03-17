import { Transform } from "class-transformer";
import {
	IsEmail,
	IsNotEmpty,
	IsString,
	MaxLength,
	MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { MaxByteLength } from "../../common/validators/max-byte-length.validator";

export class LoginDto {
	@ApiProperty({
		example: "john@example.com",
		description: "Registered email address",
	})
	@IsEmail({}, { message: "Must be a valid email address" })
	@IsNotEmpty({ message: "Email is required" })
	@Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
	email: string;

	@ApiProperty({ example: "Password123!", description: "Account password" })
	@IsString()
	@IsNotEmpty({ message: "Password is required" })
	@MinLength(8, { message: "Password must be at least 8 characters" })
	@MaxLength(64, { message: "Password must not exceed 64 characters" })
	@MaxByteLength({
		message: "Password is too long; please use fewer or simpler characters",
	})
	password: string;
}
