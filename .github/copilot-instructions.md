# Expense Tracker Bot - AI Agent Instructions

## Project Overview
WhatsApp-based financial tracking bot using Google Gemini AI for natural language processing. Users send transaction messages via WhatsApp; Gemini extracts structured data and calls functions to store transactions (expenses or income) in SQLite.

## Architecture Pattern: AI Function Calling Pipeline

**Critical Flow**: WhatsApp → WhatsAppController → AIMessageService (iterative loop) → GeminiService → Function Execution → Response

1. **AIMessageService** (`src/services/aiMessageService.ts`) orchestrates iterative function calling:
   - Maintains conversation history as `Content[]` array
   - Loops up to a maximum number of iterations calling Gemini until no more function calls returned
   - Each iteration: sends contents → receives response → executes functions → appends function results → repeats
   - Returns `FunctionCallResult` with response, function history, and new conversation entries

2. **Conversation Persistence** (`src/services/conversationService.ts`): 
   - Stores all messages in Prisma (user, model, function calls) as JSON
   - Retrieved history passed to AIMessageService for context-aware responses
   - Clear endpoint: `POST /whatsapp/conversation/clear/:userId`

3. **Dependency Injection Singleton** (`src/services/dependencyService.ts`):
   - All services initialized via `DependencyService.getInstance()`
   - Services wired: GeminiService → AIMessageService → WhatsAppController
   - Configuration loaded from `src/config/index.ts` (validates env vars)

## Key Patterns & Conventions

### Composition Over Inheritance
Services use **shared utility classes** (not base classes):
- `CategoryNormalizer`: Validates categories against `EXPENSE_CATEGORIES` or `INCOME_CATEGORIES` based on transaction type
- `PrismaClientManager`: Singleton Prisma client (avoid multiple connections)
- `UserContextProvider`: Injects `userId` into operations
- `MessageBuilder`: Formats success messages with transaction type-specific wording and category warnings

**Example**: `TransactionService` composes these utilities, not inheritance hierarchy.

### ServiceResult Pattern
All service methods return `ServiceResult<T>` from `src/types/ServiceResult.ts`:
```typescript
// Success case
return success(data, "Expense added: $50 for Food & Dining", ["Category normalized from 'food' to 'Food & Dining'"]);

// Failure case with validation errors
return failure("Validation failed", "VALIDATION_ERROR", "Amount must be positive", ["Amount must be positive"]);
```
- `success<T>(data, message, warnings?)` for success
- `failure(message, code?, details?, validationErrors?)` for errors
- **CRITICAL**: Validators NEVER throw - they return `ValidationResult` objects
- Services return `failure()` for validation errors instead of throwing
- AI receives structured error information and generates user-friendly messages
- Used by AI function declarations to return structured responses for both success and failure

### Domain Objects for Complex Logic
- `RecurrencePattern` (`src/services/domain/RecurrencePattern.ts`): Encapsulates frequency calculations (nextDue, validation)
- Validators separate from business logic: `TransactionValidator`, `RecurringTransactionValidator` in `src/validators/`

### Repository Pattern
- `TransactionRepository`, `RecurringTransactionRepository` in `src/services/repositories/` (if implemented)
- Services call repositories for DB access (never direct Prisma in services)
- Repositories use `PrismaClientManager.getClient()` for shared client

### Error Hierarchy
Custom error classes in `src/errors/ApplicationError.ts`:
- `ApplicationError` (base): Includes `code`, `statusCode`, `details`, `timestamp`
- `ValidationError` (400): Input validation failures
- `DatabaseError` (500): Prisma errors
- Validators throw `ValidationError`, repositories throw `DatabaseError`

## Prisma Configuration

**Custom Output Path**: Prisma client generated to `src/generated/prisma` (not default `node_modules`):
```prisma
generator client {
  output = "../src/generated/prisma"
}
```
Import as: `import { PrismaClient } from '../generated/prisma'`

**Database**: SQLite at `prisma/dev.db`

**Migrations**: 
- `npx prisma migrate dev --name <description>` for new migrations
- Schema changes: Update `prisma/schema.prisma` → run migrate → regenerate client

## Function Declarations for Gemini

Defined in `src/services/functionDeclarationService.ts`:
- `getCurrentDate()`: Returns current date for relative date calculations
- `addExpense(expenseData)`: Adds single expense transaction (type='expense')
- `addIncome(incomeData)`: Adds single income transaction (type='income')
- `createRecurringExpense(recurringExpenseData)`: Creates recurring expense (type='expense')
- `createRecurringIncome(recurringIncomeData)`: Creates recurring income (type='income')

**CRITICAL - Separate Functions Pattern**: 
- Expenses and income are SEPARATE AI functions with different category enums
- `addExpense` and `createRecurringExpense` use `EXPENSE_CATEGORIES` enum
- `addIncome` and `createRecurringIncome` use `INCOME_CATEGORIES` enum
- Functions internally set the `type` field ('expense' or 'income') before calling TransactionService
- AI chooses function based on user intent - no type parameter needed in function calls

**Transaction Types**: Enum in `src/config/transactionTypes.ts`:
- `TRANSACTION_TYPES = ['expense', 'income']`
- Stored as string in database, validated via enum

**Expense Categories**: `src/config/categories.ts` - `EXPENSE_CATEGORIES` array:
- Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Personal Care, Travel, Education, Groceries, Housing, Insurance, Savings & Investments, Gifts & Donations, Other

**Income Categories**: `src/config/incomeCategories.ts` - `INCOME_CATEGORIES` array:
- Salary, Freelance, Investment Returns, Business Income, Rental Income, Gifts Received, Refunds, Bonuses, Side Hustle, Other

**Frequencies**: `daily`, `weekly`, `monthly`, `yearly` from `src/config/frequencies.ts`

## Development Workflow

### Running Locally
```bash
npm run dev  # Starts nodemon with ts-node (hot reload)
```
Requires `.env`:
```
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your-key"
GEMINI_MODEL="gemini-2.0-flash"
SYSTEM_INSTRUCTION="You are a financial tracking assistant. Help users track expenses and income..."
WHATSAPP_API_URL="http://localhost:3000"
```

### Building & Production
```bash
npm run build  # TypeScript → dist/ (CommonJS)
npm start      # Runs dist/index.js
```
**Note**: Use CommonJS (`"type": "commonjs"` in package.json) due to Prisma client compatibility.

### Testing WhatsApp Webhook
Webhook expects POST to `/whatsapp` with payload:
```json
{
  "remoteJid": "1234567890@s.whatsapp.net",
  "text": "I spent $25 on coffee yesterday",
  "pushName": "User Name",
  "fromMe": false
}
```
Response includes function call trace: `functionUsed`, `functionCalls`, `iterations`.

## Adding New Features

### New Function Declaration
1. Add declaration object in `FunctionDeclarationService` (follow existing pattern with `Type.OBJECT`)
2. Choose appropriate category enum (EXPENSE_CATEGORIES or INCOME_CATEGORIES)
3. Implement executor in `executeFunction()` switch statement - set type field before calling service
4. Create service method (returns `ServiceResult<T>`)
5. If new entity: Add Prisma model → migrate → create repository/service

### New Service
1. Create in `src/services/` using composition pattern (inject shared utilities)
2. Register in `DependencyService.initialize()` if needed globally
3. Use `ServiceResult<T>` return type for consistency
4. Follow repository pattern for DB access

## Important Quirks

- **Conversation History**: AIMessageService receives full history but only returns NEW entries (`newConversationEntries`) to avoid duplicates in DB
- **Category Normalization**: AI can send any string, CategoryNormalizer fuzzy matches to valid category based on transaction type, returns warnings
- **Type-Aware Categories**: CategoryNormalizer accepts `type` parameter to validate against correct category set
- **Separate AI Functions**: 4 distinct functions (addExpense, addIncome, createRecurringExpense, createRecurringIncome) - each sets type internally
- **Prisma Import Path**: Always `from '../generated/prisma'` (relative to current file depth)
- **Singleton Pattern**: DependencyService, PrismaClientManager, conversationService, whatsappService are all singletons (avoid duplicate instances)
- **Date Handling**: TransactionValidator normalizes Date objects to ISO strings; Gemini receives format instructions in function declarations
