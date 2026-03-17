import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { LogService } from "../../logging/log.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	constructor(private readonly logService: LogService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest();
		const { method, url, user } = request;
		const startTime = Date.now();

		return next.handle().pipe(
			tap({
				next: () => {
					this.logService.log({
						Service: "LoggingInterceptor",
						Method: "intercept",
						Action: "HTTP_REQUEST",
						User: user?.sub ?? "anonymous",
						Payload: {
							method,
							url,
							duration: `${Date.now() - startTime}ms`,
							status: "success",
						},
					});
				},
				error: (error: Error) => {
					this.logService.error({
						Service: "LoggingInterceptor",
						Method: "intercept",
						Action: "HTTP_REQUEST_ERROR",
						User: user?.sub ?? "anonymous",
						Payload: {
							method,
							url,
							duration: `${Date.now() - startTime}ms`,
							errorType: error.name,
						},
					});
				},
			}),
		);
	}
}
