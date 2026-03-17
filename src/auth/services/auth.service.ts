import {
	Injectable,
	ConflictException,
	UnauthorizedException,
	BadRequestException,
	ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomInt } from "crypto";
import { DataSource } from "typeorm";
import { UsersService } from "../../users/services/users.service";
import { WalletsService } from "../../wallets/services/wallets.service";
import { MailService } from "../../mail/mail.service";
import { LogService } from "../../logging/log.service";
import { AppConfig } from "../../config";
import { UserRole } from "../../users/entities/user.entity";
import { RegisterDto } from "../dtos/register.dto";
import { VerifyOtpDto } from "../dtos/verify-otp.dto";
import { LoginDto } from "../dtos/login.dto";
import { ResendOtpDto } from "../dtos/resend-otp.dto";

@Injectable()
export class AuthService {
	constructor(
		private usersService: UsersService,
		private walletsService: WalletsService,
		private mailService: MailService,
		private jwtService: JwtService,
		private appConfig: AppConfig,
		private logService: LogService,
		private dataSource: DataSource,
	) {}

	private readonly className = AuthService.name;
	private readonly resendOtpMessage =
		"If that email is registered, a new OTP has been sent.";

	async register(dto: RegisterDto): Promise<{ message: string }> {
		const existing = await this.usersService.findByEmail(
			dto.email.toLowerCase(),
		);
		if (existing) {
			throw new ConflictException("Email already in use");
		}

		const salt = await bcrypt.genSalt(12);
		const passwordHash = await bcrypt.hash(dto.password, salt);

		const otpCode = this.generateOtp();
		const otpExpiresAt = new Date(
			Date.now() + this.appConfig.otpExpiryMinutes * 60_000, // Convert minutes to milliseconds,
		);

		const user = await this.dataSource.transaction(async (manager) => {
			const createdUser = await this.usersService.createWithManager(
				manager,
				{
					email: dto.email.toLowerCase(),
					passwordHash,
					firstName: dto.firstName,
					lastName: dto.lastName,
					isVerified: false,
					otpCode,
					otpExpiresAt,
				},
			);
			await this.walletsService.createWalletForUserWithManager(
				manager,
				createdUser.id,
			);
			return createdUser;
		});

		await this.mailService.sendOtp(user.email, otpCode, user.firstName);

		this.logService.log({
			Service: this.className,
			Method: "register",
			Action: "USER_REGISTERED",
			User: user.email,
			Payload: { email: user.email },
		});

		return {
			message: "Registration successful. Check your email for OTP.",
		};
	}

	async verifyOtp(dto: VerifyOtpDto): Promise<{ message: string }> {
		const user = await this.usersService.findByEmail(
			dto.email.toLowerCase(),
		);

		if (!user || user.otpCode !== dto.otp) {
			this.logService.warn({
				Service: this.className,
				Method: "verifyOtp",
				Action: "OTP_FAILED",
				User: dto.email,
			});
			throw new UnauthorizedException("Invalid OTP or email");
		}

		if (user.isVerified) {
			throw new BadRequestException("Account already verified");
		}

		if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
			throw new UnauthorizedException(
				"OTP has expired. Request a new one.",
			);
		}

		await this.usersService.update(user.id, {
			isVerified: true,
			otpCode: null,
			otpExpiresAt: null,
		});

		this.logService.log({
			Service: this.className,
			Method: "verifyOtp",
			Action: "EMAIL_VERIFIED",
			User: user.email,
		});

		return {
			message: "Email verified successfully. Please log in.",
		};
	}

	async login(
		dto: LoginDto,
	): Promise<{ message: string; accessToken: string }> {
		const user = await this.usersService.findByEmailWithPassword(
			dto.email.toLowerCase(),
		);

		if (!user) {
			this.logService.warn({
				Service: this.className,
				Method: "login",
				Action: "USER_LOGIN_FAILED",
				User: dto.email,
			});
			throw new UnauthorizedException("Invalid credentials");
		}

		const isMatch = await bcrypt.compare(dto.password, user.passwordHash);

		if (!isMatch) {
			this.logService.warn({
				Service: this.className,
				Method: "login",
				Action: "USER_LOGIN_FAILED",
				User: dto.email,
				Payload: {},
			});
			throw new UnauthorizedException("Invalid credentials");
		}

		if (!user.isVerified) {
			throw new ForbiddenException(
				"Please verify your email before logging in",
			);
		}

		this.logService.log({
			Service: this.className,
			Method: "login",
			Action: "USER_LOGIN_SUCCESS",
			User: user.email,
			Payload: { email: user.email },
		});

		const accessToken = this.issueJwt(user.id, user.email, user.role);
		return {
			message: "Login successful",
			accessToken,
		};
	}

	async resendOtp(dto: ResendOtpDto): Promise<{ message: string }> {
		const user = await this.usersService.findByEmail(
			dto.email.toLowerCase(),
		);

		if (!user) {
			return { message: this.resendOtpMessage };
		}

		if (user.isVerified) {
			throw new BadRequestException("Account already verified");
		}

		const otpCode = this.generateOtp();
		const otpExpiresAt = new Date(
			Date.now() + this.appConfig.otpExpiryMinutes * 60_000,
		);

		await this.usersService.update(user.id, { otpCode, otpExpiresAt });

		await this.mailService.resendOtp(user.email, otpCode, user.firstName);

		return { message: this.resendOtpMessage };
	}

	private generateOtp(): string {
		return randomInt(100_000, 999_999).toString();
	}

	private issueJwt(userId: string, email: string, role: UserRole): string {
		return this.jwtService.sign({ sub: userId, email, role });
	}
}
