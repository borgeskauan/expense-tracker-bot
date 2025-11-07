import { ValidationError } from '../../errors';

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
   * Normalize and validate date
   * Ensures date is a Date object
   * 
   * @param date - The date to normalize
   * @returns Normalized Date object
   * @throws ValidationError if date is invalid
   */
  normalizeDate(date: Date | string): Date {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError(
        'Invalid date provided',
        ['date: Invalid date provided']
      );
    }
    
    return dateObj;
  }
}
