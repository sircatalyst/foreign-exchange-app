import { RequestContext } from "./request-context";

describe("RequestContext", () => {
	it("should return N/A when no context is set", () => {
		expect(RequestContext.getReqId()).toBe("N/A");
	});

	it("should return the request ID within the run callback", (done) => {
		RequestContext.run("REQ-123", () => {
			expect(RequestContext.getReqId()).toBe("REQ-123");
			done();
		});
	});
});
