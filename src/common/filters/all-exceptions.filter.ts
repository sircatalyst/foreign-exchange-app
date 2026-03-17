import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { QueryFailedError } from "typeorm";
import { LogService } from "../../logging/log.service";

interface DatabaseError {
	code: string;
	detail?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	constructor(private readonly logService: LogService) {}

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		let status: number;
		let messageForClient: string | string[];

		if (exception instanceof HttpException) {
			status = exception.getStatus();
			const responseBody = exception.getResponse();
			messageForClient =
				typeof responseBody === "string"
					? responseBody
					: ((responseBody as any).message ??
						"Internal server error");
		} else if (exception instanceof QueryFailedError) {
			const dbError = exception.driverError as DatabaseError;
			({ status, messageForClient } = this.handleDatabaseError(dbError));

			this.logService.error({
				Service: "AllExceptionsFilter",
				Method: "catch",
				Action: "DATABASE_ERROR",
				User: (request as any).user?.sub ?? "anonymous",
				Payload: {
					path: request.url,
					method: request.method,
					statusCode: status,
					pgCode: dbError.code,
					error: exception.message,
				},
			});
		} else {
			status = HttpStatus.INTERNAL_SERVER_ERROR;
			messageForClient = "Internal server error";
		}

		if (!(exception instanceof QueryFailedError)) {
			if (status >= 500) {
				this.logService.error({
					Service: "AllExceptionsFilter",
					Method: "catch",
					Action: "UNHANDLED_EXCEPTION",
					User: (request as any).user?.sub ?? "anonymous",
					Payload: {
						path: request.url,
						method: request.method,
						statusCode: status,
						error:
							exception instanceof Error
								? exception.message
								: String(exception),
						stack:
							exception instanceof Error
								? exception.stack
								: undefined,
					},
				});
			} else {
				this.logService.warn({
					Service: "AllExceptionsFilter",
					Method: "catch",
					Action: "CLIENT_ERROR",
					User: (request as any).user?.sub ?? "anonymous",
					Payload: {
						path: request.url,
						method: request.method,
						statusCode: status,
						error: messageForClient,
					},
				});
			}
		}

		const isArrayMessage = Array.isArray(messageForClient);
		const messageStr: string = isArrayMessage
			? "Validation failed"
			: (messageForClient as string);
		const errorDetail: string[] = isArrayMessage
			? (messageForClient as string[])
			: [messageForClient as string];

		response.status(status).json({
			message: messageStr,
			success: false,
			path: request.url,
			timestamp: new Date().toISOString(),
			error: errorDetail,
		});
	}

	private handleDatabaseError(dbError: DatabaseError): {
		status: number;
		messageForClient: string;
	} {
		switch (dbError.code) {
			case "23505":
				return {
					status: HttpStatus.CONFLICT,
					messageForClient: "Resource already exists",
				};
			case "23503":
				return {
					status: HttpStatus.BAD_REQUEST,
					messageForClient: "Referenced resource not found",
				};
			case "23502":
				return {
					status: HttpStatus.BAD_REQUEST,
					messageForClient: "Missing required field",
				};
			case "23514":
				return {
					status: HttpStatus.BAD_REQUEST,
					messageForClient: "Value violates a check constraint",
				};
			case "22P02":
				return {
					status: HttpStatus.BAD_REQUEST,
					messageForClient: "Invalid input syntax",
				};
			case "22001":
				return {
					status: HttpStatus.BAD_REQUEST,
					messageForClient: "Value too long for field",
				};
			case "22003":
				return {
					status: HttpStatus.BAD_REQUEST,
					messageForClient: "Numeric value out of range",
				};
			case "40001":
				return {
					status: HttpStatus.CONFLICT,
					messageForClient: "Transaction conflict, please retry",
				};
			case "40P01":
				return {
					status: HttpStatus.CONFLICT,
					messageForClient: "Transaction conflict, please retry",
				};
			case "53300":
				return {
					status: HttpStatus.SERVICE_UNAVAILABLE,
					messageForClient: "Service temporarily unavailable",
				};
			case "57014":
				return {
					status: HttpStatus.GATEWAY_TIMEOUT,
					messageForClient: "Request timed out",
				};
			default:
				return {
					status: HttpStatus.INTERNAL_SERVER_ERROR,
					messageForClient: "Internal server error",
				};
		}
	}
}
