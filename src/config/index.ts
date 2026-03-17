import { Configuration, Value } from "@itgorillaz/configify";
import { IsNotEmpty, IsInt, IsString, Min, Max } from "class-validator";

@Configuration()
export class AppConfig {
	// App
	@Value("PORT", { default: 3000, parse: (v: string) => parseInt(v, 10) })
	@IsInt()
	@Min(1)
	@Max(65535)
	port: number;

	@Value("NODE_ENV", { default: "development" })
	@IsNotEmpty()
	@IsString()
	nodeEnv: string;

	@Value("ALLOWED_ORIGINS")
	@IsNotEmpty()
	@IsString()
	allowedOrigins: string;

	// Database
	@Value("DB_HOST")
	@IsNotEmpty()
	@IsString()
	dbHost: string;

	@Value("DB_PORT", { default: 5432, parse: (v: string) => parseInt(v, 10) })
	@IsInt()
	@Min(1)
	@Max(65535)
	dbPort: number;

	@Value("DB_USERNAME")
	@IsNotEmpty()
	@IsString()
	dbUsername: string;

	@Value("DB_PASSWORD")
	@IsNotEmpty()
	@IsString()
	dbPassword: string;

	@Value("DB_NAME")
	@IsNotEmpty()
	@IsString()
	dbName: string;

	// JWT
	@Value("JWT_SECRET")
	@IsNotEmpty()
	@IsString()
	jwtSecret: string;

	@Value("JWT_EXPIRES_IN", {
		default: 30,
		parse: (v: string) => parseInt(v, 10),
	})
	@IsInt()
	@Min(1)
	jwtExpiresIn: number;

	// Mail
	@Value("MAIL_HOST")
	@IsNotEmpty()
	@IsString()
	mailHost: string;

	@Value("MAIL_PORT", { default: 587, parse: (v: string) => parseInt(v, 10) })
	@IsInt()
	@Min(1)
	@Max(65535)
	mailPort: number;

	@Value("MAIL_USER")
	@IsNotEmpty()
	@IsString()
	mailUser: string;

	@Value("MAIL_PASS")
	@IsNotEmpty()
	@IsString()
	mailPass: string;

	@Value("MAIL_FROM")
	@IsNotEmpty()
	@IsString()
	mailFrom: string;

	// FX
	@Value("FX_API_KEY")
	@IsNotEmpty()
	@IsString()
	fxApiKey: string;

	@Value("FX_API_BASE_URL")
	@IsNotEmpty()
	@IsString()
	fxBaseUrl: string;

	@Value("FX_RATE_CACHE_TTL", {
		default: 60,
		parse: (v: string) => parseInt(v, 10),
	})
	@IsInt()
	@Min(1)
	fxCacheTtl: number;

	@Value("SUPPORTED_CURRENCIES", { default: "NGN,USD,EUR,GBP" })
	@IsNotEmpty()
	@IsString()
	private rawCurrencies: string;

	get supportedCurrencies(): string[] {
		return this.rawCurrencies.split(",");
	}

	// OTP
	@Value("OTP_EXPIRY_MINUTES", {
		default: 10,
		parse: (v: string) => parseInt(v, 10),
	})
	@IsInt()
	@Min(1)
	otpExpiryMinutes: number;

	// Logging
	@Value("LOGGLY_TOKEN")
	@IsNotEmpty()
	@IsString()
	logglyToken: string;

	// Redis
	@Value("REDIS_HOST", { default: "localhost" })
	@IsNotEmpty()
	@IsString()
	redisHost: string;

	@Value("REDIS_PORT", {
		default: 6379,
		parse: (v: string) => parseInt(v, 10),
	})
	@IsInt()
	@Min(1)
	@Max(65535)
	redisPort: number;

	// Helpers
	isDevelopment(): boolean {
		return this.nodeEnv.toLowerCase() === "development";
	}

	isProduction(): boolean {
		return this.nodeEnv.toLowerCase() === "production";
	}
}
