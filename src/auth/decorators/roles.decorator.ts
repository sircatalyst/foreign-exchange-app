import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { UserRole } from "../../users/entities/user.entity";
import { RolesGuard } from "../guards/roles.guard";

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const AdminOnly = () =>
	applyDecorators(UseGuards(RolesGuard), Roles(UserRole.ADMIN));
