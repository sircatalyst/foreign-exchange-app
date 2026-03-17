import { applyDecorators } from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiBearerAuth,
	ApiQuery,
	ApiResponse,
	ApiUnauthorizedResponse,
	ApiNotFoundResponse,
	ApiBadRequestResponse,
} from "@nestjs/swagger";

export function ApiTransactionsController() {
	return applyDecorators(ApiTags("Transactions"), ApiBearerAuth("JWT"));
}

export function ApiListTransactions() {
	return applyDecorators(
		ApiOperation({
			summary: "List transaction history",
			description:
				"Returns a paginated list of the authenticated user's transactions. Supports filtering by type, currency, and date range. Results are ordered by newest first.",
		}),
		ApiQuery({
			name: "page",
			required: false,
			description: "Page number (default: 1)",
			example: 1,
		}),
		ApiQuery({
			name: "limit",
			required: false,
			description: "Items per page — max 100 (default: 20)",
			example: 20,
		}),
		ApiQuery({
			name: "type",
			required: false,
			description: "Filter by transaction type",
			enum: ["conversion", "funding", "trade"],
		}),
		ApiQuery({
			name: "currency",
			required: false,
			description:
				"Filter by currency (matches fromCurrency or toCurrency)",
			example: "NGN",
		}),
		ApiQuery({
			name: "from",
			required: false,
			description: "Start of date range (ISO 8601)",
			example: "2026-03-01",
		}),
		ApiQuery({
			name: "to",
			required: false,
			description: "End of date range (ISO 8601)",
			example: "2026-04-30",
		}),
		ApiResponse({
			status: 200,
			description: "Paginated transaction list.",
			schema: {
				example: {
					message: "success",
					success: true,
					path: "/api/v1/transactions",
					timestamp: "2026-03-16T10:00:00.000Z",
					data: {
						transactions: [
							{
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
								idempotencyKey: null,
								metadata: null,
								createdAt: "2026-03-16T09:25:00.000Z",
								updatedAt: "2026-03-16T09:25:00.000Z",
							},
							{
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
								idempotencyKey: null,
								metadata: null,
								createdAt: "2026-03-16T08:00:00.000Z",
								updatedAt: "2026-03-16T08:00:00.000Z",
							},
						],
						total: 2,
						page: 1,
						limit: 20,
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
					path: "/api/v1/transactions",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Unauthorized"],
				},
			},
		}),
	);
}

export function ApiGetTransaction() {
	return applyDecorators(
		ApiOperation({
			summary: "Get a transaction by ID",
			description:
				"Returns a single transaction by UUID. The transaction must belong to the authenticated user — a transaction owned by another user returns 404 (not 403) to prevent information leakage.",
		}),
		ApiResponse({
			status: 200,
			description: "Transaction found and returned.",
			schema: {
				example: {
					message: "success",
					success: true,
					path: "/api/v1/transactions/a1b2c3d4-e5f6-7890-abcd-1234567890ab",
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
						idempotencyKey: null,
						metadata: null,
						createdAt: "2026-03-16T09:25:00.000Z",
						updatedAt: "2026-03-16T09:25:00.000Z",
					},
				},
			},
		}),
		ApiNotFoundResponse({
			description:
				"Transaction not found or belongs to a different user.",
			schema: {
				example: {
					message: "Transaction not found",
					success: false,
					path: "/api/v1/transactions/a1b2c3d4-e5f6-7890-abcd-1234567890ab",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Transaction not found"],
				},
			},
		}),
		ApiBadRequestResponse({
			description: "ID parameter is not a valid UUID.",
			schema: {
				example: {
					message: "Validation failed",
					success: false,
					path: "/api/v1/transactions/not-a-uuid",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Validation failed (uuid  is expected)"],
				},
			},
		}),
		ApiUnauthorizedResponse({
			description: "Missing or invalid JWT, or email not verified.",
			schema: {
				example: {
					message: "Unauthorized",
					success: false,
					path: "/api/v1/transactions/a1b2c3d4-e5f6-7890-abcd-1234567890ab",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Unauthorized"],
				},
			},
		}),
	);
}
