/**
 * Base error class for all application errors
 * Extends Error with additional context and metadata
 */
export class ApplicationError extends Error {
  /**
   * Machine-readable error code for programmatic handling
   */
  public readonly code: string;

  /**
   * HTTP status code hint (useful for API responses)
   */
  public readonly statusCode: number;

  /**
   * Additional error details or context
   */
  public readonly details?: Record<string, any>;

  /**
   * Timestamp when error occurred
   */
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when validation fails
 * Use for input validation, data format issues, etc.
 */
export class ValidationError extends ApplicationError {
  /**
   * Array of specific validation errors
   */
  public readonly validationErrors: string[];

  constructor(
    message: string,
    validationErrors: string[] = [],
    details?: Record<string, any>
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      400, // Bad Request
      { ...details, validationErrors }
    );
    this.validationErrors = validationErrors;
  }
}

/**
 * Error thrown when database operations fail
 * Use for query failures, connection issues, etc.
 */
export class DatabaseError extends ApplicationError {
  /**
   * Original database error (if available)
   */
  public readonly originalError?: Error;

  constructor(
    message: string,
    originalError?: Error,
    details?: Record<string, any>
  ) {
    super(
      message,
      'DATABASE_ERROR',
      500, // Internal Server Error
      {
        ...details,
        originalMessage: originalError?.message,
      }
    );
    this.originalError = originalError;
  }
}
