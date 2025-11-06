import { RecurringExpenseInput, RecurringExpenseResult } from '../types/models';
import { CategoryNormalizer } from './common/CategoryNormalizer';
import { UserContextProvider } from './common/UserContextProvider';
import { RecurringExpenseValidator } from './validators/RecurringExpenseValidator';
import { RecurringExpenseRepository } from './repositories/RecurringExpenseRepository';

export class RecurringExpenseService {
  private repository: RecurringExpenseRepository;
  private categoryNormalizer: CategoryNormalizer;
  private userContext: UserContextProvider;
  private validator: RecurringExpenseValidator;

  constructor(userContext?: UserContextProvider) {
    this.repository = new RecurringExpenseRepository();
    this.categoryNormalizer = new CategoryNormalizer();
    this.userContext = userContext || new UserContextProvider();
    this.validator = new RecurringExpenseValidator();
  }

  /**
   * Create a new recurring expense
   */
  async createRecurringExpense(data: RecurringExpenseInput): Promise<RecurringExpenseResult> {
    try {
      data.userId = this.userContext.getUserId();

      // Validate and normalize category
      const normalizationResult = this.categoryNormalizer.normalize(data.category);
      data.category = normalizationResult.category;

      // Normalize and validate start date
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
        throw new Error(validationResult.errors.join('; '));
      }

      const recurrencePattern = validationResult.recurrencePattern;

      // Calculate next due date using domain object
      const nextDue = recurrencePattern.calculateNextDueDate(startDate);

      // Convert pattern to JSON for database
      const patternData = recurrencePattern.toJSON();

      // Create database record using repository
      const recurringExpense = await this.repository.create({
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
      });

      console.log(`Recurring expense created: $${recurringExpense.amount} for ${recurringExpense.category} ${data.frequency}`);

      // Build success message using domain object
      const frequencyDesc = recurrencePattern.getDescription();

      let message = `Recurring expense created: $${recurringExpense.amount} for ${recurringExpense.category}`;
      
      if (normalizationResult.wasNormalized) {
        message += ` (categorized from "${normalizationResult.originalCategory}")`;
      }
      
      if (recurringExpense.description) {
        message += ` - ${recurringExpense.description}`;
      }
      
      message += ` ${frequencyDesc}, starting ${recurringExpense.startDate.toISOString().split('T')[0]}`;

      // Return structured result
      return {
        success: true,
        message: message,
        recurringExpense: {
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
        }
      };
    } catch (error) {
      console.error('Error creating recurring expense:', error);
      throw error instanceof Error ? error : new Error('Failed to create recurring expense');
    }
  }
}
