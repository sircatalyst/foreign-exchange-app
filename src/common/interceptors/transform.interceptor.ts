import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Request } from "express";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, unknown> {
	intercept(
		context: ExecutionContext,
		next: CallHandler<T>,
	): Observable<unknown> {
		const ctx = context.switchToHttp();
		const request = ctx.getRequest<Request>();

		return next.handle().pipe(
			map((data: unknown) => {
				const timestamp = new Date().toISOString();
				const path = request.url;

				let message = "success";
				let responseData: unknown = data ?? null;

				if (
					data !== null &&
					data !== undefined &&
					typeof data === "object" &&
					!Array.isArray(data)
				) {
					const obj = data as Record<string, unknown>;
					if (typeof obj.message === "string") {
						message = obj.message;
						const rest = Object.fromEntries(
							Object.entries(obj).filter(
								([k]) => k !== "message",
							),
						);
						responseData =
							Object.keys(rest).length > 0 ? rest : null;
					}
				}

				return {
					message,
					success: true,
					path,
					timestamp,
					data: responseData,
				};
			}),
		);
	}
}
