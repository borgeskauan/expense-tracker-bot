import { Expense, ExpenseResult, ExpenseData } from '../../types/models';
import { success, failure } from '../../types/ServiceResult';
import { UserContextProvider } from '../../lib/UserContextProvider';
import { BaseExpenseOperations } from '../../lib/BaseExpenseOperations';
import { PrismaClient } from '../../generated/prisma';
import { MessageBuilder } from '../../lib/MessageBuilder';
import { PrismaClientManager } from '../../lib/PrismaClientManager';

export class ExpenseService {
  private baseOps: BaseExpenseOperations;
  private prisma: PrismaClient;
  private messageBuilder: MessageBuilder;

  constructor(userContext?: UserContextProvider) {
    this.baseOps = new BaseExpenseOperations(userContext);
    this.prisma = PrismaClientManager.getClient();
    this.messageBuilder = new MessageBuilder();
  }

  /**
   * Add a new expense
   */
  async addExpense(expenseData: Expense): Promise<ExpenseResult> {
    // Inject user ID using base operations
    this.baseOps.injectUserId(expenseData);
    
    // Store original category before normalization
    const originalCategory = expenseData.category;
    
    // Validate basic expense data (amount, date, category) using shared pipeline
    const validationResult = this.baseOps.validateBasicExpenseData(
      expenseData.amount,
      expenseData.category,
      expenseData.date
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
    expenseData.category = validationResult.normalizedCategory;
    const normalizedDate = validationResult.normalizedDate;

    try {
      // Create expense directly with Prisma
      const expense = await this.prisma.expense.create({
        data: {
          userId: expenseData.userId,
          date: normalizedDate,
          amount: expenseData.amount,
          category: expenseData.category,
          description: expenseData.description,
        }
      });
    
      console.log(`Expense added: $${expense.amount} for ${expense.category} on ${expense.date}`);
      
      // Build success message using MessageBuilder
      const message = this.messageBuilder.buildExpenseCreatedMessage(
        expense,
        { 
          category: validationResult.normalizedCategory, 
          wasNormalized: validationResult.warnings.length > 0,
          originalCategory: validationResult.warnings.length > 0 ? originalCategory : undefined
        }
      );

      // Return structured result with warnings from validation
      return success(
        {
          id: expense.id,
          amount: expense.amount,
          category: expense.category,
          description: expense.description,
          date: expense.date.toISOString().split('T')[0]
        },
        message,
        validationResult.warnings.length > 0 ? validationResult.warnings : undefined
      );
    } catch (error) {
      return this.baseOps.handleDatabaseError(error, 'adding the expense');
    }
  }
}