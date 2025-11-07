import { RecurrencePattern } from '../domain/RecurrencePattern';
import { ExpenseValidator, ValidationResult } from './ExpenseValidator';

/**
 * Validator for recurring expense data
 * Extends base expense validation with recurrence-specific validation
 */
export class RecurringExpenseValidator {
  private expenseValidator: ExpenseValidator;

  constructor() {
    this.expenseValidator = new ExpenseValidator();
  }

  /**
   * Validate recurring expense amount (delegates to ExpenseValidator)
   */
  validateAmount(amount: number): ValidationResult {
    return this.expenseValidator.validateAmount(amount);
  }

  /**
   * Validate start date
   */
  validateStartDate(startDate: Date | string | undefined): ValidationResult {
    if (startDate === undefined) {
      // startDate is optional, will default to today
      return { isValid: true, errors: [] };
    }

    return this.expenseValidator.validateDate(startDate);
  }

  /**
   * Create and validate a RecurrencePattern
   * 
   * @param frequency - The recurrence frequency
   * @param startDate - The start date (for defaulting day fields)
   * @param interval - The interval
   * @param dayOfWeek - Day of week for weekly
   * @param dayOfMonth - Day of month for monthly
   * @returns RecurrencePattern if valid
   * @throws Error if validation fails
   */
  createRecurrencePattern(
    frequency: string,
    startDate: Date,
    interval?: number,
    dayOfWeek?: number,
    dayOfMonth?: number
  ): RecurrencePattern {
    return RecurrencePattern.create(
      frequency,
      startDate,
      interval,
      dayOfWeek,
      dayOfMonth
    );
  }

  /**
   * Validate all recurring expense fields
   * 
   * @param amount - The expense amount
   * @param frequency - The recurrence frequency
   * @param startDate - The start date
   * @param interval - The interval
   * @param dayOfWeek - Day of week for weekly
   * @param dayOfMonth - Day of month for monthly
   * @returns Validation result with RecurrencePattern if valid
   */
  validate(
    amount: number,
    frequency: string,
    startDate: Date,
    interval?: number,
    dayOfWeek?: number,
    dayOfMonth?: number
  ): {
    isValid: boolean;
    errors: string[];
    recurrencePattern?: RecurrencePattern;
  } {
    const errors: string[] = [];

    // Validate amount
    const amountResult = this.validateAmount(amount);
    errors.push(...amountResult.errors);

    // Validate and create recurrence pattern
    let recurrencePattern: RecurrencePattern | undefined;
    try {
      recurrencePattern = this.createRecurrencePattern(
        frequency,
        startDate,
        interval,
        dayOfWeek,
        dayOfMonth
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Invalid recurrence pattern');
    }

    return {
      isValid: errors.length === 0,
      errors,
      recurrencePattern,
    };
  }

  /**
   * Normalize and validate start date
   * Defaults to today if not provided
   * 
   * @param startDate - The start date to normalize
   * @returns Normalized Date object
   */
  normalizeStartDate(startDate?: Date | string): Date {
    if (startDate === undefined) {
      console.log('startDate not provided, defaulting to today');
      return new Date();
    }

    return this.expenseValidator.normalizeDate(startDate);
  }
}
