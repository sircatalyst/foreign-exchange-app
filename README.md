# FX Trading App

A production-grade multi-currency wallet and FX trading backend built with **NestJS 11**, **TypeORM**, and **PostgreSQL**. Supports wallet funding, currency conversion, and FX trading with live rates, all protected by idempotency keys, pessimistic locking, and atomic transactions.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Architecture & Flow Diagrams](#architecture--flow-diagrams)
- [Key Assumptions](#key-assumptions)
- [Architectural Decisions](#architectural-decisions)
- [Project Structure](#project-structure)
- [Database & Migrations](#database--migrations)
- [Testing](#testing)
- [Available Scripts](#available-scripts)

---

## Features

- **Authentication** — Registration with email OTP verification, JWT-based login
- **Multi-Currency Wallets** — Automatic wallet creation with balances for all supported currencies (NGN, USD, EUR, GBP, CAD)
- **Wallet Funding** — Fund any currency balance with idempotency protection
- **Currency Conversion** — Convert between supported currencies using live FX rates with pessimistic locking and deadlock-safe alphabetical lock ordering
- **FX Trading** — Trade currencies with optional slippage tolerance and expected rate guards
- **Live FX Rates** — Fetched from ExchangeRate API with Redis caching (configurable TTL), automatic retry with exponential backoff, and stale-rate fallback from hourly snapshots
- **FX Rate Snapshots** — Hourly cron captures for historical rate tracking
- **Transaction History** — Paginated, filterable transaction ledger
- **Role-Based Access Control** — Guards with `@Roles()` decorator
- **Global Exception Handling** — Structured error responses with PostgreSQL error code mapping
- **Structured Logging** — Winston logger with Loggly remote log shipping
- **Idempotency** — User-scoped idempotency keys on all money-moving endpoints
- **Swagger Documentation** — Auto-generated API docs at `/docs` (non-production)

---

## Tech Stack

| Layer     | Technology                               |
| --------- | ---------------------------------------- |
| Framework | NestJS 11                                |
| Language  | TypeScript (ES2023, NodeNext modules)    |
| Database  | PostgreSQL + TypeORM                     |
| Cache     | Redis via cache-manager + @keyv/redis    |
| Auth      | Passport JWT + bcrypt (12 salt rounds)   |
| Email     | Nodemailer + Handlebars templates        |
| Logging   | Winston + Loggly                         |
| Math      | Decimal.js (8-decimal precision)         |
| Security  | Helmet, CORS, ValidationPipe (whitelist) |
| Docs      | Swagger / OpenAPI                        |
| Testing   | Jest 30 + ts-jest (140 tests, 19 suites) |

---

## Prerequisites

- **Node.js** >= 24.14.0
- **npm** >= 10
- **PostgreSQL** running locally or remotely
- **Redis** running locally or remotely
- **ExchangeRate API key** — free tier at [exchangerate-api.com](https://www.exchangerate-api.com/)
- **SMTP credentials** — any provider (Gmail, Mailtrap, SendGrid, etc.)

---

## Setup Instructions

### 1. Clone and install dependencies

```bash
git clone https://github.com/sircatalyst/foreign-exchange-app.git
cd foreign-exchange-app
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your actual values (see [Environment Variables](#environment-variables) below).

### 3. Create the PostgreSQL database

```bash
createdb foreign_exchange_trading
```

### 4. Start Redis

```bash
# macOS (Homebrew)
brew services start redis

```

### 5. Run the application

```bash
# Development — runs migrations, then starts in watch mode
npm run start:dev

# Production
npm run build
npm run start:prod
```

Migrations run automatically on startup. The application validates all environment variables at boot time and fails fast with descriptive errors if any are missing or invalid.

### 6. Access the API

- **Base URL:** `http://localhost:3000/api/v1`
- **Swagger Docs:** `http://localhost:3000/docs` (non-production only)

---

## Environment Variables

| Variable                                              | Description                      | Default                                   |
| ----------------------------------------------------- | -------------------------------- | ----------------------------------------- |
| `PORT`                                                | Application port                 | `3000`                                    |
| `NODE_ENV`                                            | Environment                      | `development`                             |
| `DB_HOST` / `DB_PORT` / `DB_NAME`                     | PostgreSQL connection            | `localhost:5432/foreign_exchange_trading` |
| `DB_USERNAME` / `DB_PASSWORD`                         | Database credentials             | —                                         |
| `JWT_SECRET`                                          | JWT signing key                  | — (required)                              |
| `JWT_EXPIRES_IN`                                      | Token expiry in minutes          | `30`                                      |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USER` / `MAIL_PASS` | SMTP credentials                 | — (required)                              |
| `MAIL_FROM`                                           | Sender email address             | — (required)                              |
| `FX_API_KEY`                                          | ExchangeRate API key             | — (required)                              |
| `FX_API_BASE_URL`                                     | ExchangeRate API base URL        | — (required)                              |
| `FX_RATE_CACHE_TTL`                                   | Cache TTL for FX rates (seconds) | `60`                                      |
| `SUPPORTED_CURRENCIES`                                | Comma-separated currency codes   | `NGN,USD,EUR,GBP`                         |
| `OTP_EXPIRY_MINUTES`                                  | OTP validity window              | `10`                                      |
| `REDIS_HOST` / `REDIS_PORT`                           | Redis connection                 | `localhost:6379`                          |
| `LOGGLY_TOKEN`                                        | Loggly customer token            | — (required)                              |
| `ALLOWED_ORIGINS`                                     | CORS allowed origins             | — (required)                              |

---

## API Documentation

### Swagger UI

When running in non-production mode, interactive Swagger documentation is available at:  
**`http://localhost:3000/docs`**

Swagger includes Bearer auth support with `persistAuthorization: true`, so you can authenticate once and test all protected endpoints directly.

### Endpoints Overview

All endpoints are prefixed with `/api/v1`.

| Method | Endpoint                   | Description                          | Auth  |
| ------ | -------------------------- | ------------------------------------ | ----- |
| POST   | `/api/v1/auth/register`    | Register a new user                  | No    |
| POST   | `/api/v1/auth/verify-otp`  | Verify email OTP                     | No    |
| POST   | `/api/v1/auth/login`       | Login and get JWT                    | No    |
| POST   | `/api/v1/auth/resend-otp`  | Resend OTP email                     | No    |
| GET    | `/api/v1/wallet`           | Get wallet balances                  | JWT   |
| POST   | `/api/v1/wallet/fund`      | Fund a currency balance              | JWT   |
| POST   | `/api/v1/wallet/convert`   | Convert between currencies           | JWT   |
| POST   | `/api/v1/wallet/trade`     | Trade currencies with slippage guard | JWT   |
| GET    | `/api/v1/transactions`     | List transactions (paginated)        | JWT   |
| GET    | `/api/v1/transactions/:id` | Get transaction by ID                | JWT   |
| GET    | `/api/v1/fx/rates`         | Get live FX rates                    | JWT   |
| GET    | `/api/v1/fx/rates/history` | Get FX rate history snapshots        | Admin |

### Response Format

All successful responses follow a consistent envelope:

```json
{
  "message": "success",
  "success": true,
  "path": "/api/v1/...",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "data": { ... }
}
```

Error responses use the same structure:

```json
{
	"message": "Error description",
	"success": false,
	"path": "/api/v1/...",
	"timestamp": "2025-01-01T00:00:00.000Z",
	"error": ["Validation message 1", "Validation message 2"]
}
```

### Query Parameters — Transactions

| Parameter  | Type   | Description                                      |
| ---------- | ------ | ------------------------------------------------ |
| `page`     | number | Page number (default: 1)                         |
| `limit`    | number | Items per page (default: 20)                     |
| `type`     | string | Filter by type: `funding`, `conversion`, `trade` |
| `currency` | string | Filter by currency code                          |
| `from`     | string | Start date (ISO 8601)                            |
| `to`       | string | End date (ISO 8601)                              |

---

## Architecture & Flow Diagrams

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Client (REST)                                │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   NestJS Application     │
                    │  ┌────────────────────┐  │
                    │  │   Helmet + CORS     │  │
                    │  │   ValidationPipe    │  │
                    │  │   Request ID MW     │  │
                    │  └────────┬───────────┘  │
                    │  ┌────────▼───────────┐  │
                    │  │   JWT Auth Guard    │  │
                    │  │   Roles Guard       │  │
                    │  └────────┬───────────┘  │
                    │  ┌────────▼───────────┐  │
                    │  │   Controllers       │  │
                    │  └────────┬───────────┘  │
                    │  ┌────────▼───────────┐  │
                    │  │   Services          │  │
                    │  └────┬────┬────┬─────┘  │
                    │       │    │    │         │
                    └───────┼────┼────┼─────────┘
                            │    │    │
              ┌─────────────┘    │    └─────────────┐
              ▼                  ▼                   ▼
        ┌──────────┐     ┌────────────┐      ┌────────────┐
        │PostgreSQL│     │   Redis    │      │ External   │
        │ TypeORM  │     │   Cache    │      │ APIs       │
        │          │     │            │      │            │
        │• Users   │     │• FX Rates  │      │• Exchange  │
        │• Wallets │     │  (TTL-     │      │  Rate API  │
        │• Balances│     │  based)    │      │• SMTP      │
        │• Txns    │     │            │      │• Loggly    │
        │• Snaps   │     │            │      │            │
        └──────────┘     └────────────┘      └────────────┘
```

### Authentication Flow

```
┌──────┐           ┌────────────┐          ┌──────────┐       ┌──────────┐
│Client│           │ AuthService│          │  DB Txn  │       │MailService│
└──┬───┘           └─────┬──────┘          └────┬─────┘       └────┬─────┘
   │  POST /register     │                     │                   │
   │ ────────────────────>│                     │                   │
   │                      │ Check duplicate     │                   │
   │                      │ email               │                   │
   │                      │────────────────────>│                   │
   │                      │                     │                   │
   │                      │ Hash password       │                   │
   │                      │ (bcrypt, 12 rounds) │                   │
   │                      │                     │                   │
   │                      │ Generate 6-digit OTP│                   │
   │                      │ (crypto.randomInt)  │                   │
   │                      │                     │                   │
   │                      │ BEGIN TRANSACTION   │                   │
   │                      │────────────────────>│                   │
   │                      │ Create User         │                   │
   │                      │────────────────────>│                   │
   │                      │ Create Wallet +     │                   │
   │                      │ Zero Balances       │                   │
   │                      │────────────────────>│                   │
   │                      │ COMMIT              │                   │
   │                      │────────────────────>│                   │
   │                      │                     │                   │
   │                      │ Send OTP Email      │                   │
   │                      │───────────────────────────────────────>│
   │                      │                     │                   │
   │  201: "Check email"  │                     │                   │
   │ <────────────────────│                     │                   │
   │                      │                     │                   │
   │  POST /verify-otp    │                     │                   │
   │ ────────────────────>│                     │                   │
   │                      │ Validate OTP +      │                   │
   │                      │ Check expiry        │                   │
   │                      │ Mark verified       │                   │
   │                      │ Issue JWT           │                   │
   │  200: { accessToken }│                     │                   │
   │ <────────────────────│                     │                   │
   │                      │                     │                   │
   │  POST /login         │                     │                   │
   │ ────────────────────>│                     │                   │
   │                      │ bcrypt.compare      │                   │
   │                      │ Check isVerified    │                   │
   │                      │ Issue JWT           │                   │
   │  200: { accessToken }│                     │                   │
   │ <────────────────────│                     │                   │
```

### Wallet Funding Flow

```
┌──────┐         ┌──────────────┐          ┌──────────┐
│Client│         │WalletsService│          │PostgreSQL│
└──┬───┘         └──────┬───────┘          └────┬─────┘
   │  POST /wallet/fund  │                      │
   │  { currency, amount,│                      │
   │    idempotencyKey }  │                      │
   │ ────────────────────>│                      │
   │                      │                      │
   │                      │ 1. Check idempotency │
   │                      │    key (userId +     │
   │                      │    idempotencyKey)   │
   │                      │─────────────────────>│
   │                      │                      │
   │                      │ [If duplicate: return │
   │                      │  existing txn]        │
   │                      │                      │
   │                      │ 2. Validate currency │
   │                      │    is supported      │
   │                      │                      │
   │                      │ 3. Verify wallet     │
   │                      │    exists            │
   │                      │─────────────────────>│
   │                      │                      │
   │                      │ 4. BEGIN TRANSACTION │
   │                      │─────────────────────>│
   │                      │                      │
   │                      │ 5. SELECT ... FOR    │
   │                      │    UPDATE            │
   │                      │    (lock balance row)│
   │                      │─────────────────────>│
   │                      │                      │
   │                      │ 6. Add amount to     │
   │                      │    balance           │
   │                      │    (Decimal.js)      │
   │                      │                      │
   │                      │ 7. Save balance +    │
   │                      │    create Transaction│
   │                      │─────────────────────>│
   │                      │                      │
   │                      │ 8. COMMIT            │
   │                      │─────────────────────>│
   │                      │                      │
   │  200: Transaction    │                      │
   │ <────────────────────│                      │
```

### Currency Conversion / Trading Flow

```
┌──────┐         ┌──────────────┐     ┌────────────┐     ┌──────────┐
│Client│         │WalletsService│     │FxRatesService│   │PostgreSQL│
└──┬───┘         └──────┬───────┘     └──────┬─────┘     └────┬─────┘
   │                     │                    │                │
   │ POST /wallet/trade  │                    │                │
   │ { fromCurrency,     │                    │                │
   │   toCurrency,       │                    │                │
   │   amount,           │                    │                │
   │   idempotencyKey,   │                    │                │
   │   expectedRate?,    │                    │                │
   │   slippageTolerance?│                    │                │
   │ }                   │                    │                │
   │ ───────────────────>│                    │                │
   │                     │                    │                │
   │                     │ 1. SLIPPAGE CHECK  │                │
   │                     │    (trade only)     │                │
   │                     │ Get live rate       │                │
   │                     │───────────────────>│                │
   │                     │                    │                │
   │                     │ |live - expected|  │                │
   │                     │ ─────────────────  │                │
   │                     │    expected        │                │
   │                     │ > tolerance?       │                │
   │                     │ → 400 Bad Request  │                │
   │                     │                    │                │
   │                     │ 2. SAME-CURRENCY   │                │
   │                     │    GUARD           │                │
   │                     │                    │                │
   │                     │ 3. IDEMPOTENCY     │                │
   │                     │    CHECK           │                │
   │                     │────────────────────────────────────>│
   │                     │                    │                │
   │                     │ 4. VALIDATE AMOUNT │                │
   │                     │    > 0             │                │
   │                     │                    │                │
   │                     │ 5. FETCH RATE      │                │
   │                     │───────────────────>│                │
   │                     │                    │  Redis Cache   │
   │                     │                    │───────┐        │
   │                     │                    │       │ Hit?   │
   │                     │                    │<──────┘        │
   │                     │                    │  Miss →        │
   │                     │                    │  ExchangeRate  │
   │                     │                    │  API call      │
   │                     │    rate            │                │
   │                     │<───────────────────│                │
   │                     │                    │                │
   │                     │ toAmount = amount  │                │
   │                     │   × rate           │                │
   │                     │ (Decimal.js,       │                │
   │                     │  8 dp, round down) │                │
   │                     │                    │                │
   │                     │ 6. BEGIN DB TRANSACTION             │
   │                     │────────────────────────────────────>│
   │                     │                    │                │
   │                     │ 7. Load wallet     │                │
   │                     │────────────────────────────────────>│
   │                     │                    │                │
   │                     │ 8. DEADLOCK-SAFE LOCKING            │
   │                     │    Sort [from, to] alphabetically   │
   │                     │    Lock 1st currency FOR UPDATE     │
   │                     │────────────────────────────────────>│
   │                     │    Lock 2nd currency FOR UPDATE     │
   │                     │────────────────────────────────────>│
   │                     │                    │                │
   │                     │ 9. CHECK fromBalance >= amount      │
   │                     │    → 400 if insufficient            │
   │                     │                    │                │
   │                     │ 10. UPDATE BALANCES │                │
   │                     │     from -= amount │                │
   │                     │     to += toAmount │                │
   │                     │     (create if     │                │
   │                     │      to is null)   │                │
   │                     │────────────────────────────────────>│
   │                     │                    │                │
   │                     │ 11. CREATE TRANSACTION RECORD       │
   │                     │     type: TRADE / CONVERSION        │
   │                     │     status: COMPLETED               │
   │                     │────────────────────────────────────>│
   │                     │                    │                │
   │                     │ 12. COMMIT         │                │
   │                     │────────────────────────────────────>│
   │                     │                    │                │
   │  200: Transaction   │                    │                │
   │ <───────────────────│                    │                │
```

### Request Lifecycle

```
  Incoming HTTP Request
         │
         ▼
  ┌──────────────┐
  │   Helmet     │  Security headers
  │   CORS       │  Origin validation
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │  Request ID  │  Assigns x-request-id (or uses existing)
  │  Middleware   │
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │  Validation  │  Strips unknown fields (whitelist)
  │  Pipe        │  Rejects forbidden fields
  └──────┬───────┘  Transforms to DTO types
         ▼
  ┌──────────────┐
  │  JWT Guard   │  Validates Bearer token
  │  Roles Guard │  Checks role permissions
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │  Logging     │  Logs request entry + response time
  │  Interceptor │
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │  Controller  │  Route handler
  │  → Service   │  Business logic
  └──────┬───────┘
         │
    ┌────┴────┐
    │         │
 Success    Error
    │         │
    ▼         ▼
┌────────┐ ┌──────────────┐
│Transform│ │AllExceptions │  Maps Postgres error codes
│Intercept│ │Filter        │  Structures error response
│        │ │              │  Logs 4xx (warn) / 5xx (error)
└───┬────┘ └──────┬───────┘
    │              │
    ▼              ▼
┌──────────────────────────┐
│  Structured JSON Response │
│  { message, success,      │
│    path, timestamp, data } │
└──────────────────────────┘
```

### FX Rate Caching Strategy

```
  GET /fx/rates
       │
       ▼
┌─────────────┐      ┌───────┐
│FxRatesService│─────>│ Redis │
└──────┬──────┘      └───┬───┘
       │                  │
       │   Cache hit?     │
       │<─────────────────│
       │                  │
       │   Yes: return    │
       │   cached rates   │
       │                  │
       │   No: ┌──────────────────┐
       │──────>│ ExchangeRate API │
       │       │ (5s timeout)     │
       │       └────────┬─────────┘
       │                │
       │   Success?      │
       │   Yes: cache    │
       │   with TTL ────>Redis
       │                │
       │   Failure?      │
       │   Retry up to   │
       │   2× with       │
       │   exponential   │
       │   backoff       │
       │   (500ms × n)   │
       │                │
       │   All retries   │
       │   failed?       │
       │       │         │
       │       ▼         │
       │  ┌──────────────────┐
       │  │ fx_rate_snapshots │  Fallback: serve latest
       │  │ (PostgreSQL)      │  hourly snapshot rates
       │  └────────┬─────────┘  cached at half-TTL
       │           │
       │   No snapshots?
       │   → 503 Service
       │     Unavailable
       │                │
       │   Return rates │
       ▼
  ┌──────────────────┐
  │ Hourly Cron Job  │  @Cron("0 * * * *")
  │ Captures snapshot│  Stores FxRateSnapshot
  │ to PostgreSQL    │  for historical queries
  └──────────────────┘
```

---

## Key Assumptions

1. **Base Currency** — NGN is used as the base currency for rate snapshots and the `getSupportedRates` endpoint. All supported rates are expressed relative to NGN.

2. **Rate Source** — FX rates are sourced from a single external provider (ExchangeRate API). The app does not aggregate rates from multiple providers or maintain an internal order book.

3. **Rate Freshness** — Cached rates (default 60s TTL) are acceptable for conversion and trading. Rates are fetched _before_ the database transaction to minimize lock-hold time, meaning a slight rate change between fetch and commit is accepted by design.

4. **Decimal Precision** — All monetary values use `decimal(20,8)` columns (up to 20 digits total, 8 decimal places). Conversion results are rounded down (`ROUND_DOWN`) to prevent crediting more than the rate warrants.

5. **Idempotency Scope** — Idempotency keys are scoped per-user. The same key used by different users creates separate transactions. Clients are responsible for generating globally unique keys (e.g., UUIDs).

6. **Single Wallet Per User** — Each user has exactly one wallet, created atomically during registration. The wallet holds one balance row per supported currency.

7. **Immediate Settlement** — All transactions settle instantly within a single database transaction. There is no pending-to-completed lifecycle; status is `COMPLETED` on creation.

8. **Wallet Funding** — The `/wallet/fund` endpoint directly credits the user's balance for demonstration purposes. In production, funding would be initiated through a payment gateway (e.g., Paystack, Stripe) and the balance credited only after webhook confirmation of a successful payment.

9. **Email Delivery** — The app fires OTP emails synchronously during registration. If SMTP is unreachable, registration fails. The `resend-otp` endpoint can be used to re-trigger delivery.

10. **No Partial Failures** — Wallet funding and currency conversion are fully atomic. If any step fails (e.g., insufficient balance), the entire transaction is rolled back.

11. **Supported Currencies** — Only currencies listed in the `SUPPORTED_CURRENCIES` environment variable are accepted. Attempting to fund or convert to/from an unsupported currency results in a `400 Bad Request`.

12. **Password Byte-Length Limit** — bcrypt silently truncates passwords beyond 72 bytes. The app enforces a 72-byte ceiling via a custom validator on both registration and login DTOs. Combined with the 64-character `MaxLength`, this prevents silent truncation when multi-byte UTF-8 characters are used.

---

## Architectural Decisions

| Decision                                       | Rationale                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Decimal.js for arithmetic**                  | JavaScript floating-point math introduces rounding errors in financial calculations. `Decimal.js` with `decimal(20,8)` PostgreSQL columns guarantees exact arithmetic across all operations.                                                                  |
| **Pessimistic locking (`FOR UPDATE`)**         | Optimistic locking with version columns would require retry logic on concurrent wallet updates. Pessimistic row-level locks guarantee consistency in a single attempt, simplifying the code and eliminating lost-update bugs.                                 |
| **Alphabetical lock ordering**                 | When locking two balance rows (from/to), acquiring locks in a consistent alphabetical order by currency code prevents deadlocks between concurrent conversions (e.g., USD→NGN and NGN→USD).                                                                   |
| **Idempotency keys on money-moving endpoints** | Network retries and client failures can cause duplicate requests. Per-user idempotency keys ensure at-most-once execution — duplicate calls return the original transaction without side effects.                                                             |
| **Rate fetch outside DB transaction**          | Fetching FX rates (which may involve Redis and external API calls) inside a DB transaction would hold row locks for the duration of I/O. Fetching rates _before_ `dataSource.transaction()` minimizes lock contention.                                        |
| **Atomic registration (User + Wallet)**        | Creating the user and wallet in separate transactions risks orphaned users without wallets on partial failure. A single `EntityManager` transaction guarantees both succeed or both rollback.                                                                 |
| **Anti-enumeration on `resend-otp`**           | Returning a constant success message regardless of email existence prevents attackers from discovering valid accounts through the OTP resend endpoint.                                                                                                        |
| **Redis caching for FX rates**                 | Without caching, every wallet operation and rate query would hit the external API, introducing latency and risking rate limits. Redis with configurable TTL (default 60s) balances freshness with performance.                                                |
| **FX API retry + snapshot fallback**           | External API calls retry up to 2× with exponential backoff (500ms × attempt). If all retries fail, the latest hourly rate snapshot from PostgreSQL is served as a stale fallback, cached at half-TTL. This ensures rate availability even during API outages. |
| **PostgreSQL error code mapping**              | Rather than generic 500 errors, the `AllExceptionsFilter` maps Postgres codes (unique violations, FK constraints, deadlocks, timeouts) to meaningful HTTP statuses, helping clients handle errors programmatically.                                           |
| **Auto-run migrations on startup**             | Simplifies deployment by eliminating a separate migration step. The app checks for pending migrations at boot and applies them automatically, keeping the schema in sync with entity definitions.                                                             |
| **Helmet + CORS + ValidationPipe**             | Defense-in-depth: Helmet sets security headers, CORS restricts origins, and `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` strips unknown fields and rejects malformed input at the boundary.                                       |
| **Structured logging with Loggly**             | Every request gets a `x-request-id` for correlation. Winston formats structured JSON logs, and Loggly integration enables centralized log searching and alerting in production.                                                                               |

---

## Project Structure

```
src/
├── auth/                  # Authentication module
│   ├── controllers/       #   Register, login, OTP endpoints
│   ├── services/          #   Auth business logic (hash, OTP, JWT)
│   ├── strategies/        #   Passport JWT strategy
│   ├── guards/            #   JWT guard, Roles guard
│   └── dtos/              #   Request validation DTOs
│
├── wallets/               # Wallet management module
│   ├── controllers/       #   Fund, convert, trade endpoints
│   ├── services/          #   Wallet business logic (locking, balances)
│   ├── entities/          #   Wallet, WalletBalance entities
│   └── dtos/              #   Fund, convert, trade DTOs
│
├── transactions/          # Transaction history module
│   ├── controllers/       #   List, get-by-id endpoints
│   ├── services/          #   Paginated query builder
│   ├── entities/          #   Transaction entity (type, status, amounts)
│   └── dtos/              #   Query filter DTO
│
├── fx-rates/              # FX rate module
│   ├── controllers/       #   Get rates, get history endpoints
│   ├── services/          #   Rate fetching + caching, snapshot cron
│   └── entities/          #   FxRateSnapshot entity
│
├── users/                 # User module
│   ├── services/          #   CRUD operations
│   └── entities/          #   User entity
│
├── mail/                  # Email module
│   ├── mail.service.ts    #   Nodemailer + Handlebars templates
│   └── templates/         #   HTML email templates
│
├── logging/               # Logging module
│   └── log.service.ts     #   Winston + Loggly integration
│
├── common/                # Shared utilities
│   ├── filters/           #   AllExceptionsFilter (Postgres error mapping)
│   ├── interceptors/      #   TransformInterceptor, LoggingInterceptor
│   ├── middleware/         #   RequestIdMiddleware
│   ├── decorators/        #   @CurrentUser(), @Roles(), @Public()
│   └── context/           #   AsyncLocalStorage request context
│
├── config/                # Configuration
│   └── index.ts           #   AppConfig (validated via class-validator)
│
└── database/              # Database
    ├── data-source.ts     #   TypeORM DataSource configuration
    └── migrations/        #   Auto-generated migration files
```

---

## Database & Migrations

### Entity Relationship

```
┌──────────────┐       ┌──────────────┐       ┌───────────────┐
│    User      │       │    Wallet    │       │ WalletBalance │
├──────────────┤       ├──────────────┤       ├───────────────┤
│ id (PK)      │──1:1─>│ id (PK)      │──1:N─>│ id (PK)       │
│ email        │       │ userId (FK)  │       │ walletId (FK) │
│ passwordHash │       │ createdAt    │       │ currency      │
│ firstName    │       │ updatedAt    │       │ amount (20,8) │
│ lastName     │       └──────────────┘       └───────────────┘
│ isVerified   │
│ otpCode      │       ┌──────────────┐       ┌───────────────┐
│ otpExpiresAt │       │ Transaction  │       │FxRateSnapshot │
│ role         │       ├──────────────┤       ├───────────────┤
│ createdAt    │       │ id (PK)      │       │ id (PK)       │
│ updatedAt    │       │ userId (FK)  │       │ baseCurrency  │
└──────────────┘       │ type         │       │ quoteCurrency │
                       │ status       │       │ rate          │
                       │ fromCurrency │       │ snapshotDate  │
                       │ fromAmount   │       │ createdAt     │
                       │ toCurrency   │       └───────────────┘
                       │ toAmount     │
                       │ rate         │
                       │ idempotencyKey│
                       │ description  │
                       │ createdAt    │
                       └──────────────┘
```

### Migration Commands

```bash
# Auto-generate a migration from entity changes
npm run migration:generate

# Run all pending migrations
npm run migration:run

# Revert the last applied migration
npm run migration:revert
```

Migrations also run automatically on application startup.

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:cov

# Watch mode
npm run test:watch
```

**Coverage:** 140 tests across 19 suites.

---

## Available Scripts

| Script                       | Description                              |
| ---------------------------- | ---------------------------------------- |
| `npm run start:dev`          | Run migrations → start in watch mode     |
| `npm run start:prod`         | Build → start production server          |
| `npm test`                   | Run all unit tests                       |
| `npm run test:cov`           | Run tests with coverage report           |
| `npm run test:watch`         | Run tests in watch mode                  |
| `npm run test:e2e`           | Run end-to-end tests                     |
| `npm run lint`               | ESLint with auto-fix                     |
| `npm run format`             | Prettier formatting                      |
| `npm run migration:generate` | Auto-generate migration from entity diff |
| `npm run migration:run`      | Apply all pending migrations             |
| `npm run migration:revert`   | Revert the last migration                |
