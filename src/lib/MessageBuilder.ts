import { Expense as PrismaExpense, RecurringExpense as PrismaRecurringExpense } from '../generated/prisma';
import { CategoryNormalizationResult } from './CategoryNormalizer';
import { RecurrencePattern } from '../domain/RecurrencePattern';

/**
 * Utility class for building user-facing messages
 * Centralizes all message formatting logic for consistency
 */
export class MessageBuilder {
  /**
   * Format a date as ISO string (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Build message for expense creation
   * 
   * @param expense - The created expense
   * @param normalizationResult - Category normalization result
   * @returns Formatted success message
   */
  buildExpenseCreatedMessage(
    expense: PrismaExpense,
    normalizationResult: CategoryNormalizationResult
  ): string {
    let message = `Expense added successfully: $${expense.amount} in category "${expense.category}"`;

    if (normalizationResult.wasNormalized) {
      message += ` (categorized from "${normalizationResult.originalCategory}")`;
    }

    if (expense.description) {
      message += ` - ${expense.description}`;
    }

    message += ` on ${this.formatDate(expense.date)}`;

    return message;
  }

  /**
   * Build message for recurring expense creation
   * 
   * @param recurringExpense - The created recurring expense
   * @param recurrencePattern - The recurrence pattern domain object
   * @param normalizationResult - Category normalization result
   * @returns Formatted success message
   */
  buildRecurringExpenseCreatedMessage(
    recurringExpense: PrismaRecurringExpense,
    recurrencePattern: RecurrencePattern,
    normalizationResult: CategoryNormalizationResult
  ): string {
    const frequencyDesc = recurrencePattern.getDescription();

    let message = `Recurring expense created: $${recurringExpense.amount} for ${recurringExpense.category}`;

    if (normalizationResult.wasNormalized) {
      message += ` (categorized from "${normalizationResult.originalCategory}")`;
    }

    if (recurringExpense.description) {
      message += ` - ${recurringExpense.description}`;
    }

    message += ` ${frequencyDesc}, starting ${this.formatDate(recurringExpense.startDate)}`;

    return message;
  }

  /**
   * Build message for expense update
   * 
   * @param expense - The updated expense
   * @returns Formatted success message
   */
  buildExpenseUpdatedMessage(expense: PrismaExpense): string {
    return `Expense #${expense.id} updated: $${expense.amount} in "${expense.category}" on ${this.formatDate(expense.date)}`;
  }

  /**
   * Build message for recurring expense update
   * 
   * @param recurringExpense - The updated recurring expense
   * @returns Formatted success message
   */
  buildRecurringExpenseUpdatedMessage(recurringExpense: PrismaRecurringExpense): string {
    return `Recurring expense #${recurringExpense.id} updated: $${recurringExpense.amount} for "${recurringExpense.category}"`;
  }

  /**
   * Build message for expense deletion
   * 
   * @param expenseId - The ID of deleted expense
   * @returns Formatted success message
   */
  buildExpenseDeletedMessage(expenseId: number): string {
    return `Expense #${expenseId} deleted successfully`;
  }

  /**
   * Build message for recurring expense deletion
   * 
   * @param recurringExpenseId - The ID of deleted recurring expense
   * @returns Formatted success message
   */
  buildRecurringExpenseDeletedMessage(recurringExpenseId: number): string {
    return `Recurring expense #${recurringExpenseId} deleted successfully`;
  }

  /**
   * Build message for recurring expense activation
   * 
   * @param recurringExpense - The activated recurring expense
   * @returns Formatted success message
   */
  buildRecurringExpenseActivatedMessage(recurringExpense: PrismaRecurringExpense): string {
    return `Recurring expense #${recurringExpense.id} activated: $${recurringExpense.amount} for "${recurringExpense.category}"`;
  }

  /**
   * Build message for recurring expense deactivation
   * 
   * @param recurringExpense - The deactivated recurring expense
   * @returns Formatted success message
   */
  buildRecurringExpenseDeactivatedMessage(recurringExpense: PrismaRecurringExpense): string {
    return `Recurring expense #${recurringExpense.id} deactivated: $${recurringExpense.amount} for "${recurringExpense.category}"`;
  }

  /**
   * Build warning message for category normalization
   * 
   * @param normalizationResult - Category normalization result
   * @returns Warning message or undefined if not normalized
   */
  buildCategoryNormalizationWarning(
    normalizationResult: CategoryNormalizationResult
  ): string | undefined {
    if (normalizationResult.wasNormalized) {
      return `Category "${normalizationResult.originalCategory}" was normalized to "${normalizationResult.category}"`;
    }
    return undefined;
  }

  /**
   * Build summary message for multiple expenses
   * 
   * @param count - Number of expenses
   * @param total - Total amount
   * @returns Formatted summary message
   */
  buildExpenseSummaryMessage(count: number, total: number): string {
    return `Found ${count} expense${count !== 1 ? 's' : ''} totaling $${total.toFixed(2)}`;
  }

  /**
   * Build summary message for multiple recurring expenses
   * 
   * @param count - Number of recurring expenses
   * @param monthlyTotal - Monthly equivalent total
   * @returns Formatted summary message
   */
  buildRecurringExpenseSummaryMessage(count: number, monthlyTotal: number): string {
    return `Found ${count} recurring expense${count !== 1 ? 's' : ''} with monthly total of $${monthlyTotal.toFixed(2)}`;
  }
}
