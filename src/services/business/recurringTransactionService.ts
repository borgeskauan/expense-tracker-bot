import { RecurringTransactionInput, RecurringTransactionResult, RecurringTransactionData, RecurringTransactionUpdateData } from '../../types/models';
import { success, failure } from '../../types/ServiceResult';
import { UserContextProvider } from '../../lib/UserContextProvider';
import { RecurringTransactionValidator } from '../../validators/RecurringTransactionValidator';
import { BaseTransactionOperations } from '../../lib/BaseTransactionOperations';
import { PrismaClient } from '../../generated/prisma';
import { MessageBuilder } from '../../lib/MessageBuilder';
import { PrismaClientManager } from '../../lib/PrismaClientManager';
import { TransactionType } from '../../config/transactionTypes';
import { TransactionQueryService } from './transactionQueryService';

export class RecurringTransactionService {
  private baseOps: BaseTransactionOperations;
  private validator: RecurringTransactionValidator;
  private prisma: PrismaClient;
  private messageBuilder: MessageBuilder;
  private queryService: TransactionQueryService;

  constructor(userContext?: UserContextProvider) {
    this.baseOps = new BaseTransactionOperations(userContext);
    this.validator = new RecurringTransactionValidator();
    this.prisma = PrismaClientManager.getClient();
    this.messageBuilder = new MessageBuilder();
    this.queryService = new TransactionQueryService(userContext);
  }

  /**
   * Validate and create recurrence pattern with next due date calculation
   * Shared validation logic for both creation and updates
   */
  private validateRecurrencePattern(
    amount: number,
    frequency: string,
    startDate: Date,
    type: TransactionType,
    interval?: number | null,
    dayOfWeek?: number | null,
    dayOfMonth?: number | null,
    monthOfYear?: number | null
  ): { isValid: boolean; recurrencePattern?: any; nextDue?: Date; errors?: string[] } {
    // Validate the recurrence pattern
    const recurrenceValidation = this.validator.validate(
      amount,
      frequency as any,
      startDate,
      type,
      interval,
      dayOfWeek,
      dayOfMonth,
      monthOfYear
    );

    if (!recurrenceValidation.isValid || !recurrenceValidation.recurrencePattern) {
      return {
        isValid: false,
        errors: recurrenceValidation.errors,
      };
    }

    const recurrencePattern = recurrenceValidation.recurrencePattern;
    const nextDue = recurrencePattern.calculateNextDueDate(startDate);

    return {
      isValid: true,
      recurrencePattern,
      nextDue,
    };
  }

  /**
   * Create a new recurring transaction
   */
  async createRecurringTransaction(data: RecurringTransactionInput): Promise<RecurringTransactionResult> {
    // Inject user ID using base operations
    this.baseOps.injectUserId(data);

    // Store original category before normalization
    const originalCategory = data.category;

    // Validate basic transaction data (amount, startDate, category, type) using shared pipeline
    const basicValidation = this.baseOps.validateBasicTransactionData(
      data.amount,
      data.category,
      data.type,
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
    const recurrenceValidation = this.validateRecurrencePattern(
      data.amount,
      data.frequency,
      startDate,
      data.type,
      data.interval,
      data.dayOfWeek,
      data.dayOfMonth,
      data.monthOfYear
    );

    if (!recurrenceValidation.isValid) {
      return failure(
        'Validation failed',
        'VALIDATION_ERROR',
        recurrenceValidation.errors!.join('; '),
        recurrenceValidation.errors
      );
    }

    const recurrencePattern = recurrenceValidation.recurrencePattern!;
    const nextDue = recurrenceValidation.nextDue!;

    // Convert pattern to JSON for database
    const patternData = recurrencePattern.toJSON();

    try {
      // Create database record directly with Prisma
      const recurringTransaction = await this.prisma.recurringTransaction.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          category: data.category,
          description: data.description || null,
          frequency: patternData.frequency,
          interval: patternData.interval,
          dayOfWeek: patternData.dayOfWeek,
          dayOfMonth: patternData.dayOfMonth,
          monthOfYear: patternData.monthOfYear,
          startDate: startDate,
          nextDue: nextDue,
          isActive: true,
          type: data.type,
        },
      });

      console.log(`Recurring transaction created: $${recurringTransaction.amount} for ${recurringTransaction.category} ${data.frequency} (${data.type})`);

      // Build success message using MessageBuilder
      const message = this.messageBuilder.buildRecurringTransactionCreatedMessage(
        recurringTransaction,
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
          id: recurringTransaction.id,
          amount: recurringTransaction.amount,
          category: recurringTransaction.category,
          description: recurringTransaction.description,
          frequency: recurringTransaction.frequency,
          interval: recurringTransaction.interval,
          dayOfWeek: recurringTransaction.dayOfWeek,
          dayOfMonth: recurringTransaction.dayOfMonth,
          monthOfYear: recurringTransaction.monthOfYear,
          nextDue: recurringTransaction.nextDue.toISOString().split('T')[0],
          startDate: recurringTransaction.startDate.toISOString().split('T')[0],
          type: recurringTransaction.type as TransactionType
        },
        message,
        basicValidation.warnings.length > 0 ? basicValidation.warnings : undefined
      );
    } catch (error) {
      return this.baseOps.handleDatabaseError(error, 'creating the recurring transaction');
    }
  }

  /**
   * Build update data for recurring transaction with validation
   * Delegates to base class for basic fields, handles recurrence-specific fields
   */
  private buildRecurringTransactionUpdateData(
    updates: RecurringTransactionUpdateData,
    existingData: RecurringTransactionData
  ): { result?: RecurringTransactionResult; updateData?: any; warnings: string[]; needsRecalculation: boolean; originalCategory?: string } {
    const updateData: any = {};
    let needsRecalculation = false;

    // Use base class to handle basic fields validation (amount, category, description, type)
    const basicUpdateResult = this.baseOps.buildBasicUpdateData(updates, existingData, 'startDate');

    if (!basicUpdateResult.isValid) {
      return {
        result: failure(
          'Validation failed',
          'VALIDATION_ERROR',
          basicUpdateResult.validationErrors?.join('; '),
          basicUpdateResult.validationErrors
        ),
        warnings: [],
        needsRecalculation: false,
      };
    }

    // Merge basic update data
    Object.assign(updateData, basicUpdateResult.updateData);

    // Handle recurrence-specific fields (frequency, interval, dayOfWeek, dayOfMonth, monthOfYear)
    if (updates.frequency !== undefined || updates.interval !== undefined || 
        updates.dayOfWeek !== undefined || updates.dayOfMonth !== undefined ||
        updates.monthOfYear !== undefined) {
      
      needsRecalculation = true;
      
      // Build complete recurrence data for validation
      const frequency = updates.frequency || existingData.frequency;
      const interval = updates.interval !== undefined ? updates.interval : existingData.interval;
      const dayOfWeek = updates.dayOfWeek !== undefined ? updates.dayOfWeek : existingData.dayOfWeek;
      const dayOfMonth = updates.dayOfMonth !== undefined ? updates.dayOfMonth : existingData.dayOfMonth;
      const monthOfYear = updates.monthOfYear !== undefined ? updates.monthOfYear : existingData.monthOfYear;
      
      // Validate the new recurrence pattern (validator handles null conversion)
      const startDate = new Date(existingData.startDate);
      const finalType = (updates.type || existingData.type) as TransactionType;
      const mergedAmount = updates.amount !== undefined ? updates.amount : existingData.amount;
      
      const recurrenceValidation = this.validateRecurrencePattern(
        mergedAmount,
        frequency,
        startDate,
        finalType,
        interval,
        dayOfWeek,
        dayOfMonth,
        monthOfYear
      );

      if (!recurrenceValidation.isValid) {
        return {
          result: failure(
            'Validation failed',
            'VALIDATION_ERROR',
            recurrenceValidation.errors!.join('; '),
            recurrenceValidation.errors
          ),
          warnings: [],
          needsRecalculation: false,
        };
      }

      updateData.frequency = frequency;
      updateData.interval = interval !== null ? interval : undefined;
      updateData.dayOfWeek = dayOfWeek !== null ? dayOfWeek : undefined;
      updateData.dayOfMonth = dayOfMonth !== null ? dayOfMonth : undefined;
      updateData.monthOfYear = monthOfYear !== null ? monthOfYear : undefined;
      updateData.nextDue = recurrenceValidation.nextDue;
    }

    return {
      updateData,
      warnings: basicUpdateResult.warnings,
      needsRecalculation,
      originalCategory: basicUpdateResult.originalCategory,
    };
  }

  /**
   * Update an existing recurring transaction
   * @param id - Recurring transaction ID to update
   * @param updates - Partial recurring transaction data to update
   * @param existingData - The existing recurring transaction data (already validated for ownership)
   * @returns ServiceResult with updated recurring transaction
   */
  async updateRecurringTransaction(
    id: number,
    updates: RecurringTransactionUpdateData,
    existingData: RecurringTransactionData
  ): Promise<RecurringTransactionResult> {
    try {
      // Build and validate update data
      const buildResult = this.buildRecurringTransactionUpdateData(updates, existingData);
      
      if (buildResult.result) {
        return buildResult.result; // Validation error
      }

      const { updateData, warnings: validationWarnings, needsRecalculation } = buildResult;
      const finalType = (updates.type || existingData.type) as TransactionType;

      // Perform the update
      const updatedRecurringTransaction = await this.prisma.recurringTransaction.update({
        where: { id },
        data: updateData,
      });

      console.log(`Recurring transaction updated: ID ${id}, changes:`, updateData);

      // Build success message
      const message = `Recurring ${finalType} updated successfully: $${updatedRecurringTransaction.amount} for ${updatedRecurringTransaction.category}${needsRecalculation ? ' (schedule recalculated)' : ''}`;

      return success(
        {
          id: updatedRecurringTransaction.id,
          amount: updatedRecurringTransaction.amount,
          category: updatedRecurringTransaction.category,
          description: updatedRecurringTransaction.description,
          frequency: updatedRecurringTransaction.frequency,
          interval: updatedRecurringTransaction.interval,
          dayOfWeek: updatedRecurringTransaction.dayOfWeek,
          dayOfMonth: updatedRecurringTransaction.dayOfMonth,
          monthOfYear: updatedRecurringTransaction.monthOfYear,
          nextDue: updatedRecurringTransaction.nextDue.toISOString().split('T')[0],
          startDate: updatedRecurringTransaction.startDate.toISOString().split('T')[0],
          type: updatedRecurringTransaction.type as TransactionType,
        },
        message,
        validationWarnings.length > 0 ? validationWarnings : undefined
      );
    } catch (error) {
      return this.baseOps.handleDatabaseError(error, 'updating the recurring transaction');
    }
  }

  /**
   * Edit the last recurring transaction for the current user
   * High-level method that queries and updates in one call
   * @param updates - Fields to update
   * @param transactionType - Optional type filter (expense or income)
   * @returns ServiceResult with updated recurring transaction
   */
  async editLastRecurringTransaction(
    updates: RecurringTransactionUpdateData,
    transactionType?: TransactionType
  ): Promise<RecurringTransactionResult> {
    // Get userId from injected context
    const userIdObj: { userId?: string } = {};
    this.baseOps.injectUserId(userIdObj);
    const userId = userIdObj.userId || '';
    
    if (!userId) {
      return failure(
        'User context not available',
        'MISSING_CONTEXT',
        'Unable to identify user for recurring transaction lookup'
      );
    }

    // Query for last recurring transaction
    const lastRecurringTxResult = await this.queryService.getLastRecurringTransactionByUser(userId, transactionType);
    
    if (!lastRecurringTxResult.success) {
      return lastRecurringTxResult;
    }

    // Update the recurring transaction (passing existing data to avoid redundant query)
    return await this.updateRecurringTransaction(lastRecurringTxResult.data!.id, updates, lastRecurringTxResult.data!);
  }

  /**
   * Edit a specific recurring transaction by ID
   * @param id - Recurring transaction ID
   * @param updates - Fields to update
   * @returns ServiceResult with updated recurring transaction or error
   */
  async editRecurringTransactionById(
    id: number,
    updates: RecurringTransactionUpdateData
  ): Promise<RecurringTransactionResult> {
    // Get userId from injected context (same pattern as editLastRecurringTransaction)
    const userIdObj: { userId?: string } = {};
    this.baseOps.injectUserId(userIdObj);
    const userId = userIdObj.userId || '';
    
    if (!userId) {
      return failure(
        'User context not available',
        'MISSING_CONTEXT',
        'Unable to identify user for recurring transaction lookup'
      );
    }

    // Query for recurring transaction by ID with ownership validation
    const recurringTxResult = await this.queryService.getRecurringTransactionById(id, userId);
    
    if (!recurringTxResult.success) {
      return recurringTxResult;
    }

    // Update the recurring transaction (passing existing data to avoid redundant query)
    return await this.updateRecurringTransaction(id, updates, recurringTxResult.data!);
  }
}
