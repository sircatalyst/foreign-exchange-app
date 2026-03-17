import { MailService } from "./mail.service";
import { AppConfig } from "../config";
import { LogService } from "../logging/log.service";
import * as fs from "fs";
import * as nodemailer from "nodemailer";

jest.mock("fs");
jest.mock("nodemailer");

describe("MailService", () => {
	let service: MailService;
	let logService: jest.Mocked<Pick<LogService, "log" | "error">>;
	let mockTransporter: { sendMail: jest.Mock };

	beforeEach(() => {
		logService = {
			log: jest.fn(),
			error: jest.fn(),
		};

		const appConfig = {
			mailHost: "smtp.test.com",
			mailPort: 587,
			mailUser: "user",
			mailPass: "pass",
			mailFrom: "noreply@test.com",
			otpExpiryMinutes: 10,
		} as Partial<AppConfig>;

		mockTransporter = {
			sendMail: jest.fn().mockResolvedValue({ messageId: "msg-1" }),
		};

		(nodemailer.createTransport as jest.Mock).mockReturnValue(
			mockTransporter,
		);

		(fs.readFileSync as jest.Mock).mockReturnValue(
			"<p>Hello {{firstName}}, your OTP is {{otp}}</p>",
		);

		service = new MailService(
			appConfig as AppConfig,
			logService as unknown as LogService,
		);
	});

	describe("sendOtp", () => {
		it("should send OTP email", async () => {
			await service.sendOtp("test@example.com", "123456", "John");

			expect(mockTransporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: "test@example.com",
					subject: "Your FX Trading App verification code",
				}),
			);
			expect(logService.log).toHaveBeenCalled();
		});

		it("should throw and log on send failure", async () => {
			mockTransporter.sendMail.mockRejectedValue(new Error("SMTP error"));

			await expect(
				service.sendOtp("test@example.com", "123456", "John"),
			).rejects.toThrow("SMTP error");
			expect(logService.error).toHaveBeenCalled();
		});
	});

	describe("resendOtp", () => {
		it("should send resend OTP email", async () => {
			await service.resendOtp("test@example.com", "654321", "Jane");

			expect(mockTransporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: "test@example.com",
					subject: "New FX Trading App verification code",
				}),
			);
			expect(logService.log).toHaveBeenCalled();
		});

		it("should throw and log on resend failure", async () => {
			mockTransporter.sendMail.mockRejectedValue(
				new Error("Connection refused"),
			);

			await expect(
				service.resendOtp("test@example.com", "654321", "Jane"),
			).rejects.toThrow("Connection refused");
			expect(logService.error).toHaveBeenCalled();
		});
	});
});
