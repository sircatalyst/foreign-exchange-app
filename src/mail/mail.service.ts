import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import * as handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import { AppConfig } from "../config";
import { LogService } from "../logging/log.service";

@Injectable()
export class MailService {
	private transporter: nodemailer.Transporter;
	private readonly className = MailService.name;

	constructor(
		private readonly appConfig: AppConfig,
		private readonly logService: LogService,
	) {
		this.transporter = nodemailer.createTransport({
			host: appConfig.mailHost,
			port: appConfig.mailPort,
			secure: false,
			auth: {
				user: appConfig.mailUser,
				pass: appConfig.mailPass,
			},
		});
	}

	private renderTemplate(
		templateName: string,
		context: Record<string, unknown>,
	): string {
		const templatePath = path.join(
			__dirname,
			"templates",
			`${templateName}.hbs`,
		);
		const source = fs.readFileSync(templatePath, "utf8");
		const compiled = handlebars.compile(source);
		return compiled(context);
	}

	async sendOtp(to: string, otp: string, firstName: string): Promise<void> {
		const html = this.renderTemplate("otp", {
			firstName,
			otp,
			expiryMinutes: this.appConfig.otpExpiryMinutes,
		});

		try {
			await this.transporter.sendMail({
				from: this.appConfig.mailFrom,
				to,
				subject: "Your FX Trading App verification code",
				html,
			});
			this.logService.log({
				Service: this.className,
				Method: "sendOtp",
				Action: "EMAIL_SENT",
				User: to,
				Payload: { subject: "Your FX Trading App verification code" },
			});
		} catch (error) {
			this.logService.error({
				Service: this.className,
				Method: "sendOtp",
				Action: "EMAIL_FAILED",
				User: to,
				Payload: { error: (error as Error).message },
			});
			throw error;
		}
	}

	async resendOtp(to: string, otp: string, firstName: string): Promise<void> {
		const html = this.renderTemplate("resend-otp", {
			firstName,
			otp,
			expiryMinutes: this.appConfig.otpExpiryMinutes,
		});

		try {
			await this.transporter.sendMail({
				from: this.appConfig.mailFrom,
				to,
				subject: "New FX Trading App verification code",
				html,
			});
			this.logService.log({
				Service: this.className,
				Method: "resendOtp",
				Action: "EMAIL_SENT",
				User: to,
				Payload: { subject: "New FX Trading App verification code" },
			});
		} catch (error) {
			this.logService.error({
				Service: this.className,
				Method: "resendOtp",
				Action: "EMAIL_FAILED",
				User: to,
				Payload: { error: (error as Error).message },
			});
			throw error;
		}
	}
}
