import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { RequestContext } from "../context/request-context";

function generateReqId(): string {
	const ts = Date.now().toString(36).toUpperCase();
	const rand = randomBytes(4).toString("hex").toUpperCase();
	return `REQ-${ts}${rand}`;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
	use(req: Request, res: Response, next: NextFunction): void {
		const reqId =
			(req.headers["x-request-id"] as string) || generateReqId();
		req.headers["x-request-id"] = reqId;

		RequestContext.run(reqId, () => next());
	}
}
