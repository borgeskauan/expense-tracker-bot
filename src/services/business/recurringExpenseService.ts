import { RecurringExpenseInput, RecurringExpenseResult } from '../../types/models';
import { success, failure } from '../../types/ServiceResult';
import { UserContextProvider } from '../../lib/UserContextProvider';
import { RecurringExpenseValidator } from '../../validators/RecurringExpenseValidator';
import { BaseExpenseOperations } from '../../lib/BaseExpenseOperations';
import { PrismaClient } from '../../generated/prisma';
import { MessageBuilder } from '../../lib/MessageBuilder';
import { PrismaClientManager } from '../../lib/PrismaClientManager';

export class RecurringExpenseService {
  private baseOps: BaseExpenseOperations;
  private validator: RecurringExpenseValidator;
  private prisma: PrismaClient;
  private messageBuilder: MessageBuilder;

  constructor(userContext?: UserContextProvider) {
    this.baseOps = new BaseExpenseOperations(userContext);
    this.validator = new RecurringExpenseValidator();
    this.prisma = PrismaClientManager.getClient();
    this.messageBuilder = new MessageBuilder();
  }

  /**
   * Create a new recurring expense
   */
  async createRecurringExpense(data: RecurringExpenseInput): Promise<RecurringExpenseResult> {
    // Inject user ID using base operations
    this.baseOps.injectUserId(data);

    // Store original category before normalization
    const originalCategory = data.category;

    // Validate basic expense data (amount, startDate, category) using shared pipeline
    const basicValidation = this.baseOps.validateBasicExpenseData(
      data.amount,
      data.category,
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
      const recurringExpense = await this.prisma.recurringExpense.create({
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
        },
      });

      console.log(`Recurring expense created: $${recurringExpense.amount} for ${recurringExpense.category} ${data.frequency}`);

      // Build success message using MessageBuilder
      const message = this.messageBuilder.buildRecurringExpenseCreatedMessage(
        recurringExpense,
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
          id: recurringExpense.id,
          amount: recurringExpense.amount,
          category: recurringExpense.category,
          description: recurringExpense.description,
          frequency: recurringExpense.frequency,
          interval: recurringExpense.interval,
          dayOfWeek: recurringExpense.dayOfWeek,
          dayOfMonth: recurringExpense.dayOfMonth,
          nextDue: recurringExpense.nextDue.toISOString().split('T')[0],
          startDate: recurringExpense.startDate.toISOString().split('T')[0]
        },
        message,
        basicValidation.warnings.length > 0 ? basicValidation.warnings : undefined
      );
    } catch (error) {
      return this.baseOps.handleDatabaseError(error, 'creating the recurring expense');
    }
  }
}
