import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { UsersService } from "./users.service";
import { User } from "../entities/user.entity";
import { LogService } from "../../logging/log.service";

describe("UsersService", () => {
	let service: UsersService;
	let logService: jest.Mocked<Pick<LogService, "log" | "warn" | "error">>;

	const mockUser = {
		id: "user-uuid-1",
		email: "test@example.com",
		firstName: "John",
		lastName: "Doe",
		isVerified: false,
	};

	const mockQueryBuilder = {
		addSelect: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		getOne: jest.fn(),
	};

	const userRepo = {
		findOne: jest.fn(),
		create: jest.fn().mockImplementation((data: unknown) => data),
		save: jest.fn(),
		update: jest.fn(),
		createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
	};

	beforeEach(async () => {
		logService = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		userRepo.findOne.mockReset();
		userRepo.save.mockReset();
		userRepo.update.mockReset();
		mockQueryBuilder.getOne.mockReset();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UsersService,
				{ provide: getRepositoryToken(User), useValue: userRepo },
				{ provide: LogService, useValue: logService },
			],
		}).compile();

		service = module.get<UsersService>(UsersService);
	});

	describe("findByEmail", () => {
		it("should return user if found", async () => {
			userRepo.findOne.mockResolvedValue(mockUser);

			const result = await service.findByEmail("test@example.com");

			expect(result).toEqual(mockUser);
			expect(userRepo.findOne).toHaveBeenCalledWith({
				where: { email: "test@example.com" },
			});
		});

		it("should return null if not found", async () => {
			userRepo.findOne.mockResolvedValue(null);

			const result = await service.findByEmail("notfound@example.com");

			expect(result).toBeNull();
		});
	});

	describe("findByEmailWithPassword", () => {
		it("should return user with password hash", async () => {
			mockQueryBuilder.getOne.mockResolvedValue({
				...mockUser,
				passwordHash: "hashed",
			});

			const result =
				await service.findByEmailWithPassword("test@example.com");

			expect(result).toBeDefined();
			expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
				"user.passwordHash",
			);
		});
	});

	describe("findById", () => {
		it("should return user by id", async () => {
			userRepo.findOne.mockResolvedValue(mockUser);

			const result = await service.findById("user-uuid-1");

			expect(result).toEqual(mockUser);
		});

		it("should return null if not found", async () => {
			userRepo.findOne.mockResolvedValue(null);

			const result = await service.findById("nonexistent");

			expect(result).toBeNull();
		});
	});

	describe("create", () => {
		it("should create and save a user", async () => {
			const data = { email: "new@example.com", firstName: "Jane" };
			userRepo.save.mockResolvedValue({ id: "new-uuid", ...data });

			const result = await service.create(data);

			expect(result).toEqual({ id: "new-uuid", ...data });
			expect(userRepo.create).toHaveBeenCalledWith(data);
			expect(userRepo.save).toHaveBeenCalled();
		});
	});

	describe("update", () => {
		it("should update user by id", async () => {
			userRepo.update.mockResolvedValue({ affected: 1 });

			await service.update("user-uuid-1", { isVerified: true });

			expect(userRepo.update).toHaveBeenCalledWith("user-uuid-1", {
				isVerified: true,
			});
		});
	});

	describe("createWithManager", () => {
		it("should create user using entity manager", async () => {
			const mockRepo = {
				create: jest.fn().mockImplementation((data: unknown) => data),
				save: jest.fn().mockResolvedValue({
					id: "new-uuid",
					email: "test@example.com",
				}),
			};
			const manager = {
				getRepository: jest.fn().mockReturnValue(mockRepo),
			} as unknown as EntityManager;

			const result = await service.createWithManager(manager, {
				email: "test@example.com",
			});

			expect(result).toEqual({
				id: "new-uuid",
				email: "test@example.com",
			});
			expect(manager.getRepository).toHaveBeenCalledWith(User);
		});
	});
});
