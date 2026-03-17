import { applyDecorators } from "@nestjs/common";
import {
	ApiBadRequestResponse,
	ApiBody,
	ApiConflictResponse,
	ApiOperation,
	ApiResponse,
	ApiTags,
	ApiUnauthorizedResponse,
} from "@nestjs/swagger";

export function ApiAuthController() {
	return applyDecorators(ApiTags("Authentication"));
}

export function ApiRegister() {
	return applyDecorators(
		ApiOperation({
			summary: "Register a new user",
			description:
				"Creates a new user account, initialises a multi-currency wallet, and sends a 6-digit OTP to the provided email address for verification.",
		}),
		ApiBody({
			schema: {
				example: {
					email: "john.doe@example.com",
					password: "Password123!",
					firstName: "John",
					lastName: "Doe",
				},
			},
		}),
		ApiResponse({
			status: 201,
			description: "Registration successful — OTP dispatched to email.",
			schema: {
				example: {
					message:
						"Registration successful. Check your email for OTP.",
					success: true,
					path: "/api/v1/auth/register",
					timestamp: "2026-03-16T10:00:00.000Z",
					data: null,
				},
			},
		}),
		ApiConflictResponse({
			description: "Email is already registered.",
			schema: {
				example: {
					message: "Email already in use",
					success: false,
					path: "/api/v1/auth/register",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Email already in use"],
				},
			},
		}),
		ApiBadRequestResponse({
			description: "Validation failed — missing or invalid fields.",
			schema: {
				example: {
					message: "Validation failed",
					success: false,
					path: "/api/v1/auth/register",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: [
						"email must be an email",
						"password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character",
					],
				},
			},
		}),
	);
}

export function ApiVerifyOtp() {
	return applyDecorators(
		ApiOperation({
			summary: "Verify email with OTP",
			description:
				"Verifies the 6-digit OTP sent to the user's email. On success, the account is activated. The user must then log in to obtain a JWT access token. The OTP expires after the configured window (default 10 minutes).",
		}),
		ApiBody({
			schema: {
				example: {
					email: "john.doe@example.com",
					otp: "482931",
				},
			},
		}),
		ApiResponse({
			status: 200,
			description: "OTP verified — account activated. Please log in.",
			schema: {
				example: {
					message: "Email verified successfully. Please log in.",
					success: true,
					path: "/api/v1/auth/verify",
					timestamp: "2026-03-16T10:00:00.000Z",
					data: null,
				},
			},
		}),
		ApiUnauthorizedResponse({
			description: "Invalid OTP, wrong email, or OTP has expired.",
			schema: {
				example: {
					message: "Invalid OTP or email",
					success: false,
					path: "/api/v1/auth/verify",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Invalid OTP or email"],
				},
			},
		}),
		ApiBadRequestResponse({
			description: "Account is already verified.",
			schema: {
				example: {
					message: "Account already verified",
					success: false,
					path: "/api/v1/auth/verify",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Account already verified"],
				},
			},
		}),
	);
}

export function ApiLogin() {
	return applyDecorators(
		ApiOperation({
			summary: "Login with email and password",
			description:
				"Authenticates a verified user and returns a signed JWT access token. Uses timing-safe comparison to prevent email enumeration via response time.",
		}),
		ApiBody({
			schema: {
				example: {
					email: "john.doe@example.com",
					password: "Password123!",
				},
			},
		}),
		ApiResponse({
			status: 200,
			description: "Login successful — JWT access token returned.",
			schema: {
				example: {
					message: "Login successful",
					success: true,
					path: "/api/v1/auth/login",
					timestamp: "2026-03-16T10:00:00.000Z",
					data: {
						accessToken:
							"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC0xMjM0NTY3ODkwMTIiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDIxMjM0MDAsImV4cCI6MTc0MjIwOTgwMH0.signature",
					},
				},
			},
		}),
		ApiUnauthorizedResponse({
			description: "Invalid email or password.",
			schema: {
				example: {
					message: "Invalid credentials",
					success: false,
					path: "/api/v1/auth/login",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Invalid credentials"],
				},
			},
		}),
		ApiResponse({
			status: 403,
			description: "Account exists but email is not yet verified.",
			schema: {
				example: {
					message: "Please verify your email before logging in",
					success: false,
					path: "/api/v1/auth/login",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Please verify your email before logging in"],
				},
			},
		}),
	);
}

export function ApiResendOtp() {
	return applyDecorators(
		ApiOperation({
			summary: "Resend OTP verification email",
			description:
				"Generates a fresh OTP and re-sends it to the registered email. Always returns the same success message regardless of whether the email is registered — this prevents email enumeration. Limited to 3 requests per hour.",
		}),
		ApiBody({
			schema: {
				example: {
					email: "john.doe@example.com",
				},
			},
		}),
		ApiResponse({
			status: 200,
			description:
				"OTP re-sent (or silently no-op if email not registered).",
			schema: {
				example: {
					message:
						"If that email is registered, a new OTP has been sent.",
					success: true,
					path: "/api/v1/auth/resend-otp",
					timestamp: "2026-03-16T10:00:00.000Z",
					data: null,
				},
			},
		}),
		ApiBadRequestResponse({
			description: "Account is already verified — resend not needed.",
			schema: {
				example: {
					message: "Account already verified",
					success: false,
					path: "/api/v1/auth/resend-otp",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Account already verified"],
				},
			},
		}),
		ApiResponse({
			status: 429,
			description: "Rate limit exceeded (max 3 per hour).",
			schema: {
				example: {
					message: "ThrottlerException: Too Many Requests",
					success: false,
					path: "/api/v1/auth/resend-otp",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["ThrottlerException: Too Many Requests"],
				},
			},
		}),
	);
}
