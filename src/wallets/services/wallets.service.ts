import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager } from "typeorm";
import Decimal from "decimal.js";
import { Wallet } from "../entities/wallet.entity";
import { WalletBalance } from "../entities/wallet-balance.entity";
import {
	Transaction,
	TransactionType,
	TransactionStatus,
} from "../../transactions/entities/transaction.entity";
import { AppConfig } from "../../config";
import { FxRatesService } from "../../fx-rates/services/fx-rates.service";
import { LogService } from "../../logging/log.service";
import { FundWalletDto } from "../dtos/fund-wallet.dto";
import { ConvertCurrencyDto } from "../dtos/convert-currency.dto";
import { TradeCurrencyDto } from "../dtos/trade-currency.dto";

@Injectable()
export class WalletsService {
	constructor(
		@InjectRepository(Wallet)
		private readonly walletRepo: Repository<Wallet>,
		@InjectRepository(WalletBalance)
		private readonly walletBalanceRepo: Repository<WalletBalance>,
		@InjectRepository(Transaction)
		private readonly txRepo: Repository<Transaction>,
		private readonly dataSource: DataSource,
		private readonly appConfig: AppConfig,
		private readonly fxRatesService: FxRatesService,
		private readonly logService: LogService,
	) {}

	private readonly className = WalletsService.name;

	async createWalletForUser(userId: string): Promise<Wallet> {
		const wallet = this.walletRepo.create({ userId });
		const savedWallet = await this.walletRepo.save(wallet);

		const supportedCurrencies = this.appConfig.supportedCurrencies;
		const balances = supportedCurrencies.map((currency) =>
			this.walletBalanceRepo.create({
				walletId: savedWallet.id,
				currency,
				amount: "0",
			}),
		);
		await this.walletBalanceRepo.save(balances);

		this.logService.log({
			Service: this.className,
			Method: "createWalletForUser",
			Action: "WALLET_CREATED",
			User: userId,
			Returns: { walletId: savedWallet.id },
		});

		return savedWallet;
	}

	async createWalletForUserWithManager(
		manager: EntityManager,
		userId: string,
	): Promise<Wallet> {
		const wallet = manager.getRepository(Wallet).create({ userId });
		const savedWallet = await manager.getRepository(Wallet).save(wallet);

		const supportedCurrencies = this.appConfig.supportedCurrencies;
		const balances = supportedCurrencies.map((currency) =>
			manager.getRepository(WalletBalance).create({
				walletId: savedWallet.id,
				currency,
				amount: "0",
			}),
		);
		await manager.getRepository(WalletBalance).save(balances);

		this.logService.log({
			Service: this.className,
			Method: "createWalletForUserWithManager",
			Action: "WALLET_CREATED",
			User: userId,
			Returns: { walletId: savedWallet.id },
		});

		return savedWallet;
	}

	async getWalletByUserId(
		userId: string,
	): Promise<{ balances: WalletBalance[] }> {
		const wallet = await this.walletRepo.findOne({
			where: { userId },
			relations: ["balances"],
		});

		if (!wallet) {
			throw new NotFoundException("Wallet not found");
		}

		this.logService.log({
			Service: this.className,
			Method: "getWalletByUserId",
			Action: "WALLET_FETCHED",
			User: userId,
			Returns: { balanceCount: wallet.balances.length },
		});

		return { balances: wallet.balances };
	}

	async fundWallet(userId: string, dto: FundWalletDto): Promise<Transaction> {
		const { currency, amount, idempotencyKey } = dto;

		const existing = await this.txRepo.findOne({
			where: { idempotencyKey, userId },
		});
		if (existing) return existing;

		const supported = this.appConfig.supportedCurrencies;
		if (!supported.includes(currency)) {
			throw new BadRequestException(
				`Currency ${currency} is not supported`,
			);
		}

		const wallet = await this.walletRepo.findOne({ where: { userId } });
		if (!wallet) {
			throw new NotFoundException("Wallet not found");
		}

		return this.dataSource.transaction(async (manager) => {
			const balance = await manager
				.getRepository(WalletBalance)
				.createQueryBuilder("wb")
				.where("wb.walletId = :walletId AND wb.currency = :currency", {
					walletId: wallet.id,
					currency,
				})
				.setLock("pessimistic_write")
				.getOne();

			if (!balance) {
				throw new NotFoundException(`No ${currency} balance found`);
			}

			const newAmount = new Decimal(balance.amount)
				.plus(amount)
				.toString();
			await manager
				.getRepository(WalletBalance)
				.update(balance.id, { amount: newAmount });

			const transaction = manager.getRepository(Transaction).create({
				userId,
				type: TransactionType.FUNDING,
				status: TransactionStatus.COMPLETED,
				toCurrency: currency,
				toAmount: amount,
				idempotencyKey,
				description: `Wallet funded with ${amount} ${currency}`,
			});
			const savedTx = await manager
				.getRepository(Transaction)
				.save(transaction);

			this.logService.log({
				Service: this.className,
				Method: "fundWallet",
				Action: "WALLET_FUNDED",
				User: userId,
				Payload: { currency, amount, newBalance: newAmount },
			});

			return savedTx;
		});
	}

	async convertCurrency(
		userId: string,
		dto: ConvertCurrencyDto,
		transactionType: TransactionType = TransactionType.CONVERSION,
	): Promise<Transaction> {
		const { fromCurrency, toCurrency, amount, idempotencyKey } = dto;

		if (fromCurrency === toCurrency) {
			throw new BadRequestException(
				"Cannot convert to the same currency",
			);
		}

		const existing = await this.txRepo.findOne({
			where: { idempotencyKey, userId },
		});
		if (existing) return existing;

		const amountDec = new Decimal(amount);
		if (amountDec.lte(0)) {
			throw new BadRequestException("Amount must be greater than zero");
		}

		const rateStr = await this.fxRatesService.getRate(
			fromCurrency,
			toCurrency,
		);
		const rate = new Decimal(rateStr);
		const toAmount = amountDec
			.times(rate)
			.toDecimalPlaces(8, Decimal.ROUND_DOWN);

		return this.dataSource.transaction(async (manager) => {
			const wallet = await manager.findOne(Wallet, {
				where: { userId },
			});
			if (!wallet) {
				throw new NotFoundException("Wallet not found");
			}

			// Lock both balances in alphabetical order to prevent deadlocks
			const currencies = [fromCurrency, toCurrency].sort();
			const [firstCurrency, secondCurrency] = currencies;

			const firstBalance = await manager.findOne(WalletBalance, {
				where: {
					walletId: wallet.id,
					currency: firstCurrency,
				},
				lock: { mode: "pessimistic_write" },
			});
			const secondBalance = await manager.findOne(WalletBalance, {
				where: {
					walletId: wallet.id,
					currency: secondCurrency,
				},
				lock: { mode: "pessimistic_write" },
			});

			const fromBalance =
				firstCurrency === fromCurrency ? firstBalance : secondBalance;
			const toBalance =
				firstCurrency === toCurrency ? firstBalance : secondBalance;

			if (!fromBalance) {
				throw new BadRequestException(
					`You have no ${fromCurrency} balance to convert from.`,
				);
			}

			const currentFromBalance = new Decimal(fromBalance.amount);
			if (currentFromBalance.lt(amountDec)) {
				this.logService.warn({
					Service: this.className,
					Method: "convertCurrency",
					Action: "CONVERSION_REJECTED_INSUFFICIENT",
					User: userId,
					Payload: {
						fromCurrency,
						available: currentFromBalance.toFixed(8),
						requested: amountDec.toFixed(8),
					},
				});
				throw new BadRequestException(
					`Insufficient ${fromCurrency} balance. Available: ${currentFromBalance.toFixed(8)}, Required: ${amountDec.toFixed(8)}`,
				);
			}

			fromBalance.amount = currentFromBalance.minus(amountDec).toFixed(8);

			let destination = toBalance;
			if (!destination) {
				destination = manager.create(WalletBalance, {
					walletId: wallet.id,
					currency: toCurrency,
					amount: "0.00000000",
				});
			}
			destination.amount = new Decimal(destination.amount)
				.plus(toAmount)
				.toFixed(8);

			await manager.save(WalletBalance, [fromBalance, destination]);

			const transaction = manager.create(Transaction, {
				userId,
				type: transactionType,
				status: TransactionStatus.COMPLETED,
				fromCurrency,
				toCurrency,
				fromAmount: amountDec.toFixed(8),
				toAmount: toAmount.toFixed(8),
				rate: rate.toFixed(8),
				idempotencyKey: idempotencyKey ?? null,
				description: `Converted ${amountDec.toFixed(8)} ${fromCurrency} to ${toAmount.toFixed(8)} ${toCurrency}`,
			});
			const savedTx = await manager.save(Transaction, transaction);

			this.logService.log({
				Service: this.className,
				Method: "convertCurrency",
				Action: "CONVERSION_EXECUTED",
				User: userId,
				Payload: {
					fromCurrency,
					toCurrency,
					fromAmount: amountDec.toFixed(8),
					toAmount: toAmount.toFixed(8),
					exchangeRate: rate.toFixed(8),
					transactionId: savedTx.id,
				},
			});

			return savedTx;
		});
	}

	async tradeCurrency(
		userId: string,
		dto: TradeCurrencyDto,
	): Promise<Transaction> {
		if (dto.expectedRate && dto.slippageTolerance) {
			const liveRate = await this.fxRatesService.getRate(
				dto.fromCurrency,
				dto.toCurrency,
			);
			const expected = new Decimal(dto.expectedRate);
			const live = new Decimal(liveRate);
			const tolerance = new Decimal(dto.slippageTolerance);

			const slippage = live.minus(expected).abs().div(expected);
			if (slippage.gt(tolerance)) {
				this.logService.warn({
					Service: this.className,
					Method: "tradeCurrency",
					Action: "TRADE_REJECTED_SLIPPAGE",
					User: userId,
					Payload: {
						fromCurrency: dto.fromCurrency,
						toCurrency: dto.toCurrency,
						liveRate,
						expectedRate: dto.expectedRate,
						slippage: slippage.toFixed(6),
						tolerance: dto.slippageTolerance,
					},
				});
				throw new BadRequestException(
					`Rate has moved beyond tolerance. Live: ${liveRate}, Expected: ${dto.expectedRate}. Please retry.`,
				);
			}
		}

		this.logService.log({
			Service: this.className,
			Method: "tradeCurrency",
			Action: "TRADE_INITIATED",
			User: userId,
			Payload: {
				fromCurrency: dto.fromCurrency,
				toCurrency: dto.toCurrency,
				amount: dto.amount,
			},
		});

		return this.convertCurrency(userId, dto, TransactionType.TRADE);
	}
}
