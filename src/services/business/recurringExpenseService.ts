import { RecurringExpenseInput, RecurringExpenseResult, RecurringExpenseData } from '../../types/models';
import { success, failure } from '../../types/ServiceResult';
import { CategoryNormalizer } from '../../lib/CategoryNormalizer';
import { UserContextProvider } from '../../lib/UserContextProvider';
import { RecurringExpenseValidator } from '../../validators/RecurringExpenseValidator';
import { PrismaClientManager } from '../../lib/PrismaClientManager';
import { MessageBuilder } from '../../lib/MessageBuilder';
import { PrismaClient } from '../../generated/prisma';

export class RecurringExpenseService {
  private prisma: PrismaClient;
  private categoryNormalizer: CategoryNormalizer;
  private userContext: UserContextProvider;
  private validator: RecurringExpenseValidator;
  private messageBuilder: MessageBuilder;

  constructor(userContext?: UserContextProvider) {
    this.prisma = PrismaClientManager.getClient();
    this.categoryNormalizer = new CategoryNormalizer();
    this.userContext = userContext || new UserContextProvider();
    this.validator = new RecurringExpenseValidator();
    this.messageBuilder = new MessageBuilder();
  }

  /**
   * Create a new recurring expense
   */
  async createRecurringExpense(data: RecurringExpenseInput): Promise<RecurringExpenseResult> {
    data.userId = this.userContext.getUserId();

    // Validate and normalize category
    const normalizationResult = this.categoryNormalizer.normalize(data.category);
    data.category = normalizationResult.category;

    // Normalize start date (defaults to today if not provided)
    const startDate = this.validator.normalizeStartDate(data.startDate);

    // Create and validate recurrence pattern (domain object)
    const validationResult = this.validator.validate(
      data.amount,
      data.frequency,
      startDate,
      data.interval,
      data.dayOfWeek,
      data.dayOfMonth
    );

    if (!validationResult.isValid || !validationResult.recurrencePattern) {
      return failure(
        'Validation failed',
        'VALIDATION_ERROR',
        validationResult.errors.join('; '),
        validationResult.errors
      );
    }

    const recurrencePattern = validationResult.recurrencePattern;

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
        normalizationResult
      );

      // Build warnings if category was normalized
      const warnings: string[] = [];
      const categoryWarning = this.messageBuilder.buildCategoryNormalizationWarning(normalizationResult);
      if (categoryWarning) {
        warnings.push(categoryWarning);
      }

      // Return structured result using generic ServiceResult
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
        warnings.length > 0 ? warnings : undefined
      );
    } catch (error) {
      console.error('Database error in createRecurringExpense:', error);
      return failure(
        'A technical error occurred while creating the recurring expense',
        'DATABASE_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}
