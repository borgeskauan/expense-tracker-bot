# Expense Tracker Bot - AI Agent Instructions

## Project Overview
WhatsApp-based expense tracking bot using Google Gemini AI for natural language processing. Users send expense messages via WhatsApp; Gemini extracts structured data and calls functions to store expenses in SQLite.

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
- `CategoryNormalizer`: Validates categories against `DEFAULT_CATEGORIES` from `src/config/categories.ts`
- `PrismaClientManager`: Singleton Prisma client (avoid multiple connections)
- `UserContextProvider`: Injects `userId` into operations
- `MessageBuilder`: Formats success messages with category warnings

**Example**: `ExpenseService` composes these utilities, not inheritance hierarchy.

### ServiceResult Pattern
All service methods return `ServiceResult<T>` from `src/types/ServiceResult.ts`:
```typescript
return success(data, "Expense added: $50 for Food", ["Category normalized from 'food' to 'Food & Dining'"]);
```
- `success<T>(data, message, warnings?)` for success
- `failure(message, code?, details?)` for errors
- Used by AI function declarations to return structured responses

### Domain Objects for Complex Logic
- `RecurrencePattern` (`src/services/domain/RecurrencePattern.ts`): Encapsulates frequency calculations (nextDue, validation)
- Validators separate from business logic: `ExpenseValidator`, `RecurringExpenseValidator` in `src/services/validators/`

### Repository Pattern
- `ExpenseRepository`, `RecurringExpenseRepository` in `src/services/repositories/`
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
- `addExpense(expenseData)`: Adds single expense
- `createRecurringExpense(recurringExpenseData)`: Creates recurring expense with frequency logic

**Categories**: Enum in function params sourced from `src/config/categories.ts`. When adding categories:
1. Update `DEFAULT_CATEGORIES` array
2. AI automatically receives updated enum via `getCategoryDescription()`

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
SYSTEM_INSTRUCTION="You are an expense tracking assistant..."
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
2. Implement executor in `executeFunction()` switch statement
3. Create service method (returns `ServiceResult<T>`)
4. If new entity: Add Prisma model → migrate → create repository/service

### New Service
1. Create in `src/services/` using composition pattern (inject shared utilities)
2. Register in `DependencyService.initialize()` if needed globally
3. Use `ServiceResult<T>` return type for consistency
4. Follow repository pattern for DB access

## Important Quirks

- **Conversation History**: AIMessageService receives full history but only returns NEW entries (`newConversationEntries`) to avoid duplicates in DB
- **Category Normalization**: AI can send any string, CategoryNormalizer fuzzy matches to valid category, returns warnings
- **Prisma Import Path**: Always `from '../generated/prisma'` (relative to current file depth)
- **Singleton Pattern**: DependencyService, PrismaClientManager, conversationService, whatsappService are all singletons (avoid duplicate instances)
- **Date Handling**: ExpenseValidator normalizes Date objects to ISO strings; Gemini receives format instructions in function declarations
