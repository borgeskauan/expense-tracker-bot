import { PrismaClient } from '../generated/prisma';
import { CategoryNormalizer, CategoryNormalizationResult } from './CategoryNormalizer';
import { UserContextProvider } from './UserContextProvider';
import { MessageBuilder } from './MessageBuilder';
import { PrismaClientManager } from './PrismaClientManager';
import { failure, ServiceResult } from '../types/ServiceResult';
import { ExpenseValidator } from '../validators/ExpenseValidator';

/**
 * Result of basic expense data validation
 */
export interface BasicExpenseValidationResult {
  isValid: boolean;
  amount: number;
  normalizedCategory: string;
  normalizedDate: Date;
  warnings: string[];
  validationErrors?: string[];
}

/**
 * Base utility class providing shared operations for expense services
 * Follows composition pattern - services compose with this utility
 */
export class BaseExpenseOperations {
  protected prisma: PrismaClient;
  protected categoryNormalizer: CategoryNormalizer;
  protected userContext: UserContextProvider;
  protected messageBuilder: MessageBuilder;
  protected expenseValidator: ExpenseValidator;

  constructor(userContext?: UserContextProvider) {
    this.prisma = PrismaClientManager.getClient();
    this.categoryNormalizer = new CategoryNormalizer();
    this.userContext = userContext || new UserContextProvider();
    this.messageBuilder = new MessageBuilder();
    this.expenseValidator = new ExpenseValidator();
  }

  /**
   * Validate basic expense data (amount, date, category)
   * This is the shared validation pipeline for both ExpenseService and RecurringExpenseService
   * 
   * @param amount - The expense amount
   * @param category - The expense category
   * @param date - The expense date (optional, defaults to today)
   * @returns Validation result with normalized data and warnings
   */
  validateBasicExpenseData(
    amount: number,
    category: string,
    date?: Date | string
  ): BasicExpenseValidationResult {
    // Validate amount and normalize date
    const validationResult = this.expenseValidator.validateWithNormalization(amount, date);
    
    if (!validationResult.isValid) {
      return {
        isValid: false,
        amount,
        normalizedCategory: category,
        normalizedDate: validationResult.normalizedDate,
        warnings: [],
        validationErrors: validationResult.errors,
      };
    }

    // Normalize category
    const normalizationResult = this.categoryNormalizer.normalize(category);
    
    // Build category warnings
    const warnings = this.buildCategoryWarnings(normalizationResult);

    return {
      isValid: true,
      amount,
      normalizedCategory: normalizationResult.category,
      normalizedDate: validationResult.normalizedDate,
      warnings,
    };
  }

  /**
   * Build category normalization warnings from normalization result
   * 
   * @param normalizationResult - The result from category normalization
   * @returns Array of warning strings (empty if no warnings)
   */
  private buildCategoryWarnings(normalizationResult: CategoryNormalizationResult): string[] {
    const warnings: string[] = [];
    const categoryWarning = this.messageBuilder.buildCategoryNormalizationWarning(normalizationResult);
    if (categoryWarning) {
      warnings.push(categoryWarning);
    }
    return warnings;
  }

  /**
   * Inject current user ID into data object
   * Mutates the data object
   * 
   * @param data - The data object to inject userId into
   */
  injectUserId<T extends { userId?: string }>(data: T): void {
    data.userId = this.userContext.getUserId();
  }

  /**
   * Handle database errors with consistent error response
   * 
   * @param error - The error object
   * @param operation - Description of the operation that failed
   * @returns ServiceResult failure with DATABASE_ERROR code
   */
  handleDatabaseError<T>(error: unknown, operation: string): ServiceResult<T> {
    console.error(`Database error in ${operation}:`, error);
    return failure(
      `A technical error occurred while ${operation}`,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
