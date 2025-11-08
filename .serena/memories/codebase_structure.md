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
│   │   ├── transactionQueryService.ts
│   │   └── transactionService.ts
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
- `addExpense(expenseData)`: Adds expense transaction
- `addIncome(incomeData)`: Adds income transaction
- `createRecurringExpense(recurringExpenseData)`: Creates recurring expense
- `createRecurringIncome(recurringIncomeData)`: Creates recurring income
- `editLastTransaction(updates)`: Edits most recent transaction
- `editLastRecurringTransaction(updates)`: Edits most recent recurring transaction
- `generateReport(queryDescription, sqlQuery)`: Dynamic SQL queries

**CRITICAL**: Expenses and income are SEPARATE AI functions with different category enums

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
