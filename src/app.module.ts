import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigifyModule } from "@itgorillaz/configify";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { LoggingModule } from "./logging/logging.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { WalletsModule } from "./wallets/wallets.module";
import { FxRatesModule } from "./fx-rates/fx-rates.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { AppConfig } from "./config";

@Module({
	imports: [
		ConfigifyModule.forRootAsync(),

		ThrottlerModule.forRoot({
			throttlers: [
				{ name: "short", ttl: 1000, limit: 5 }, // 5 requests per second
				{ name: "long", ttl: 60000, limit: 100 }, // 100 requests per minute
			],
		}),

		ScheduleModule.forRoot(),

		LoggingModule,

		TypeOrmModule.forRootAsync({
			inject: [AppConfig],
			useFactory: (appConfig: AppConfig) => ({
				type: "postgres",
				host: appConfig.dbHost,
				port: appConfig.dbPort,
				username: appConfig.dbUsername,
				password: appConfig.dbPassword,
				database: appConfig.dbName,
				entities: [__dirname + "/**/*.entity{.ts,.js}"],
				migrations: [__dirname + "/database/migrations/*{.ts,.js}"],
				synchronize: false,
				logging: false,
			}),
		}),

		AuthModule,
		UsersModule,
		WalletsModule,
		FxRatesModule,
		TransactionsModule,
		MailModule,
	],
	providers: [
		{ provide: APP_FILTER, useClass: AllExceptionsFilter },
		{ provide: APP_GUARD, useClass: ThrottlerGuard },
		{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(RequestIdMiddleware).forRoutes("*path");
	}
}
