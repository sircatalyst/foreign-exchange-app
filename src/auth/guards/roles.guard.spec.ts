import { RolesGuard } from "./roles.guard";
import { Reflector } from "@nestjs/core";
import { ExecutionContext } from "@nestjs/common";
import { UserRole } from "../../users/entities/user.entity";

describe("RolesGuard", () => {
	let guard: RolesGuard;
	let reflector: jest.Mocked<Reflector>;

	beforeEach(() => {
		reflector = {
			getAllAndOverride: jest.fn(),
		} as unknown as jest.Mocked<Reflector>;
		guard = new RolesGuard(reflector);
	});

	function createMockContext(role: string): ExecutionContext {
		return {
			getHandler: jest.fn(),
			getClass: jest.fn(),
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue({ user: { role } }),
			}),
		} as unknown as ExecutionContext;
	}

	it("should allow access when no roles are required", () => {
		reflector.getAllAndOverride.mockReturnValue(undefined);
		const context = createMockContext(UserRole.USER);

		expect(guard.canActivate(context)).toBe(true);
	});

	it("should allow access when user has required role", () => {
		reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
		const context = createMockContext(UserRole.ADMIN);

		expect(guard.canActivate(context)).toBe(true);
	});

	it("should deny access when user does not have required role", () => {
		reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
		const context = createMockContext(UserRole.USER);

		expect(guard.canActivate(context)).toBe(false);
	});

	it("should allow access if user has any of the required roles", () => {
		reflector.getAllAndOverride.mockReturnValue([
			UserRole.ADMIN,
			UserRole.USER,
		]);
		const context = createMockContext(UserRole.USER);

		expect(guard.canActivate(context)).toBe(true);
	});
});
