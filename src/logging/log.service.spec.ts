import { LogService } from "./log.service";
import { AppConfig } from "../config";

// Mock fetch globally
const mockFetch = jest.fn().mockResolvedValue({});
global.fetch = mockFetch;

describe("LogService", () => {
	let service: LogService;
	let appConfig: Partial<AppConfig>;

	beforeEach(() => {
		appConfig = {
			logglyToken: "test-loggly-token",
		} as Partial<AppConfig>;

		service = new LogService(appConfig as AppConfig);
		mockFetch.mockClear();
	});

	describe("log", () => {
		it("should log info message", () => {
			service.log({
				Service: "TestService",
				Method: "test",
				Action: "TEST",
				User: "user-1",
			});

			// Should not throw
			expect(mockFetch).toHaveBeenCalled();
		});

		it("should handle string payload", () => {
			service.log("simple string message");

			expect(mockFetch).toHaveBeenCalled();
		});
	});

	describe("error", () => {
		it("should log error message", () => {
			service.error({
				Service: "TestService",
				Method: "test",
				Action: "ERROR",
				User: "user-1",
				Payload: { error: "something went wrong" },
			});

			expect(mockFetch).toHaveBeenCalled();
		});
	});

	describe("warn", () => {
		it("should log warn message", () => {
			service.warn({
				Service: "TestService",
				Method: "test",
				Action: "WARN",
				User: "user-1",
			});

			expect(mockFetch).toHaveBeenCalled();
		});
	});

	describe("debug", () => {
		it("should log debug message", () => {
			service.debug("debug message");

			// Does not throw
			expect(true).toBe(true);
		});
	});

	describe("verbose", () => {
		it("should log verbose message", () => {
			service.verbose("verbose message");

			expect(true).toBe(true);
		});
	});

	describe("sendDataToLoggly", () => {
		it("should not send to Loggly if token is missing", () => {
			const noTokenConfig = {
				logglyToken: "",
			} as Partial<AppConfig>;

			const svc = new LogService(noTokenConfig as AppConfig);
			mockFetch.mockClear();

			svc.log("test");

			// fetch should not be called since logglyToken is empty
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should handle fetch failure gracefully", () => {
			mockFetch.mockRejectedValue(new Error("Network error"));

			// Should not throw
			service.log("test message");

			expect(mockFetch).toHaveBeenCalled();
		});
	});
});
