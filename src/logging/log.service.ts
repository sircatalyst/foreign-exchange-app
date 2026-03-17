import { Injectable, LoggerService, Inject, forwardRef } from "@nestjs/common";
import { createLogger, format, transports, Logger } from "winston";
import { AppConfig } from "../config";
import { LogPayloadType } from "./interfaces/log-payload.interface";
import { RequestContext } from "../common/context/request-context";

@Injectable()
export class LogService implements LoggerService {
	private logger: Logger;

	constructor(
		@Inject(forwardRef(() => AppConfig))
		private readonly appConfig: AppConfig,
	) {
		this.logger = createLogger({
			format: format.combine(
				format.errors({ stack: true }),
				format.timestamp(),
			),
			transports: [
				new transports.Console({
					format: format.combine(
						format.colorize(),
						format.prettyPrint(),
					),
				}),
			],
		});
	}

	private async sendDataToLoggly(
		level: string,
		message: Record<string, unknown>,
	): Promise<void> {
		const logglyToken = this.appConfig.logglyToken;
		if (!logglyToken) return;

		const logglyUrl = `https://logs-01.loggly.com/inputs/${logglyToken}/tag/http`;

		try {
			await fetch(logglyUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ level, message }),
			});
		} catch (error) {
			process.stderr.write(
				`Failed to send log to Loggly: ${(error as Error).message}\n`,
			);
		}
	}

	private enrich(payload: LogPayloadType | string): Record<string, unknown> {
		const base =
			typeof payload === "string"
				? { Message: payload }
				: (payload as Record<string, unknown>);
		return {
			ReqId: RequestContext.getReqId(),
			...base,
		};
	}

	log(payload: LogPayloadType | string): void {
		const enriched = this.enrich(payload);
		this.logger.info(JSON.stringify(enriched));
		void this.sendDataToLoggly("info", enriched);
	}

	error(payload: LogPayloadType | string): void {
		const enriched = this.enrich(payload);
		this.logger.error(JSON.stringify(enriched));
		void this.sendDataToLoggly("error", enriched);
	}

	warn(payload: LogPayloadType | string): void {
		const enriched = this.enrich(payload);
		this.logger.warn(JSON.stringify(enriched));
		void this.sendDataToLoggly("warn", enriched);
	}

	debug(payload: LogPayloadType | string): void {
		const enriched = this.enrich(payload);
		this.logger.debug(JSON.stringify(enriched));
		void this.sendDataToLoggly("debug", enriched);
	}

	verbose(payload: LogPayloadType | string): void {
		const enriched = this.enrich(payload);
		this.logger.verbose(JSON.stringify(enriched));
		void this.sendDataToLoggly("verbose", enriched);
	}
}
