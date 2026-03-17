import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "../services/auth.service";
import { RegisterDto } from "../dtos/register.dto";
import { VerifyOtpDto } from "../dtos/verify-otp.dto";
import { LoginDto } from "../dtos/login.dto";
import { ResendOtpDto } from "../dtos/resend-otp.dto";
import {
	ApiAuthController,
	ApiRegister,
	ApiVerifyOtp,
	ApiLogin,
	ApiResendOtp,
} from "../decorators/swagger.decorator";

@ApiAuthController()
@Controller("auth")
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post("register")
	@ApiRegister()
	async register(@Body() dto: RegisterDto) {
		return this.authService.register(dto);
	}

	@Post("verify")
	@HttpCode(HttpStatus.OK)
	@Throttle({ short: { ttl: 3600000, limit: 5 } }) // Limit to 5 attempts per hour
	@ApiVerifyOtp()
	async verify(@Body() dto: VerifyOtpDto) {
		return this.authService.verifyOtp(dto);
	}

	@Post("login")
	@HttpCode(HttpStatus.OK)
	@ApiLogin()
	async login(@Body() dto: LoginDto) {
		return this.authService.login(dto);
	}

	@Post("resend-otp")
	@HttpCode(HttpStatus.OK)
	@Throttle({ short: { ttl: 3600000, limit: 3 } }) // Limit to 3 attempts per hour
	@ApiResendOtp()
	async resendOtp(@Body() dto: ResendOtpDto) {
		return this.authService.resendOtp(dto);
	}
}
