import { applyDecorators } from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiBearerAuth,
	ApiBody,
	ApiResponse,
	ApiUnauthorizedResponse,
	ApiNotFoundResponse,
	ApiBadRequestResponse,
} from "@nestjs/swagger";

export function ApiWalletsController() {
	return applyDecorators(ApiTags("Wallet"), ApiBearerAuth("JWT"));
}

export function ApiGetWallet() {
	return applyDecorators(
		ApiOperation({
			summary: "Get wallet balances",
			description:
				"Returns the authenticated user's wallet balances for all supported currencies. Amounts are returned as decimal strings with 8 decimal places.",
		}),
		ApiResponse({
			status: 200,
			description: "Array of wallet balances per currency.",
			schema: {
				example: {
					message: "success",
					success: true,
					path: "/api/v1/wallet",
					timestamp: "2026-03-16T10:00:00.000Z",
					data: {
						balances: [
							{
								id: "e1f2a3b4-c5d6-7890-abcd-1234567890ab",
								walletId:
									"d4c3b2a1-f6e5-0987-dcba-0987654321fe",
								currency: "NGN",
								amount: "950000.00000000",
								createdAt: "2026-03-16T07:00:00.000Z",
								updatedAt: "2026-03-16T09:25:00.000Z",
							},
							{
								id: "f2a3b4c5-d6e7-8901-bcde-234567890abc",
								walletId:
									"d4c3b2a1-f6e5-0987-dcba-0987654321fe",
								currency: "USD",
								amount: "32.50000000",
								createdAt: "2026-03-16T07:00:00.000Z",
								updatedAt: "2026-03-16T09:25:00.000Z",
							},
							{
								id: "a3b4c5d6-e7f8-9012-cdef-34567890abcd",
								walletId:
									"d4c3b2a1-f6e5-0987-dcba-0987654321fe",
								currency: "GBP",
								amount: "0.00000000",
								createdAt: "2026-03-16T07:00:00.000Z",
								updatedAt: "2026-03-16T07:00:00.000Z",
							},
						],
					},
				},
			},
		}),
		ApiUnauthorizedResponse({
			description: "Missing or invalid JWT, or email not verified.",
			schema: {
				example: {
					message: "Unauthorized",
					success: false,
					path: "/api/v1/wallet",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Unauthorized"],
				},
			},
		}),
	);
}

export function ApiFundWallet() {
	return applyDecorators(
		ApiOperation({
			summary: "Fund wallet",
			description:
				"Credits the specified currency balance in the user's wallet. Uses a pessimistic write lock to prevent race conditions. Idempotency key is required — resubmitting the same key returns the original transaction without re-crediting. Returns the created funding transaction record.",
		}),
		ApiBody({
			schema: {
				example: {
					currency: "NGN",
					amount: "100000",
					idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
				},
			},
		}),
		ApiResponse({
			status: 201,
			description: "Wallet funded — transaction record returned.",
			schema: {
				example: {
					message: "success",
					success: true,
					path: "/api/v1/wallet/fund",
					timestamp: "2026-03-16T10:00:00.000Z",
					data: {
						id: "b2c3d4e5-f6a7-8901-bcde-234567890abc",
						userId: "f1e2d3c4-b5a6-7890-fedc-ba9876543210",
						type: "funding",
						status: "completed",
						fromCurrency: null,
						toCurrency: "NGN",
						fromAmount: null,
						toAmount: "100000.00000000",
						rate: null,
						description: "Wallet funded with 100000 NGN",
						idempotencyKey: "550e8401-e29b-41d4-a716-446655440000",
						metadata: null,
						createdAt: "2026-03-16T08:00:00.000Z",
						updatedAt: "2026-03-16T08:00:00.000Z",
					},
				},
			},
		}),
		ApiBadRequestResponse({
			description: "Unsupported currency or invalid amount format.",
			schema: {
				example: {
					message: "Currency XYZ is not supported",
					success: false,
					path: "/api/v1/wallet/fund",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Currency XYZ is not supported"],
				},
			},
		}),
		ApiNotFoundResponse({
			description: "Wallet or balance record not found.",
			schema: {
				example: {
					message: "Wallet not found",
					success: false,
					path: "/api/v1/wallet/fund",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Wallet not found"],
				},
			},
		}),
		ApiUnauthorizedResponse({
			description: "Missing or invalid JWT, or email not verified.",
			schema: {
				example: {
					message: "Unauthorized",
					success: false,
					path: "/api/v1/wallet/fund",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Unauthorized"],
				},
			},
		}),
	);
}

export function ApiConvertCurrency() {
	return applyDecorators(
		ApiOperation({
			summary: "Convert between currencies",
			description:
				"Converts an amount from one currency to another within the user's wallet. Uses live FX rates, pessimistic locking with alphabetical lock ordering (deadlock prevention). Idempotency key is required — resubmitting the same key returns the original transaction without re-executing. Returns the completed conversion transaction.",
		}),
		ApiBody({
			schema: {
				example: {
					fromCurrency: "NGN",
					toCurrency: "USD",
					amount: "50000",
					idempotencyKey: "550e8402-e29b-41d4-a716-446655440000",
				},
			},
		}),
		ApiResponse({
			status: 200,
			description:
				"Conversion executed — transaction record returned. Returns the existing record if the same idempotencyKey was used before.",
			schema: {
				example: {
					message: "success",
					success: true,
					path: "/api/v1/wallet/convert",
					timestamp: "2026-03-16T10:00:00.000Z",
					data: {
						id: "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
						userId: "f1e2d3c4-b5a6-7890-fedc-ba9876543210",
						type: "conversion",
						status: "completed",
						fromCurrency: "NGN",
						toCurrency: "USD",
						fromAmount: "50000.00000000",
						toAmount: "32.50000000",
						rate: "0.00065000",
						description:
							"Converted 50000.00000000 NGN to 32.50000000 USD",
						idempotencyKey: "550e8407-e29b-41d4-a716-446655440000",
						metadata: null,
						createdAt: "2026-03-16T09:25:00.000Z",
						updatedAt: "2026-03-16T09:25:00.000Z",
					},
				},
			},
		}),
		ApiBadRequestResponse({
			description:
				"Insufficient balance, same source/target currency, or invalid amount.",
			schema: {
				example: {
					message:
						"Insufficient NGN balance. Available: 10000.00000000, Required: 50000.00000000",
					success: false,
					path: "/api/v1/wallet/convert",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: [
						"Insufficient NGN balance. Available: 10000.00000000, Required: 50000.00000000",
					],
				},
			},
		}),
		ApiUnauthorizedResponse({
			description: "Missing or invalid JWT, or email not verified.",
			schema: {
				example: {
					message: "Unauthorized",
					success: false,
					path: "/api/v1/wallet/convert",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Unauthorized"],
				},
			},
		}),
	);
}

export function ApiTradeCurrency() {
	return applyDecorators(
		ApiOperation({
			summary: "Trade currency with slippage protection",
			description:
				"Executes a currency conversion with an optional slippage guard. If `expectedRate` and `slippageTolerance` are provided, the trade is rejected if the live rate has moved beyond the tolerance threshold — protecting against rate movements between quote and execution time.",
		}),
		ApiBody({
			schema: {
				example: {
					fromCurrency: "NGN",
					toCurrency: "USD",
					amount: "50000",
					expectedRate: "0.00072735",
					slippageTolerance: "0.01",
					idempotencyKey: "660e8400-e29b-41d4-a716-446655440000",
				},
			},
		}),
		ApiResponse({
			status: 200,
			description: "Trade executed within slippage tolerance.",
			schema: {
				example: {
					message: "success",
					success: true,
					path: "/api/v1/wallet/trade",
					timestamp: "2026-03-16T10:00:00.000Z",
					data: {
						id: "c3d4e5f6-a7b8-9012-cdef-34567890abcd",
						userId: "f1e2d3c4-b5a6-7890-fedc-ba9876543210",
						type: "trade",
						status: "completed",
						fromCurrency: "NGN",
						toCurrency: "USD",
						fromAmount: "50000.00000000",
						toAmount: "32.49000000",
						rate: "0.00064980",
						description:
							"Converted 50000.00000000 NGN to 32.49000000 USD",
						idempotencyKey: "660e8400-e29b-41d4-a716-446655440000",
						metadata: null,
						createdAt: "2026-03-16T09:30:00.000Z",
						updatedAt: "2026-03-16T09:30:00.000Z",
					},
				},
			},
		}),
		ApiBadRequestResponse({
			description:
				"Live rate moved beyond the slippage tolerance, insufficient balance, or invalid input.",
			schema: {
				example: {
					message:
						"Rate has moved beyond tolerance. Live: 0.00058, Expected: 0.00072735. Please retry.",
					success: false,
					path: "/api/v1/wallet/trade",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: [
						"Rate has moved beyond tolerance. Live: 0.00058, Expected: 0.00072735. Please retry.",
					],
				},
			},
		}),
		ApiUnauthorizedResponse({
			description: "Missing or invalid JWT, or email not verified.",
			schema: {
				example: {
					message: "Unauthorized",
					success: false,
					path: "/api/v1/wallet/trade",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Unauthorized"],
				},
			},
		}),
	);
}
