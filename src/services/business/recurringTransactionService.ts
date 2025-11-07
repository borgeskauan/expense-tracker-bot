import { RecurringTransactionInput, RecurringTransactionResult } from '../../types/models';
import { success, failure } from '../../types/ServiceResult';
import { UserContextProvider } from '../../lib/UserContextProvider';
import { RecurringTransactionValidator } from '../../validators/RecurringTransactionValidator';
import { BaseTransactionOperations } from '../../lib/BaseTransactionOperations';
import { PrismaClient } from '../../generated/prisma';
import { MessageBuilder } from '../../lib/MessageBuilder';
import { PrismaClientManager } from '../../lib/PrismaClientManager';
import { TransactionType } from '../../config/transactionTypes';

export class RecurringTransactionService {
  private baseOps: BaseTransactionOperations;
  private validator: RecurringTransactionValidator;
  private prisma: PrismaClient;
  private messageBuilder: MessageBuilder;

  constructor(userContext?: UserContextProvider) {
    this.baseOps = new BaseTransactionOperations(userContext);
    this.validator = new RecurringTransactionValidator();
    this.prisma = PrismaClientManager.getClient();
    this.messageBuilder = new MessageBuilder();
  }

  /**
   * Create a new recurring transaction
   */
  async createRecurringTransaction(data: RecurringTransactionInput): Promise<RecurringTransactionResult> {
    // Inject user ID using base operations
    this.baseOps.injectUserId(data);

    // Store original category before normalization
    const originalCategory = data.category;

    // Validate basic transaction data (amount, startDate, category, type) using shared pipeline
    const basicValidation = this.baseOps.validateBasicTransactionData(
      data.amount,
      data.category,
      data.type,
      data.startDate
    );

    if (!basicValidation.isValid) {
      return failure(
        'Validation failed',
        'VALIDATION_ERROR',
        basicValidation.validationErrors?.join('; '),
        basicValidation.validationErrors
      );
    }

    // Use validated and normalized data
    data.category = basicValidation.normalizedCategory;
    const startDate = basicValidation.normalizedDate;

    // Validate recurrence pattern (domain-specific)
    const recurrenceValidation = this.validator.validate(
      data.amount,
      data.frequency,
      startDate,
      data.type,
      data.interval,
      data.dayOfWeek,
      data.dayOfMonth
    );

    if (!recurrenceValidation.isValid || !recurrenceValidation.recurrencePattern) {
      return failure(
        'Validation failed',
        'VALIDATION_ERROR',
        recurrenceValidation.errors.join('; '),
        recurrenceValidation.errors
      );
    }

    const recurrencePattern = recurrenceValidation.recurrencePattern;

    // Calculate next due date using domain object
    const nextDue = recurrencePattern.calculateNextDueDate(startDate);

    // Convert pattern to JSON for database
    const patternData = recurrencePattern.toJSON();

    try {
      // Create database record directly with Prisma
      const recurringTransaction = await this.prisma.recurringTransaction.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          category: data.category,
          description: data.description || null,
          frequency: patternData.frequency,
          interval: patternData.interval,
          dayOfWeek: patternData.dayOfWeek,
          dayOfMonth: patternData.dayOfMonth,
          startDate: startDate,
          nextDue: nextDue,
          isActive: true,
          type: data.type,
        },
      });

      console.log(`Recurring transaction created: $${recurringTransaction.amount} for ${recurringTransaction.category} ${data.frequency} (${data.type})`);

      // Build success message using MessageBuilder
      const message = this.messageBuilder.buildRecurringTransactionCreatedMessage(
        recurringTransaction,
        recurrencePattern,
        {
          category: basicValidation.normalizedCategory,
          wasNormalized: basicValidation.warnings.length > 0,
          originalCategory: basicValidation.warnings.length > 0 ? originalCategory : undefined
        }
      );

      // Return structured result with warnings from validation
      return success(
        {
          id: recurringTransaction.id,
          amount: recurringTransaction.amount,
          category: recurringTransaction.category,
          description: recurringTransaction.description,
          frequency: recurringTransaction.frequency,
          interval: recurringTransaction.interval,
          dayOfWeek: recurringTransaction.dayOfWeek,
          dayOfMonth: recurringTransaction.dayOfMonth,
          nextDue: recurringTransaction.nextDue.toISOString().split('T')[0],
          startDate: recurringTransaction.startDate.toISOString().split('T')[0],
          type: recurringTransaction.type as TransactionType
        },
        message,
        basicValidation.warnings.length > 0 ? basicValidation.warnings : undefined
      );
    } catch (error) {
      return this.baseOps.handleDatabaseError(error, 'creating the recurring transaction');
    }
  }
}
