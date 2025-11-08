# Code Style & Conventions

## TypeScript Configuration
- **Target**: ES2020
- **Module System**: CommonJS (required for Prisma compatibility)
- **Strict Mode**: Enabled (all strict type checks)
- **Compiled Output**: `dist/` directory

## Naming Conventions
- **Files**: camelCase for files (e.g., `aiMessageService.ts`, `whatsappController.ts`)
- **Classes**: PascalCase (e.g., `TransactionService`, `RecurrencePattern`)
- **Interfaces/Types**: PascalCase (e.g., `ServiceResult`, `TransactionData`)
- **Functions/Methods**: camelCase (e.g., `createRecurringTransaction`, `validateAmount`)
- **Constants**: UPPERCASE_SNAKE_CASE (e.g., `EXPENSE_CATEGORIES`, `FREQUENCIES`)

## Design Patterns

### 1. Composition Over Inheritance
Services use **shared utility classes** instead of base classes:
- `CategoryNormalizer`: Validates categories
- `PrismaClientManager`: Singleton Prisma client
- `UserContextProvider`: Injects userId
- `MessageBuilder`: Formats success messages

### 2. ServiceResult Pattern
All service methods return `ServiceResult<T>`:
```typescript
// Success
return success(data, "Message", ["warnings"]);

// Failure
return failure("Message", "CODE", "details", ["errors"]);
```
**CRITICAL**: Validators NEVER throw - they return ValidationResult objects

### 3. Domain Objects for Complex Logic
- `RecurrencePattern`: Encapsulates frequency calculations
- Validators separate from business logic

### 4. Repository Pattern
Repositories handle DB access, services call repositories (never direct Prisma in services)

### 5. Dependency Injection Singleton
All services initialized via `DependencyService.getInstance()`

## Documentation
- **JSDoc comments** for all public methods/classes
- Include `@param`, `@returns`, `@throws` tags
- Describe business logic and validation rules
- Example:
```typescript
/**
 * Create a new recurring transaction
 * @param data - Recurring transaction input data
 * @returns ServiceResult with created transaction
 */
```

## Error Handling
Custom error hierarchy in `src/errors/ApplicationError.ts`:
- `ApplicationError` (base): Includes code, statusCode, details
- `ValidationError` (400): Input validation failures
- `DatabaseError` (500): Prisma errors

## Type Safety
- No `any` types (use `unknown` or proper typing)
- Explicit return types on all functions
- Readonly for immutable objects
