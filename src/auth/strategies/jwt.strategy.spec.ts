import { ForbiddenException } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy";
import { AppConfig } from "../../config";
import { UsersService } from "../../users/services/users.service";
import { User } from "../../users/entities/user.entity";

describe("JwtStrategy", () => {
	let strategy: JwtStrategy;
	let usersService: jest.Mocked<Pick<UsersService, "findById">>;

	beforeEach(() => {
		usersService = {
			findById: jest.fn(),
		};

		const appConfig = {
			jwtSecret: "test-secret",
		} as Partial<AppConfig>;

		strategy = new JwtStrategy(
			appConfig as AppConfig,
			usersService as unknown as UsersService,
		);
	});

	describe("validate", () => {
		it("should return user payload when user is verified", async () => {
			usersService.findById.mockResolvedValue({
				id: "user-1",
				isVerified: true,
			} as User);

			const result = await strategy.validate({
				sub: "user-1",
				email: "test@example.com",
				role: "user",
			});

			expect(result).toEqual({
				userId: "user-1",
				email: "test@example.com",
				role: "user",
			});
		});

		it("should throw ForbiddenException if user not verified", async () => {
			usersService.findById.mockResolvedValue({
				id: "user-1",
				isVerified: false,
			} as User);

			await expect(
				strategy.validate({
					sub: "user-1",
					email: "test@example.com",
					role: "user",
				}),
			).rejects.toThrow(ForbiddenException);
		});

		it("should throw ForbiddenException if user not found", async () => {
			usersService.findById.mockResolvedValue(null);

			await expect(
				strategy.validate({
					sub: "user-1",
					email: "test@example.com",
					role: "user",
				}),
			).rejects.toThrow(ForbiddenException);
		});
	});
});
