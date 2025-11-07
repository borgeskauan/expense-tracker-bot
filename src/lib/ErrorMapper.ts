import { ServiceResult, failure } from '../types/ServiceResult';
import {
  ApplicationError,
  ValidationError,
  DatabaseError,
} from '../errors';

/**
 * Utility class for mapping errors to ServiceResult
 * Provides consistent error handling across all services
 */
export class ErrorMapper {
  /**
   * Convert any error to a ServiceResult failure
   * 
   * @param error - The error to convert
   * @param defaultMessage - Default message if error message is not available
   * @returns ServiceResult with failure
   */
  static toServiceResult<T = never>(
    error: unknown,
    defaultMessage: string = 'An unexpected error occurred'
  ): ServiceResult<T> {
    // Handle ApplicationError and its subclasses
    if (error instanceof ApplicationError) {
      return failure<T>(
        error.message,
        error.code,
        this.formatErrorDetails(error)
      );
    }

    // Handle standard Error
    if (error instanceof Error) {
      return failure<T>(
        error.message || defaultMessage,
        'UNKNOWN_ERROR',
        error.stack
      );
    }

    // Handle unknown error types
    return failure<T>(
      defaultMessage,
      'UNKNOWN_ERROR',
      String(error)
    );
  }

  /**
   * Format error details for inclusion in ServiceResult
   * 
   * @param error - The ApplicationError to format
   * @returns Formatted details string
   */
  private static formatErrorDetails(error: ApplicationError): string {
    const parts: string[] = [];

    // Add validation errors if present
    if (error instanceof ValidationError && error.validationErrors.length > 0) {
      parts.push(`Validation errors: ${error.validationErrors.join(', ')}`);
    }

    // Add original error message for DatabaseError
    if (error instanceof DatabaseError && error.originalError) {
      parts.push(`Original error: ${error.originalError.message}`);
    }

    // Add any additional details from the error
    if (error.details) {
      const detailsStr = JSON.stringify(error.details);
      if (detailsStr !== '{}') {
        parts.push(`Details: ${detailsStr}`);
      }
    }

    return parts.join(' | ');
  }
}
