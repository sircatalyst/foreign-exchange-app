import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { DataSource } from "typeorm";
import { AppModule } from "./app.module";
import { LogService } from "./logging/log.service";
import { AppConfig } from "./config";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { bufferLogs: true });

	const logService = app.get(LogService);
	app.useLogger(logService);

	const dataSource = app.get(DataSource);
	const hasPending = await dataSource.showMigrations();
	if (hasPending) {
		logService.log({
			Service: "Bootstrap",
			Method: "bootstrap",
			Action: "MIGRATIONS_RUNNING",
			User: "system",
		});
		await dataSource.runMigrations();
		logService.log({
			Service: "Bootstrap",
			Method: "bootstrap",
			Action: "MIGRATIONS_COMPLETE",
			User: "system",
		});
	}

	const appConfig = app.get(AppConfig);

	app.use(helmet());

	app.enableCors({
		origin: appConfig.allowedOrigins?.split(",") ?? "http://localhost:3000",
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	});

	app.setGlobalPrefix("api/v1");

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

	if (!appConfig.isProduction()) {
		const swaggerConfig = new DocumentBuilder()
			.setTitle("Foreign Exchange Trading API")
			.setDescription(
				"Multi-currency wallet and Foreign Exchange trading backend",
			)
			.setVersion("1.0")
			.addBearerAuth(
				{ type: "http", scheme: "bearer", bearerFormat: "JWT" },
				"JWT",
			)
			.addTag(
				"Authentication",
				"Registration, OTP verification, and login",
			)
			.addTag(
				"Wallet",
				"Wallet management, funding, and currency conversion",
			)
			.addTag("Transactions", "Transaction history and details")
			.addTag("Foreign Exchange Rates", "Real-time exchange rates")
			.build();

		const document = SwaggerModule.createDocument(app, swaggerConfig);
		SwaggerModule.setup("docs", app, document, {
			swaggerOptions: { persistAuthorization: true },
		});
	}

	const port = appConfig.port;
	await app.listen(port);

	logService.log({
		Service: "Bootstrap",
		Method: "bootstrap",
		Action: "APP_STARTED",
		User: "system",
		Payload: { port, env: appConfig.nodeEnv },
	});
}
bootstrap();
