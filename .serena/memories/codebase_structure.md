# Codebase Structure

## Directory Layout
```
src/
├── index.ts                          # Entry point (Express server setup)
├── config/                           # Configuration constants
│   ├── expenseCategories.ts          # EXPENSE_CATEGORIES array
│   ├── incomeCategories.ts           # INCOME_CATEGORIES array
│   ├── frequencies.ts                # FREQUENCIES, validation, calculations
│   ├── transactionTypes.ts           # TRANSACTION_TYPES enum
│   └── index.ts                      # Aggregates all config
├── controllers/
│   └── whatsappController.ts         # Handles WhatsApp webhook
├── domain/
│   └── RecurrencePattern.ts          # Value object for recurrence logic
├── errors/
│   ├── ApplicationError.ts           # Custom error classes
│   └── index.ts
├── lib/                              # Shared utilities (composition)
│   ├── BaseTransactionOperations.ts  # Shared validation pipeline
│   ├── CategoryNormalizer.ts         # Category validation
│   ├── MessageBuilder.ts             # User-facing messages
│   ├── PrismaClientManager.ts        # Singleton Prisma client
│   └── UserContextProvider.ts        # User context injection
├── routes/
│   ├── index.ts                      # Route aggregator
│   └── whatsapp.ts                   # WhatsApp routes
├── services/
│   ├── dependencyService.ts          # DI container
│   ├── ai/
│   │   ├── aiMessageService.ts       # Orchestrates function calling loop
│   │   ├── functionDeclarationService.ts # AI function declarations
│   │   └── geminiService.ts          # Gemini API wrapper
│   ├── business/
│   │   ├── queryExecutorService.ts   # Dynamic SQL query execution
│   │   ├── recurringTransactionService.ts
│   │   ├── transactionQueryService.ts # Query methods (getLastTransaction, getTransactionById)
│   │   └── transactionService.ts     # Transaction CRUD operations
│   └── infrastructure/
│       ├── conversationService.ts    # Conversation history persistence
│       └── whatsappService.ts        # WhatsApp message handling
├── types/
│   ├── ai.ts                         # AI-related types
│   ├── models.ts                     # Domain model interfaces
│   ├── ServiceResult.ts              # ServiceResult pattern
│   └── whatsapp.ts                   # WhatsApp types
└── validators/
    ├── RecurringTransactionValidator.ts
    └── TransactionValidator.ts

prisma/
├── schema.prisma                     # Database schema
├── dev.db                            # SQLite database
└── migrations/                       # Database migrations
```

## Key Concepts

### Function Declarations (AI)
Defined in `functionDeclarationService.ts`:
- `getCurrentDate()`: Returns current date
- `addTransaction(transactionData)`: Adds transaction (expense or income via type field)
- `createRecurringTransaction(recurringTransactionData)`: Creates recurring transaction (expense or income via type field)
- `editLastTransaction(updates)`: Edits most recent transaction
- `editLastRecurringTransaction(updates)`: Edits most recent recurring transaction
- `editTransactionById(id, updates)`: Edits a specific transaction by its ID (discovered via queryTransactions)
- `queryTransactions(queryDescription, sqlQuery)`: Queries transaction data for reports, finding transactions to edit, or finding transactions to delete

**CRITICAL**: 
- Unified functions - `addTransaction` and `createRecurringTransaction` handle both expenses and income via the `type` field
- `queryTransactions` serves dual purpose: generating reports AND discovering transaction IDs for editing/deleting operations
- When finding transactions for editing/deleting, query must include `id` column in SELECT statement
- `editTransactionById` requires transaction ID from queryTransactions results

**Edit Transaction Workflow**:
1. User requests to edit specific transaction
2. AI uses `queryTransactions` with `id` column in SELECT
3. AI presents matches with IDs to user
4. User confirms which transaction
5. AI calls `editTransactionById(id, updates)` with the ID and changes

### Transaction Types
- `expense`: Money spent
- `income`: Money received

Stored as string in database, validated via enum in `transactionTypes.ts`

### Categories
- **Expense**: Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, etc. (15 categories)
- **Income**: Salary, Freelance, Investment Returns, Business Income, Rental Income, etc. (10 categories)

### Frequencies
- `daily`, `weekly`, `monthly`, `yearly`
- Each with optional `interval` (default 1)
- Weekly requires `dayOfWeek` (0-6)
- Monthly requires `dayOfMonth` (1-31)
- Yearly requires `monthOfYear` (0-11)
