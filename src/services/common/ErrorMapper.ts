import { ServiceResult, failure } from '../../types/ServiceResult';
import {
  ApplicationError,
  ValidationError,
  DatabaseError,
} from '../../errors';

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

  /**
   * Check if an error is a specific type
   * 
   * @param error - The error to check
   * @param errorClass - The error class to check against
   * @returns True if error is instance of errorClass
   */
  static isErrorType(
    error: unknown,
    errorClass: new (...args: any[]) => ApplicationError
  ): boolean {
    return error instanceof errorClass;
  }

  /**
   * Extract error code from any error
   * 
   * @param error - The error to extract code from
   * @returns Error code or 'UNKNOWN_ERROR'
   */
  static getErrorCode(error: unknown): string {
    if (error instanceof ApplicationError) {
      return error.code;
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Extract HTTP status code from any error
   * 
   * @param error - The error to extract status code from
   * @returns HTTP status code
   */
  static getStatusCode(error: unknown): number {
    if (error instanceof ApplicationError) {
      return error.statusCode;
    }
    return 500; // Internal Server Error as default
  }

  /**
   * Create a user-friendly error message
   * Sanitizes technical details for end users
   * 
   * @param error - The error to create message from
   * @returns User-friendly error message
   */
  static toUserFriendlyMessage(error: unknown): string {
    if (error instanceof ValidationError) {
      return error.message;
    }

    if (error instanceof DatabaseError) {
      return 'A database error occurred. Please try again later.';
    }

    if (error instanceof ApplicationError) {
      return error.message;
    }

    // Generic message for unknown errors
    return 'An unexpected error occurred. Please try again later.';
  }

  /**
   * Log error with appropriate level
   * 
   * @param error - The error to log
   * @param context - Additional context for logging
   */
  static logError(error: unknown, context?: Record<string, any>): void {
    const errorCode = this.getErrorCode(error);
    const statusCode = this.getStatusCode(error);

    // Determine log level based on error type/status
    const isClientError = statusCode >= 400 && statusCode < 500;
    const logLevel = isClientError ? 'warn' : 'error';

    const logData: Record<string, any> = {
      errorCode,
      statusCode,
      message: error instanceof Error ? error.message : String(error),
      context,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof ApplicationError) {
      logData.details = error.details;
      logData.stack = error.stack;
    }

    if (logLevel === 'error') {
      console.error('Error occurred:', logData);
    } else {
      console.warn('Client error occurred:', logData);
    }
  }
}
