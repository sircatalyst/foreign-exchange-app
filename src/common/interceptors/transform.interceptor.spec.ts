import { TransformInterceptor } from "./transform.interceptor";
import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of } from "rxjs";

describe("TransformInterceptor", () => {
	let interceptor: TransformInterceptor<unknown>;

	beforeEach(() => {
		interceptor = new TransformInterceptor();
	});

	function createMockContext(url: string = "/test"): ExecutionContext {
		return {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue({ url }),
			}),
		} as unknown as ExecutionContext;
	}

	function createMockHandler(data: unknown): CallHandler {
		return { handle: jest.fn().mockReturnValue(of(data)) };
	}

	it("should wrap response data in standard format", (done) => {
		const context = createMockContext("/api/test");
		const handler = createMockHandler({ foo: "bar" });

		interceptor.intercept(context, handler).subscribe((result: any) => {
			expect(result.success).toBe(true);
			expect(result.path).toBe("/api/test");
			expect(result.timestamp).toBeDefined();
			expect(result.data).toEqual({ foo: "bar" });
			expect(result.message).toBe("success");
			done();
		});
	});

	it("should extract message from response data", (done) => {
		const context = createMockContext();
		const handler = createMockHandler({
			message: "Custom message",
			accessToken: "jwt-token",
		});

		interceptor.intercept(context, handler).subscribe((result: any) => {
			expect(result.message).toBe("Custom message");
			expect(result.data).toEqual({ accessToken: "jwt-token" });
			done();
		});
	});

	it("should set data to null when only message in response", (done) => {
		const context = createMockContext();
		const handler = createMockHandler({
			message: "Registration successful",
		});

		interceptor.intercept(context, handler).subscribe((result: any) => {
			expect(result.message).toBe("Registration successful");
			expect(result.data).toBeNull();
			done();
		});
	});

	it("should handle null data", (done) => {
		const context = createMockContext();
		const handler = createMockHandler(null);

		interceptor.intercept(context, handler).subscribe((result: any) => {
			expect(result.data).toBeNull();
			expect(result.message).toBe("success");
			done();
		});
	});

	it("should handle array data without extracting message", (done) => {
		const context = createMockContext();
		const handler = createMockHandler([{ id: 1 }, { id: 2 }]);

		interceptor.intercept(context, handler).subscribe((result: any) => {
			expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
			expect(result.message).toBe("success");
			done();
		});
	});
});
