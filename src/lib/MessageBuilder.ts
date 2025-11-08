import { Transaction as PrismaTransaction, RecurringTransaction as PrismaRecurringTransaction } from '../generated/prisma';
import { CategoryNormalizationResult } from './CategoryNormalizer';
import { RecurrencePattern } from '../domain/RecurrencePattern';
import { TransactionType } from '../config/transactionTypes';
import { TransactionData } from '../types/models';

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
   * Get the transaction type label for messages
   */
  private getTransactionTypeLabel(type: TransactionType): string {
    return type === TransactionType.EXPENSE ? 'Expense' : 'Income';
  }

  /**
   * Get the transaction verb for messages
   */
  private getTransactionVerb(type: TransactionType): string {
    return type === TransactionType.EXPENSE ? 'added' : 'recorded';
  }

  /**
   * Build message for transaction creation
   * 
   * @param transaction - The created transaction
   * @param normalizationResult - Category normalization result
   * @returns Formatted success message
   */
  buildTransactionCreatedMessage(
    transaction: PrismaTransaction,
    normalizationResult: CategoryNormalizationResult
  ): string {
    const label = this.getTransactionTypeLabel(transaction.type as TransactionType);
    const verb = this.getTransactionVerb(transaction.type as TransactionType);

    let message = `${label} ${verb} successfully: $${transaction.amount} in category "${transaction.category}"`;

    if (normalizationResult.wasNormalized) {
      message += ` (categorized from "${normalizationResult.originalCategory}")`;
    }

    if (transaction.description) {
      message += ` - ${transaction.description}`;
    }

    message += ` on ${this.formatDate(transaction.date)}`;

    return message;
  }

  /**
   * Build message for recurring transaction creation
   * 
   * @param recurringTransaction - The created recurring transaction
   * @param recurrencePattern - The recurrence pattern domain object
   * @param normalizationResult - Category normalization result
   * @returns Formatted success message
   */
  buildRecurringTransactionCreatedMessage(
    recurringTransaction: PrismaRecurringTransaction,
    recurrencePattern: RecurrencePattern,
    normalizationResult: CategoryNormalizationResult
  ): string {
    const label = this.getTransactionTypeLabel(recurringTransaction.type as TransactionType);
    const frequencyDesc = recurrencePattern.getDescription();

    let message = `Recurring ${label.toLowerCase()} created: $${recurringTransaction.amount} for ${recurringTransaction.category}`;

    if (normalizationResult.wasNormalized) {
      message += ` (categorized from "${normalizationResult.originalCategory}")`;
    }

    if (recurringTransaction.description) {
      message += ` - ${recurringTransaction.description}`;
    }

    message += ` ${frequencyDesc}, starting ${this.formatDate(recurringTransaction.startDate)}`;

    return message;
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
   * Build message for transaction update
   * 
   * @param originalTransaction - The original transaction data before update
   * @param updatedTransaction - The updated transaction data
   * @param normalizationResult - Category normalization result
   * @returns Formatted success message
   */
  buildTransactionUpdatedMessage(
    originalTransaction: TransactionData,
    updatedTransaction: TransactionData,
    normalizationResult: CategoryNormalizationResult
  ): string {
    const label = this.getTransactionTypeLabel(updatedTransaction.type);
    const changes: string[] = [];

    // Detect what changed
    if (originalTransaction.amount !== updatedTransaction.amount) {
      changes.push(`amount from $${originalTransaction.amount} to $${updatedTransaction.amount}`);
    }

    if (originalTransaction.category !== updatedTransaction.category) {
      let categoryChange = `category from "${originalTransaction.category}" to "${updatedTransaction.category}"`;
      if (normalizationResult.wasNormalized) {
        categoryChange += ` (normalized from "${normalizationResult.originalCategory}")`;
      }
      changes.push(categoryChange);
    }

    if (originalTransaction.description !== updatedTransaction.description) {
      if (originalTransaction.description && updatedTransaction.description) {
        changes.push(`description from "${originalTransaction.description}" to "${updatedTransaction.description}"`);
      } else if (updatedTransaction.description) {
        changes.push(`added description "${updatedTransaction.description}"`);
      } else {
        changes.push(`removed description`);
      }
    }

    if (originalTransaction.date !== updatedTransaction.date) {
      changes.push(`date from ${originalTransaction.date} to ${updatedTransaction.date}`);
    }

    if (originalTransaction.type !== updatedTransaction.type) {
      changes.push(`type from ${originalTransaction.type} to ${updatedTransaction.type}`);
    }

    // Build final message
    if (changes.length === 0) {
      return `${label} updated successfully (no changes detected)`;
    }

    let message = `${label} updated successfully: `;
    
    if (changes.length === 1) {
      message += `Changed ${changes[0]}`;
    } else {
      message += `Changed ${changes.slice(0, -1).join(', ')} and ${changes[changes.length - 1]}`;
    }

    // Add current state summary
    message += `. Current: $${updatedTransaction.amount} for ${updatedTransaction.category}`;
    
    if (updatedTransaction.description) {
      message += ` - ${updatedTransaction.description}`;
    }
    
    message += ` on ${updatedTransaction.date}`;

    return message;
  }
}
