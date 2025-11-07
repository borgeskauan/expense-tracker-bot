# Error Handling Strategy

## Overview
The expense tracker bot uses a two-tier error handling approach that separates **validation errors** from **technical errors**, allowing the AI to generate appropriate contextual messages for each.

## Error Types

### 1. Validation Errors (User-facing)
**Code:** `VALIDATION_ERROR`  
**When:** User input is invalid (negative amounts, invalid dates, etc.)  
**AI Response:** Contextual, friendly explanation of what's wrong and how to fix it

**Example:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": "Amount must be positive",
    "validationErrors": ["Amount must be positive"]
  }
}
```

**AI generates:** "I couldn't add that expense because the amount needs to be a positive number. Could you provide the correct amount?"

### 2. Technical Errors (System-facing)
**Code:** `DATABASE_ERROR`  
**When:** Database operations fail, connection issues, system errors  
**AI Response:** Generic, non-technical message to user

**Example:**
```json
{
  "success": false,
  "message": "A technical error occurred while adding the expense",
  "error": {
    "code": "DATABASE_ERROR",
    "details": "Connection timeout"
  }
}
```

**AI generates:** "I'm sorry, I encountered a technical issue while saving your expense. Please try again."

## Implementation Details

### Validators (Never Throw)
All validators return `ValidationResult` objects instead of throwing exceptions:

```typescript
// ✅ Good - Returns result
const result = validator.validateWithNormalization(amount, date);
if (!result.isValid) {
  return failure('Validation failed', 'VALIDATION_ERROR', 
    result.errors.join('; '), result.errors);
}

// ❌ Bad - Throws exception
if (!isValid) {
  throw new Error('Invalid input');
}
```

### Date Defaulting
**IMPORTANT:** When no date is provided, the system defaults to today's date:

```typescript
// User says: "I spent $50 on coffee"
// No date mentioned → defaults to today
validator.normalizeDate(undefined) // Returns new Date() (today)
```

This preserves the original behavior where omitting a date means "today".

### Services (Try-Catch for Database Operations)

Services handle two layers of errors:

```typescript
async addExpense(expenseData: Expense): Promise<ExpenseResult> {
  // Layer 1: Validation (returns failure, doesn't throw)
  const validationResult = this.validator.validateWithNormalization(
    expenseData.amount, 
    expenseData.date // defaults to today if undefined
  );
  
  if (!validationResult.isValid) {
    return failure(
      'Validation failed',
      'VALIDATION_ERROR',
      validationResult.errors.join('; '),
      validationResult.errors
    );
  }

  // Layer 2: Database operations (wrapped in try-catch)
  try {
    const expense = await this.prisma.expense.create({...});
    return success({...});
  } catch (error) {
    console.error('Database error:', error); // Log for debugging
    return failure(
      'A technical error occurred while adding the expense',
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
```

## Error Flow Diagram

```
User Input
    ↓
Validation
    ↓
Valid? → NO → Return failure(VALIDATION_ERROR) → AI generates friendly message
    ↓
   YES
    ↓
Database Operation (try-catch)
    ↓
Success? → NO → Return failure(DATABASE_ERROR) → AI generates generic message
    ↓
   YES
    ↓
Return success() → AI confirms action
```

## Benefits

### Validation Errors
- ✅ AI sees specific validation issues
- ✅ Can generate contextual, helpful messages
- ✅ User understands what to fix
- ✅ Conversation continues naturally

### Technical Errors
- ✅ User doesn't see confusing technical details
- ✅ AI provides reassuring generic message
- ✅ Full error logged for debugging
- ✅ Prevents exposing system internals

## Testing Scenarios

### Validation Errors (Should return structured failures)
1. **Negative amount:** "I spent -50 on coffee"
2. **Invalid date:** "I spent $50 on coffee on 2025-13-45"
3. **Zero amount:** "I spent 0 dollars"
4. **Invalid frequency:** "Add $50 monthly recurring expense with frequency 'sometimes'"

### Technical Errors (Should return generic message)
1. **Database connection lost:** Simulate connection failure
2. **Disk full:** Storage issues during write
3. **Constraint violations:** Unexpected database errors

### Date Defaulting (Should work correctly)
1. **No date mentioned:** "I spent $50 on coffee" → Should use today's date
2. **Explicit date:** "I spent $50 on coffee yesterday" → Should use yesterday
3. **Recurring expense no start date:** "Add monthly $50 for rent" → Should start today

## AI Function Declaration Guidance

The AI is instructed to:
1. **Always check the `success` field** in function results
2. **For validation errors:** Explain what's wrong and ask for corrections
3. **For database errors:** Provide reassuring generic message
4. **Never expose technical details** to the user

## Code Locations

- **ServiceResult Type:** `src/types/ServiceResult.ts`
- **Validators:** `src/validators/ExpenseValidator.ts`, `src/validators/RecurringExpenseValidator.ts`
- **Services:** `src/services/business/expenseService.ts`, `src/services/business/recurringExpenseService.ts`
- **AI Instructions:** `src/services/ai/functionDeclarationService.ts`

## Future Enhancements

Potential additions to error handling:
- Retry logic for transient database errors
- Rate limiting errors (too many requests)
- Authentication/authorization errors
- Quota exceeded errors
- External service failures (WhatsApp API)

Each new error type should follow the same pattern:
- Return `failure()` with appropriate error code
- Provide AI-friendly message in the response
- Log technical details for debugging
- Don't expose system internals to users
