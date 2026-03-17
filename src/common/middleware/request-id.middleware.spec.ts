import { RequestIdMiddleware } from "./request-id.middleware";
import { Request, Response } from "express";

describe("RequestIdMiddleware", () => {
	let middleware: RequestIdMiddleware;

	beforeEach(() => {
		middleware = new RequestIdMiddleware();
	});

	it("should use existing x-request-id header if present", (done) => {
		const req = {
			headers: { "x-request-id": "existing-id" },
		} as unknown as Request;
		const res = {} as Response;

		middleware.use(req, res, () => {
			expect(req.headers["x-request-id"]).toBe("existing-id");
			done();
		});
	});

	it("should generate a request id if not present", (done) => {
		const req = {
			headers: {},
		} as unknown as Request;
		const res = {} as Response;

		middleware.use(req, res, () => {
			expect(req.headers["x-request-id"]).toBeDefined();
			expect(
				(req.headers["x-request-id"] as string).startsWith("REQ-"),
			).toBe(true);
			done();
		});
	});
});
