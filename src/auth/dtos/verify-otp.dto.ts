import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyOtpDto {
	@ApiProperty({
		example: "john@example.com",
		description: "Email address associated with the account",
	})
	@IsEmail({}, { message: "Must be a valid email address" })
	@IsNotEmpty({ message: "Email is required" })
	@Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
	email: string;

	@ApiProperty({
		example: "482931",
		description: "6-digit numeric OTP sent to your email",
	})
	@IsString()
	@IsNotEmpty({ message: "OTP is required" })
	@Matches(/^\d{6}$/, { message: "OTP must be exactly 6 digits" })
	otp: string;
}
