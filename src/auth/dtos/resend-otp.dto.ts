import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResendOtpDto {
	@ApiProperty({
		example: "john@example.com",
		description: "Email address to resend the OTP to",
	})
	@IsEmail({}, { message: "Must be a valid email address" })
	@IsNotEmpty({ message: "Email is required" })
	@Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
	email: string;
}
