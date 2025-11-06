import { PrismaClient } from '../generated/prisma';
import { Expense, ExpenseResult } from '../types/models';
import { CategoryNormalizer } from './common/CategoryNormalizer';
import { PrismaClientManager } from './common/PrismaClientManager';
import { UserContextProvider } from './common/UserContextProvider';
import { ExpenseValidator } from './validators/ExpenseValidator';

export class ExpenseService {
  private prisma: PrismaClient;
  private categoryNormalizer: CategoryNormalizer;
  private userContext: UserContextProvider;
  private validator: ExpenseValidator;

  constructor(userContext?: UserContextProvider) {
    this.prisma = PrismaClientManager.getClient();
    this.categoryNormalizer = new CategoryNormalizer();
    this.userContext = userContext || new UserContextProvider();
    this.validator = new ExpenseValidator();
  }

  /**
   * Add a new expense
   */
  async addExpense(expenseData: Expense): Promise<ExpenseResult> {
    try {
      expenseData.userId = this.userContext.getUserId();
      
      // Normalize and validate date
      expenseData.date = this.validator.normalizeDate(expenseData.date);

      // Validate amount and date
      const validationResult = this.validator.validate(expenseData.amount, expenseData.date);
      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join('; '));
      }

      // Validate and normalize category using composition
      const normalizationResult = this.categoryNormalizer.normalize(expenseData.category);
      expenseData.category = normalizationResult.category;

      const expense = await this.prisma.expense.create({
        data: {
          ...expenseData
        },
      });
      
      console.log(`Expense added: $${expense.amount} for ${expense.category} on ${expense.date}`);
      
      // Build success message
      let message = `Expense added successfully: $${expense.amount} in category "${expense.category}"`;
      if (normalizationResult.wasNormalized) {
        message += ` (categorized from "${normalizationResult.originalCategory}")`;
      }
      if (expense.description) {
        message += ` - ${expense.description}`;
      }
      message += ` on ${expense.date.toISOString().split('T')[0]}`;
      
      // Return structured result
      return {
        success: true,
        message: message,
        expense: {
          id: expense.id,
          amount: expense.amount,
          category: expense.category,
          description: expense.description,
          date: expense.date.toISOString().split('T')[0]
        }
      };
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error instanceof Error ? error : new Error('Failed to add expense');
    }
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await PrismaClientManager.disconnect();
  }
}