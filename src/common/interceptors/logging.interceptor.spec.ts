import { LoggingInterceptor } from "./logging.interceptor";
import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { LogService } from "../../logging/log.service";

describe("LoggingInterceptor", () => {
	let interceptor: LoggingInterceptor;
	let logService: jest.Mocked<Partial<LogService>>;

	beforeEach(() => {
		logService = {
			log: jest.fn(),
			error: jest.fn(),
		};
		interceptor = new LoggingInterceptor(logService as any);
	});

	function createMockContext(
		method = "GET",
		url = "/test",
		user?: { sub: string },
	): ExecutionContext {
		return {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue({ method, url, user }),
			}),
		} as unknown as ExecutionContext;
	}

	it("should log successful requests", (done) => {
		const context = createMockContext("GET", "/api/test", {
			sub: "user-1",
		});
		const handler: CallHandler = {
			handle: jest.fn().mockReturnValue(of({ data: "ok" })),
		};

		interceptor.intercept(context, handler).subscribe({
			complete: () => {
				expect(logService.log).toHaveBeenCalledWith(
					expect.objectContaining({
						Action: "HTTP_REQUEST",
						User: "user-1",
					}),
				);
				done();
			},
		});
	});

	it("should log errors", (done) => {
		const context = createMockContext("POST", "/api/test");
		const handler: CallHandler = {
			handle: jest
				.fn()
				.mockReturnValue(throwError(() => new Error("fail"))),
		};

		interceptor.intercept(context, handler).subscribe({
			error: () => {
				expect(logService.error).toHaveBeenCalledWith(
					expect.objectContaining({
						Action: "HTTP_REQUEST_ERROR",
						User: "anonymous",
					}),
				);
				done();
			},
		});
	});

	it("should use 'anonymous' when no user", (done) => {
		const context = createMockContext("GET", "/test");
		const handler: CallHandler = {
			handle: jest.fn().mockReturnValue(of(null)),
		};

		interceptor.intercept(context, handler).subscribe({
			complete: () => {
				expect(logService.log).toHaveBeenCalledWith(
					expect.objectContaining({
						User: "anonymous",
					}),
				);
				done();
			},
		});
	});
});
