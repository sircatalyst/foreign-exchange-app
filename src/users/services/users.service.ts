import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { User } from "../entities/user.entity";
import { LogService } from "../../logging/log.service";

@Injectable()
export class UsersService {
	private readonly className = UsersService.name;

	constructor(
		@InjectRepository(User)
		private readonly userRepo: Repository<User>,
		private readonly logService: LogService,
	) {}

	async findByEmail(email: string): Promise<User | null> {
		const user = await this.userRepo.findOne({ where: { email } });
		this.logService.log({
			Service: this.className,
			Method: "findByEmail",
			Action: "USER_LOOKUP",
			User: email,
			Returns: { found: !!user },
		});
		return user;
	}

	async findByEmailWithPassword(email: string): Promise<User | null> {
		const user = await this.userRepo
			.createQueryBuilder("user")
			.addSelect("user.passwordHash")
			.where("user.email = :email", { email })
			.getOne();
		this.logService.log({
			Service: this.className,
			Method: "findByEmailWithPassword",
			Action: "USER_LOOKUP",
			User: email,
			Returns: { found: !!user },
		});
		return user;
	}

	async findById(id: string): Promise<User | null> {
		const user = await this.userRepo.findOne({ where: { id } });
		this.logService.log({
			Service: this.className,
			Method: "findById",
			Action: "USER_LOOKUP",
			User: id,
			Returns: { found: !!user },
		});
		return user;
	}

	async create(data: Partial<User>): Promise<User> {
		const user = this.userRepo.create(data);
		const saved = await this.userRepo.save(user);
		this.logService.log({
			Service: this.className,
			Method: "create",
			Action: "USER_CREATED",
			User: saved.email,
			Returns: { id: saved.id },
		});
		return saved;
	}

	async update(id: string, data: Partial<User>): Promise<void> {
		await this.userRepo.update(id, data);
		this.logService.log({
			Service: this.className,
			Method: "update",
			Action: "USER_UPDATED",
			User: id,
			Payload: { fields: Object.keys(data) },
		});
	}

	async createWithManager(
		manager: EntityManager,
		data: Partial<User>,
	): Promise<User> {
		const user = manager.getRepository(User).create(data);
		const saved = await manager.getRepository(User).save(user);
		this.logService.log({
			Service: this.className,
			Method: "createWithManager",
			Action: "USER_CREATED",
			User: saved.email,
			Returns: { id: saved.id },
		});
		return saved;
	}
}
