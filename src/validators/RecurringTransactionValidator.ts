import { RecurrencePattern } from '../domain/RecurrencePattern';
import { TransactionValidator, ValidationResult } from './TransactionValidator';
import { TransactionType } from '../config/transactionTypes';

/**
 * Validator for recurring transaction data
 * Extends base transaction validation with recurrence-specific validation
 */
export class RecurringTransactionValidator {
  private transactionValidator: TransactionValidator;

  constructor() {
    this.transactionValidator = new TransactionValidator();
  }

  /**
   * Validate recurring transaction amount (delegates to TransactionValidator)
   */
  validateAmount(amount: number): ValidationResult {
    return this.transactionValidator.validateAmount(amount);
  }

  /**
   * Validate transaction type (delegates to TransactionValidator)
   */
  validateType(type: TransactionType): ValidationResult {
    return this.transactionValidator.validateType(type);
  }

  /**
   * Create and validate a RecurrencePattern
   * 
   * @param frequency - The recurrence frequency
   * @param startDate - The start date (for defaulting day fields)
   * @param interval - The interval
   * @param dayOfWeek - Day of week for weekly
   * @param dayOfMonth - Day of month for monthly
   * @param monthOfYear - Month of year for yearly
   * @returns RecurrencePattern if valid
   * @throws Error if validation fails
   */
  createRecurrencePattern(
    frequency: string,
    startDate: Date | string,
    interval?: number,
    dayOfWeek?: number,
    dayOfMonth?: number,
    monthOfYear?: number
  ): RecurrencePattern {
    return RecurrencePattern.create(
      frequency,
      startDate,
      interval,
      dayOfWeek,
      dayOfMonth,
      monthOfYear
    );
  }

  /**
   * Validate all recurring transaction fields
   * 
   * @param amount - The transaction amount
   * @param frequency - The recurrence frequency
   * @param startDate - The start date
   * @param type - The transaction type
   * @param interval - The interval (accepts null and converts to undefined)
   * @param dayOfWeek - Day of week for weekly (accepts null and converts to undefined)
   * @param dayOfMonth - Day of month for monthly (accepts null and converts to undefined)
   * @param monthOfYear - Month of year for yearly (accepts null and converts to undefined)
   * @returns Validation result with RecurrencePattern if valid
   */
  validate(
    amount: number,
    frequency: string,
    startDate: Date | string,
    type: TransactionType,
    interval?: number | null,
    dayOfWeek?: number | null,
    dayOfMonth?: number | null,
    monthOfYear?: number | null
  ): {
    isValid: boolean;
    errors: string[];
    recurrencePattern?: RecurrencePattern;
  } {
    const errors: string[] = [];

    // Validate amount
    const amountResult = this.validateAmount(amount);
    errors.push(...amountResult.errors);

    // Validate type
    const typeResult = this.validateType(type);
    errors.push(...typeResult.errors);

    // Convert null to undefined for recurrence pattern creation
    const normalizedInterval = interval !== null ? interval : undefined;
    const normalizedDayOfWeek = dayOfWeek !== null ? dayOfWeek : undefined;
    const normalizedDayOfMonth = dayOfMonth !== null ? dayOfMonth : undefined;
    const normalizedMonthOfYear = monthOfYear !== null ? monthOfYear : undefined;

    // Validate and create recurrence pattern
    let recurrencePattern: RecurrencePattern | undefined;
    try {
      recurrencePattern = this.createRecurrencePattern(
        frequency,
        startDate,
        normalizedInterval,
        normalizedDayOfWeek,
        normalizedDayOfMonth,
        normalizedMonthOfYear
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
   * Normalize start date
   * Defaults to today if not provided
   * 
   * @param startDate - The start date to normalize
   * @returns Normalized Date object
   */
  normalizeStartDate(startDate?: Date | string): string {
    return this.transactionValidator.normalizeDate(startDate);
  }
}
