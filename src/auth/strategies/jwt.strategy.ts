import { Injectable, ForbiddenException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AppConfig } from "../../config";
import { UsersService } from "../../users/services/users.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private appConfig: AppConfig,
		private usersService: UsersService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: appConfig.jwtSecret,
		});
	}

	async validate(payload: { sub: string; email: string; role: string }) {
		const user = await this.usersService.findById(payload.sub);
		if (!user?.isVerified) {
			throw new ForbiddenException("Email not verified");
		}
		return {
			userId: payload.sub,
			email: payload.email,
			role: payload.role,
		};
	}
}
