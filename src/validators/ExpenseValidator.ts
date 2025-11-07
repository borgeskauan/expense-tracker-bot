import { ValidationError } from '../errors';

/**
 * Validation result for expenses
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validator for basic expense data
 * Separates validation logic from business logic
 */
export class ExpenseValidator {
  /**
   * Validate expense amount
   * 
   * @param amount - The expense amount to validate
   * @returns Validation result
   */
  validateAmount(amount: number): ValidationResult {
    const errors: string[] = [];

    if (typeof amount !== 'number' || isNaN(amount)) {
      errors.push('Amount must be a valid number');
    } else if (amount <= 0) {
      errors.push('Amount must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate expense date
   * 
   * @param date - The expense date to validate
   * @returns Validation result
   */
  validateDate(date: Date | string): ValidationResult {
    const errors: string[] = [];

    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        errors.push('Date must be a valid date');
      }
    } catch (error) {
      errors.push('Date must be a valid date');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate all expense fields
   * 
   * @param amount - The expense amount
   * @param date - The expense date
   * @returns Combined validation result
   */
  validate(amount: number, date: Date | string): ValidationResult {
    const amountResult = this.validateAmount(amount);
    const dateResult = this.validateDate(date);

    return {
      isValid: amountResult.isValid && dateResult.isValid,
      errors: [...amountResult.errors, ...dateResult.errors],
    };
  }

  /**
   * Normalize date to Date object
   * Defaults to today if not provided
   * 
   * @param date - The date to normalize (Date, string, or undefined)
   * @returns Date object (defaults to today if undefined)
   */
  normalizeDate(date?: Date | string): Date {
    if (!date) {
      console.log('Date not provided, defaulting to today');
      return new Date();
    }
    
    if (date instanceof Date) {
      return date;
    }
    
    return new Date(date);
  }

  /**
   * Validate all expense fields with date normalization
   * 
   * @param amount - The expense amount
   * @param date - The expense date (can be Date, string, or undefined - defaults to today)
   * @returns Combined validation result with normalized date
   */
  validateWithNormalization(
    amount: number, 
    date?: Date | string
  ): ValidationResult & { normalizedDate: Date } {
    const amountResult = this.validateAmount(amount);
    
    // Normalize date (defaults to today if undefined)
    const normalizedDate = this.normalizeDate(date);
    
    // Validate normalized date
    const dateResult = this.validateDate(normalizedDate);

    return {
      isValid: amountResult.isValid && dateResult.isValid,
      errors: [...amountResult.errors, ...dateResult.errors],
      normalizedDate,
    };
  }
}
