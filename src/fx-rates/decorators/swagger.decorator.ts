import { applyDecorators } from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiBearerAuth,
	ApiQuery,
	ApiResponse,
	ApiUnauthorizedResponse,
	ApiForbiddenResponse,
	ApiServiceUnavailableResponse,
} from "@nestjs/swagger";

export function ApiFxRatesController() {
	return applyDecorators(ApiTags("FX Rates"), ApiBearerAuth("JWT"));
}

export function ApiGetRates() {
	return applyDecorators(
		ApiOperation({
			summary: "Get current FX rates",
			description:
				"Returns live exchange rates for all supported currency pairs relative to NGN. Rates are served from a Redis cache and fall back to the FX provider if the cache is cold. Stale rates may be served if the FX provider is temporarily unavailable.",
		}),
		ApiResponse({
			status: 200,
			description:
				"Live or cached FX rates for all supported currencies.",
			schema: {
				example: {
					message: "success",
					success: true,
					path: "/api/v1/fx/rates",
					timestamp: "2026-03-16T10:00:00.000Z",
					data: {
						currencies: [
							{ currency: "USD", rate: "0.00065" },
							{ currency: "EUR", rate: "0.00060" },
							{ currency: "GBP", rate: "0.00051" },
						],
					},
				},
			},
		}),
		ApiUnauthorizedResponse({
			description: "Missing or invalid JWT token.",
			schema: {
				example: {
					message: "Unauthorized",
					success: false,
					path: "/api/v1/fx/rates",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Unauthorized"],
				},
			},
		}),
		ApiServiceUnavailableResponse({
			description: "FX provider is down and no cached data is available.",
			schema: {
				example: {
					message:
						"FX rate service is currently unavailable. Please try again later.",
					success: false,
					path: "/api/v1/fx/rates",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: [
						"FX rate service is currently unavailable. Please try again later.",
					],
				},
			},
		}),
	);
}

export function ApiGetRateHistory() {
	return applyDecorators(
		ApiOperation({
			summary: "[ADMIN] Get historical FX rate snapshots",
			description:
				"Returns hourly rate snapshots for a given quote currency within a date range. Snapshots are captured automatically every hour. Requires ADMIN role.",
		}),
		ApiQuery({
			name: "from",
			required: true,
			description: "Start of date range (ISO 8601)",
			example: "2026-03-01",
		}),
		ApiQuery({
			name: "to",
			required: true,
			description: "End of date range (ISO 8601)",
			example: "2026-04-30",
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
			name: "currency",
			required: false,
			description:
				"Quote currency to filter by (3-letter ISO code). If omitted, returns all currencies.",
			example: "USD",
		}),
		ApiResponse({
			status: 200,
			description: "Paginated rate snapshots ordered by time ascending.",
			schema: {
				example: {
					message: "success",
					success: true,
					path: "/api/v1/fx/rates/history?from=2026-03-01&to=2026-03-18",
					timestamp: "2026-03-16T10:00:00.000Z",
					data: {
						snapshots: [
							{
								id: "c1d2e3f4-a5b6-7890-abcd-1234567890ab",
								baseCurrency: "NGN",
								quoteCurrency: "USD",
								rate: "0.00065000",
								snapshotAt: "2026-03-16T09:00:00.000Z",
							},
							{
								id: "d2e3f4a5-b6c7-8901-bcde-234567890abc",
								baseCurrency: "NGN",
								quoteCurrency: "USD",
								rate: "0.00064800",
								snapshotAt: "2026-03-16T10:00:00.000Z",
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
			description: "Missing or invalid JWT token.",
			schema: {
				example: {
					message: "Unauthorized",
					success: false,
					path: "/api/v1/fx/rates/history",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Unauthorized"],
				},
			},
		}),
		ApiForbiddenResponse({
			description: "Authenticated user does not have the ADMIN role.",
			schema: {
				example: {
					message: "Forbidden resource",
					success: false,
					path: "/api/v1/fx/rates/history",
					timestamp: "2026-03-16T10:00:00.000Z",
					error: ["Forbidden resource"],
				},
			},
		}),
	);
}
