import { Transform } from "class-transformer";
import {
	IsEmail,
	IsNotEmpty,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { MaxByteLength } from "../../common/validators/max-byte-length.validator";

export class RegisterDto {
	@ApiProperty({
		example: "john@example.com",
		description: "A valid, unique email address",
	})
	@IsEmail({}, { message: "Must be a valid email address" })
	@IsNotEmpty({ message: "Email is required" })
	@Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
	email: string;

	@ApiProperty({
		example: "Password123!",
		description:
			"8-64 characters, must include at least one uppercase letter, one lowercase letter, one digit, and one special character",
	})
	@IsString()
	@IsNotEmpty({ message: "Password is required" })
	@MinLength(8, { message: "Password must be at least 8 characters" })
	@MaxLength(64, { message: "Password must not exceed 64 characters" })
	@MaxByteLength({
		message: "Password is too long; please use fewer or simpler characters",
	})
	@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
		message:
			"Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character",
	})
	password: string;

	@ApiProperty({
		example: "John",
		description: "First name (2-100 characters, letters and hyphens only)",
	})
	@IsString()
	@IsNotEmpty({ message: "First name is required" })
	@MinLength(2, { message: "First name must be at least 2 characters" })
	@MaxLength(100, { message: "First name must not exceed 100 characters" })
	@Matches(/^[A-Za-z'-]+$/, {
		message:
			"First name may only contain letters, hyphens, and apostrophes",
	})
	@Transform(({ value }: { value: string }) => value?.trim())
	firstName: string;

	@ApiProperty({
		example: "Doe",
		description: "Last name (2-100 characters, letters and hyphens only)",
	})
	@IsString()
	@IsNotEmpty({ message: "Last name is required" })
	@MinLength(2, { message: "Last name must be at least 2 characters" })
	@MaxLength(100, { message: "Last name must not exceed 100 characters" })
	@Matches(/^[A-Za-z'-]+$/, {
		message: "Last name may only contain letters, hyphens, and apostrophes",
	})
	@Transform(({ value }: { value: string }) => value?.trim())
	lastName: string;
}
