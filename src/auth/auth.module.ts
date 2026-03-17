import { Module } from "@nestjs/common";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "../users/users.module";
import { WalletsModule } from "../wallets/wallets.module";
import { MailModule } from "../mail/mail.module";
import { AppConfig } from "../config";
import { AuthService } from "./services/auth.service";
import { AuthController } from "./controllers/auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
	imports: [
		UsersModule,
		WalletsModule,
		MailModule,
		JwtModule.registerAsync({
			inject: [AppConfig],
			useFactory: (appConfig: AppConfig): JwtModuleOptions => ({
				secret: appConfig.jwtSecret,
				signOptions: {
					expiresIn: appConfig.jwtExpiresIn * 60,
				},
			}),
		}),
		PassportModule,
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
