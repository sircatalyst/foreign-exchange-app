import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "../services/auth.service";

describe("AuthController", () => {
	let controller: AuthController;
	let authService: jest.Mocked<
		Pick<AuthService, "register" | "verifyOtp" | "login" | "resendOtp">
	>;

	beforeEach(async () => {
		authService = {
			register: jest.fn(),
			verifyOtp: jest.fn(),
			login: jest.fn(),
			resendOtp: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [{ provide: AuthService, useValue: authService }],
		}).compile();

		controller = module.get<AuthController>(AuthController);
	});

	describe("register", () => {
		it("should call authService.register with dto", async () => {
			const dto = {
				email: "test@example.com",
				password: "Password1!",
				firstName: "John",
				lastName: "Doe",
			};
			const expected = {
				message: "Registration successful. Check your email for OTP.",
			};
			authService.register.mockResolvedValue(expected);

			const result = await controller.register(dto);

			expect(result).toEqual(expected);
			expect(authService.register).toHaveBeenCalledWith(dto);
		});
	});

	describe("verify", () => {
		it("should call authService.verifyOtp with dto", async () => {
			const dto = { email: "test@example.com", otp: "123456" };
			const expected = {
				message: "Email verified successfully. Please log in.",
			};
			authService.verifyOtp.mockResolvedValue(expected);

			const result = await controller.verify(dto);

			expect(result).toEqual(expected);
			expect(authService.verifyOtp).toHaveBeenCalledWith(dto);
		});
	});

	describe("login", () => {
		it("should call authService.login with dto", async () => {
			const dto = { email: "test@example.com", password: "Password1!" };
			const expected = {
				message: "Login successful",
				accessToken: "jwt-token",
			};
			authService.login.mockResolvedValue(expected);

			const result = await controller.login(dto);

			expect(result).toEqual(expected);
			expect(authService.login).toHaveBeenCalledWith(dto);
		});
	});

	describe("resendOtp", () => {
		it("should call authService.resendOtp with dto", async () => {
			const dto = { email: "test@example.com" };
			const expected = {
				message:
					"If that email is registered, a new OTP has been sent.",
			};
			authService.resendOtp.mockResolvedValue(expected);

			const result = await controller.resendOtp(dto);

			expect(result).toEqual(expected);
			expect(authService.resendOtp).toHaveBeenCalledWith(dto);
		});
	});
});
