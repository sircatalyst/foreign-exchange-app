import { AllExceptionsFilter } from "./all-exceptions.filter";
import {
	ArgumentsHost,
	HttpException,
	HttpStatus,
	BadRequestException,
	NotFoundException,
} from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { LogService } from "../../logging/log.service";

describe("AllExceptionsFilter", () => {
	let filter: AllExceptionsFilter;
	let logService: jest.Mocked<Pick<LogService, "log" | "warn" | "error">>;
	let mockResponse: any;
	let mockRequest: any;
	let mockHost: any;

	beforeEach(() => {
		logService = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		mockRequest = {
			url: "/api/test",
			method: "POST",
			user: { sub: "user-uuid-1" },
		};

		mockHost = {
			switchToHttp: jest.fn().mockReturnValue({
				getResponse: jest.fn().mockReturnValue(mockResponse),
				getRequest: jest.fn().mockReturnValue(mockRequest),
			}),
		};

		filter = new AllExceptionsFilter(logService as unknown as LogService);
	});

	it("should handle HttpException", () => {
		const exception = new BadRequestException("Invalid input");

		filter.catch(exception, mockHost);

		expect(mockResponse.status).toHaveBeenCalledWith(
			HttpStatus.BAD_REQUEST,
		);
		expect(mockResponse.json).toHaveBeenCalledWith(
			expect.objectContaining({
				success: false,
				message: "Invalid input",
			}),
		);
	});

	it("should handle NotFoundException", () => {
		const exception = new NotFoundException("Not found");

		filter.catch(exception, mockHost);

		expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
	});

	it("should handle validation errors (array messages)", () => {
		const exception = new BadRequestException({
			message: ["email must be an email", "password is too short"],
		});

		filter.catch(exception, mockHost);

		expect(mockResponse.status).toHaveBeenCalledWith(
			HttpStatus.BAD_REQUEST,
		);
		expect(mockResponse.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Validation failed",
				error: ["email must be an email", "password is too short"],
			}),
		);
	});

	it("should handle QueryFailedError with unique violation (23505)", () => {
		const error = new QueryFailedError("INSERT INTO ...", [], {
			code: "23505",
			detail: "Key (email)=(test@example.com) already exists.",
		} as unknown as Error);

		filter.catch(error, mockHost);

		expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
		expect(mockResponse.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Resource already exists",
			}),
		);
	});

	it("should handle QueryFailedError with foreign key violation (23503)", () => {
		const error = new QueryFailedError("INSERT INTO ...", [], {
			code: "23503",
		} as unknown as Error);

		filter.catch(error, mockHost);

		expect(mockResponse.status).toHaveBeenCalledWith(
			HttpStatus.BAD_REQUEST,
		);
		expect(mockResponse.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Referenced resource not found",
			}),
		);
	});

	it("should handle unknown exceptions with 500", () => {
		const error = new Error("Something broke");

		filter.catch(error, mockHost);

		expect(mockResponse.status).toHaveBeenCalledWith(
			HttpStatus.INTERNAL_SERVER_ERROR,
		);
		expect(mockResponse.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Internal server error",
			}),
		);
		expect(logService.error).toHaveBeenCalled();
	});

	it("should handle non-Error exceptions", () => {
		filter.catch("string error", mockHost);

		expect(mockResponse.status).toHaveBeenCalledWith(
			HttpStatus.INTERNAL_SERVER_ERROR,
		);
	});

	it("should log warn for client errors (4xx)", () => {
		const exception = new BadRequestException("Bad request");

		filter.catch(exception, mockHost);

		expect(logService.warn).toHaveBeenCalled();
	});

	it("should log error for server errors (5xx)", () => {
		const exception = new HttpException("Server error", 500);

		filter.catch(exception, mockHost);

		expect(logService.error).toHaveBeenCalled();
	});

	it("should include path and timestamp in response", () => {
		const exception = new BadRequestException("Test");

		filter.catch(exception, mockHost);

		const jsonCall = mockResponse.json.mock.calls[0][0];
		expect(jsonCall.path).toBe("/api/test");
		expect(jsonCall.timestamp).toBeDefined();
	});

	it("should use 'anonymous' when no request.user on QueryFailedError", () => {
		const noUserHost = {
			switchToHttp: jest.fn().mockReturnValue({
				getResponse: jest.fn().mockReturnValue(mockResponse),
				getRequest: jest
					.fn()
					.mockReturnValue({ url: "/api/test", method: "POST" }),
			}),
		};
		const error = new QueryFailedError("INSERT ...", [], {
			code: "23505",
		} as unknown as Error);

		filter.catch(error, noUserHost as unknown as ArgumentsHost);

		expect(logService.error).toHaveBeenCalledWith(
			expect.objectContaining({ User: "anonymous" }),
		);
	});

	it("should use 'anonymous' when no request.user on 5xx error", () => {
		const noUserHost = {
			switchToHttp: jest.fn().mockReturnValue({
				getResponse: jest.fn().mockReturnValue(mockResponse),
				getRequest: jest
					.fn()
					.mockReturnValue({ url: "/api/test", method: "POST" }),
			}),
		};

		filter.catch(new Error("boom"), noUserHost as unknown as ArgumentsHost);

		expect(logService.error).toHaveBeenCalledWith(
			expect.objectContaining({ User: "anonymous" }),
		);
	});

	it("should use 'anonymous' when no request.user on 4xx error", () => {
		const noUserHost = {
			switchToHttp: jest.fn().mockReturnValue({
				getResponse: jest.fn().mockReturnValue(mockResponse),
				getRequest: jest
					.fn()
					.mockReturnValue({ url: "/api/test", method: "POST" }),
			}),
		};

		filter.catch(
			new BadRequestException("bad"),
			noUserHost as unknown as ArgumentsHost,
		);

		expect(logService.warn).toHaveBeenCalledWith(
			expect.objectContaining({ User: "anonymous" }),
		);
	});

	it("should fallback to 'Internal server error' when HttpException response has no message", () => {
		const exception = new HttpException({ statusCode: 400 }, 400);

		filter.catch(exception, mockHost);

		expect(mockResponse.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Internal server error",
			}),
		);
	});

	it.each([
		["23502", HttpStatus.BAD_REQUEST, "Missing required field"],
		["23514", HttpStatus.BAD_REQUEST, "Value violates a check constraint"],
		["22P02", HttpStatus.BAD_REQUEST, "Invalid input syntax"],
		["22001", HttpStatus.BAD_REQUEST, "Value too long for field"],
		["22003", HttpStatus.BAD_REQUEST, "Numeric value out of range"],
		["40001", HttpStatus.CONFLICT, "Transaction conflict, please retry"],
		["40P01", HttpStatus.CONFLICT, "Transaction conflict, please retry"],
		[
			"53300",
			HttpStatus.SERVICE_UNAVAILABLE,
			"Service temporarily unavailable",
		],
		["57014", HttpStatus.GATEWAY_TIMEOUT, "Request timed out"],
		["99999", HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error"],
	])(
		"should handle QueryFailedError with DB code %s",
		(code, expectedStatus, expectedMessage) => {
			const error = new QueryFailedError("SELECT ...", [], {
				code,
			} as unknown as Error);

			filter.catch(error, mockHost);

			expect(mockResponse.status).toHaveBeenCalledWith(expectedStatus);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expectedMessage,
				}),
			);
		},
	);
});
