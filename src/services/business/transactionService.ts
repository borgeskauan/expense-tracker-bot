import { Transaction, TransactionResult, TransactionData } from '../../types/models';
import { success, failure } from '../../types/ServiceResult';
import { UserContextProvider } from '../../lib/UserContextProvider';
import { BaseTransactionOperations } from '../../lib/BaseTransactionOperations';
import { PrismaClient } from '../../generated/prisma';
import { MessageBuilder } from '../../lib/MessageBuilder';
import { PrismaClientManager } from '../../lib/PrismaClientManager';
import { TransactionType } from '../../config/transactionTypes';

export class TransactionService {
  private baseOps: BaseTransactionOperations;
  private prisma: PrismaClient;
  private messageBuilder: MessageBuilder;

  constructor(userContext?: UserContextProvider) {
    this.baseOps = new BaseTransactionOperations(userContext);
    this.prisma = PrismaClientManager.getClient();
    this.messageBuilder = new MessageBuilder();
  }

  /**
   * Add a new transaction
   */
  async addTransaction(transactionData: Transaction): Promise<TransactionResult> {
    // Inject user ID using base operations
    this.baseOps.injectUserId(transactionData);
    
    // Store original category before normalization
    const originalCategory = transactionData.category;
    
    // Validate basic transaction data (amount, date, category, type) using shared pipeline
    const validationResult = this.baseOps.validateBasicTransactionData(
      transactionData.amount,
      transactionData.category,
      transactionData.type,
      transactionData.date
    );
    
    if (!validationResult.isValid) {
      return failure(
        'Validation failed',
        'VALIDATION_ERROR',
        validationResult.validationErrors?.join('; '),
        validationResult.validationErrors
      );
    }

    // Use validated and normalized data
    transactionData.category = validationResult.normalizedCategory;
    const normalizedDate = validationResult.normalizedDate;

    try {
      // Create transaction directly with Prisma
      const transaction = await this.prisma.transaction.create({
        data: {
          userId: transactionData.userId,
          date: normalizedDate,
          amount: transactionData.amount,
          category: transactionData.category,
          description: transactionData.description,
          type: transactionData.type,
        }
      });
    
      console.log(`Transaction added: $${transaction.amount} for ${transaction.category} on ${transaction.date} (${transaction.type})`);
      
      // Build success message using MessageBuilder
      const message = this.messageBuilder.buildTransactionCreatedMessage(
        transaction,
        { 
          category: validationResult.normalizedCategory, 
          wasNormalized: validationResult.warnings.length > 0,
          originalCategory: validationResult.warnings.length > 0 ? originalCategory : undefined
        }
      );

      // Return structured result with warnings from validation
      return success(
        {
          id: transaction.id,
          amount: transaction.amount,
          category: transaction.category,
          description: transaction.description,
          date: transaction.date.toISOString().split('T')[0],
          type: transaction.type as TransactionType
        },
        message,
        validationResult.warnings.length > 0 ? validationResult.warnings : undefined
      );
    } catch (error) {
      return this.baseOps.handleDatabaseError(error, 'adding the transaction');
    }
  }
}
