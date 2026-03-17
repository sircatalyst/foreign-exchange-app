import { Test, TestingModule } from "@nestjs/testing";
import {
	ConflictException,
	UnauthorizedException,
	BadRequestException,
	ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { DataSource, EntityManager } from "typeorm";
import { AuthService } from "./auth.service";
import { UsersService } from "../../users/services/users.service";
import { WalletsService } from "../../wallets/services/wallets.service";
import { MailService } from "../../mail/mail.service";
import { LogService } from "../../logging/log.service";
import { AppConfig } from "../../config";
import { User, UserRole } from "../../users/entities/user.entity";
import { Wallet } from "../../wallets/entities/wallet.entity";

jest.mock("bcrypt", () => ({
	...jest.requireActual("bcrypt"),
	genSalt: jest.fn().mockResolvedValue("mock-salt"),
	hash: jest.fn().mockResolvedValue("hashed-password"),
	compare: jest.fn(),
}));

describe("AuthService", () => {
	let service: AuthService;
	let usersService: jest.Mocked<
		Pick<
			UsersService,
			| "findByEmail"
			| "findByEmailWithPassword"
			| "createWithManager"
			| "update"
		>
	>;
	let walletsService: jest.Mocked<
		Pick<WalletsService, "createWalletForUserWithManager">
	>;
	let mailService: jest.Mocked<Pick<MailService, "sendOtp" | "resendOtp">>;
	let jwtService: jest.Mocked<Pick<JwtService, "sign">>;
	let logService: jest.Mocked<Pick<LogService, "log" | "warn" | "error">>;
	let appConfig: Partial<AppConfig>;
	let dataSource: Partial<DataSource>;

	const mockUser: User = {
		id: "user-uuid-1",
		email: "test@example.com",
		passwordHash: "hashed-password",
		firstName: "John",
		lastName: "Doe",
		isVerified: false,
		otpCode: "123456",
		otpExpiresAt: new Date(Date.now() + 600_000),
		role: UserRole.USER,
		createdAt: new Date(),
		updatedAt: new Date(),
	} as User;

	beforeEach(async () => {
		usersService = {
			findByEmail: jest.fn(),
			findByEmailWithPassword: jest.fn(),
			createWithManager: jest.fn(),
			update: jest.fn(),
		} as unknown as typeof usersService;

		walletsService = {
			createWalletForUserWithManager: jest.fn(),
		} as unknown as typeof walletsService;

		mailService = {
			sendOtp: jest.fn().mockResolvedValue(undefined),
			resendOtp: jest.fn().mockResolvedValue(undefined),
		} as unknown as typeof mailService;

		jwtService = {
			sign: jest.fn().mockReturnValue("mock-jwt-token"),
		} as unknown as typeof jwtService;

		logService = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as typeof logService;

		appConfig = {
			otpExpiryMinutes: 10,
		};

		const mockManager = {
			getRepository: jest.fn().mockReturnValue({
				create: jest.fn(),
				save: jest.fn(),
			}),
		} as unknown as EntityManager;

		dataSource = {
			transaction: jest
				.fn()
				.mockImplementation(
					async (
						cb: (manager: EntityManager) => Promise<unknown>,
					) => {
						return cb(mockManager);
					},
				),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{ provide: UsersService, useValue: usersService },
				{ provide: WalletsService, useValue: walletsService },
				{ provide: MailService, useValue: mailService },
				{ provide: JwtService, useValue: jwtService },
				{ provide: AppConfig, useValue: appConfig },
				{ provide: LogService, useValue: logService },
				{ provide: DataSource, useValue: dataSource },
			],
		}).compile();

		service = module.get<AuthService>(AuthService);
	});

	describe("register", () => {
		const registerDto = {
			email: "test@example.com",
			password: "Password1!",
			firstName: "John",
			lastName: "Doe",
		};

		it("should register a new user successfully", async () => {
			usersService.findByEmail.mockResolvedValue(null);
			usersService.createWithManager.mockResolvedValue(mockUser);
			walletsService.createWalletForUserWithManager.mockResolvedValue(
				{} as Wallet,
			);

			const result = await service.register(registerDto);

			expect(result).toEqual({
				message: "Registration successful. Check your email for OTP.",
			});
			expect(usersService.findByEmail).toHaveBeenCalledWith(
				"test@example.com",
			);
			expect(mailService.sendOtp).toHaveBeenCalledWith(
				mockUser.email,
				expect.any(String),
				mockUser.firstName,
			);
		});

		it("should throw ConflictException if email already in use", async () => {
			usersService.findByEmail.mockResolvedValue(mockUser);

			await expect(service.register(registerDto)).rejects.toThrow(
				ConflictException,
			);
		});

		it("should send OTP email after registration", async () => {
			usersService.findByEmail.mockResolvedValue(null);
			usersService.createWithManager.mockResolvedValue(mockUser);
			walletsService.createWalletForUserWithManager.mockResolvedValue(
				{} as Wallet,
			);

			await service.register(registerDto);

			expect(mailService.sendOtp).toHaveBeenCalledTimes(1);
		});

		it("should create wallet in the same transaction", async () => {
			usersService.findByEmail.mockResolvedValue(null);
			usersService.createWithManager.mockResolvedValue(mockUser);
			walletsService.createWalletForUserWithManager.mockResolvedValue(
				{} as Wallet,
			);

			await service.register(registerDto);

			expect(dataSource.transaction).toHaveBeenCalled();
			expect(
				walletsService.createWalletForUserWithManager,
			).toHaveBeenCalled();
		});
	});

	describe("verifyOtp", () => {
		const verifyDto = { email: "test@example.com", otp: "123456" };

		it("should verify OTP successfully", async () => {
			usersService.findByEmail.mockResolvedValue(mockUser);
			usersService.update.mockResolvedValue(undefined);

			const result = await service.verifyOtp(verifyDto);

			expect(result).toEqual({
				message: "Email verified successfully. Please log in.",
			});
			expect(usersService.update).toHaveBeenCalledWith(mockUser.id, {
				isVerified: true,
				otpCode: null,
				otpExpiresAt: null,
			});
		});

		it("should throw UnauthorizedException if user not found", async () => {
			usersService.findByEmail.mockResolvedValue(null);

			await expect(service.verifyOtp(verifyDto)).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it("should throw UnauthorizedException if OTP does not match", async () => {
			usersService.findByEmail.mockResolvedValue({
				...mockUser,
				otpCode: "999999",
			} as User);

			await expect(service.verifyOtp(verifyDto)).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it("should throw BadRequestException if already verified", async () => {
			usersService.findByEmail.mockResolvedValue({
				...mockUser,
				isVerified: true,
			} as User);

			await expect(service.verifyOtp(verifyDto)).rejects.toThrow(
				BadRequestException,
			);
		});

		it("should throw UnauthorizedException if OTP expired", async () => {
			usersService.findByEmail.mockResolvedValue({
				...mockUser,
				otpExpiresAt: new Date(Date.now() - 60_000),
			} as User);

			await expect(service.verifyOtp(verifyDto)).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it("should throw UnauthorizedException if otpExpiresAt is null", async () => {
			usersService.findByEmail.mockResolvedValue({
				...mockUser,
				otpExpiresAt: null,
			} as User);

			await expect(service.verifyOtp(verifyDto)).rejects.toThrow(
				UnauthorizedException,
			);
		});
	});

	describe("login", () => {
		const loginDto = { email: "test@example.com", password: "Password1!" };

		it("should login successfully and return JWT", async () => {
			const verifiedUser: User = {
				...mockUser,
				isVerified: true,
			} as User;
			usersService.findByEmailWithPassword.mockResolvedValue(
				verifiedUser,
			);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);

			const result = await service.login(loginDto);

			expect(result).toEqual({
				message: "Login successful",
				accessToken: "mock-jwt-token",
			});
		});

		it("should throw UnauthorizedException if user not found", async () => {
			usersService.findByEmailWithPassword.mockResolvedValue(null);

			await expect(service.login(loginDto)).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it("should throw UnauthorizedException if password does not match", async () => {
			usersService.findByEmailWithPassword.mockResolvedValue(mockUser);
			(bcrypt.compare as jest.Mock).mockResolvedValue(false);

			await expect(service.login(loginDto)).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it("should throw ForbiddenException if email not verified", async () => {
			usersService.findByEmailWithPassword.mockResolvedValue(mockUser);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);

			await expect(service.login(loginDto)).rejects.toThrow(
				ForbiddenException,
			);
		});
	});

	describe("resendOtp", () => {
		const resendDto = { email: "test@example.com" };

		it("should resend OTP successfully", async () => {
			usersService.findByEmail.mockResolvedValue(mockUser);
			usersService.update.mockResolvedValue(undefined);

			const result = await service.resendOtp(resendDto);

			expect(result.message).toBe(
				"If that email is registered, a new OTP has been sent.",
			);
			expect(mailService.resendOtp).toHaveBeenCalledWith(
				mockUser.email,
				expect.any(String),
				mockUser.firstName,
			);
		});

		it("should return same message if user not found (anti-enumeration)", async () => {
			usersService.findByEmail.mockResolvedValue(null);

			const result = await service.resendOtp(resendDto);

			expect(result.message).toBe(
				"If that email is registered, a new OTP has been sent.",
			);
			expect(mailService.resendOtp).not.toHaveBeenCalled();
		});

		it("should throw BadRequestException if already verified", async () => {
			usersService.findByEmail.mockResolvedValue({
				...mockUser,
				isVerified: true,
			} as User);

			await expect(service.resendOtp(resendDto)).rejects.toThrow(
				BadRequestException,
			);
		});

		it("should update user with new OTP", async () => {
			usersService.findByEmail.mockResolvedValue(mockUser);
			usersService.update.mockResolvedValue(undefined);

			await service.resendOtp(resendDto);

			expect(usersService.update).toHaveBeenCalledWith(mockUser.id, {
				otpCode: expect.any(String),
				otpExpiresAt: expect.any(Date),
			});
		});
	});
});
