import { Expense, ExpenseResult, ExpenseData } from '../../types/models';
import { success } from '../../types/ServiceResult';
import { CategoryNormalizer } from '../../lib/CategoryNormalizer';
import { UserContextProvider } from '../../lib/UserContextProvider';
import { ExpenseValidator } from '../../validators/ExpenseValidator';
import { PrismaClientManager } from '../../lib/PrismaClientManager';
import { MessageBuilder } from '../../lib/MessageBuilder';
import { PrismaClient } from '../../generated/prisma';

export class ExpenseService {
  private prisma: PrismaClient;
  private categoryNormalizer: CategoryNormalizer;
  private userContext: UserContextProvider;
  private validator: ExpenseValidator;
  private messageBuilder: MessageBuilder;

  constructor(userContext?: UserContextProvider) {
    this.prisma = PrismaClientManager.getClient();
    this.categoryNormalizer = new CategoryNormalizer();
    this.userContext = userContext || new UserContextProvider();
    this.validator = new ExpenseValidator();
    this.messageBuilder = new MessageBuilder();
  }

  /**
   * Add a new expense
   */
  async addExpense(expenseData: Expense): Promise<ExpenseResult> {
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

    // Create expense directly with Prisma
    const expense = await this.prisma.expense.create({
      data: {
        userId: expenseData.userId,
        date: expenseData.date,
        amount: expenseData.amount,
        category: expenseData.category,
        description: expenseData.description,
      }
    });
    
    console.log(`Expense added: $${expense.amount} for ${expense.category} on ${expense.date}`);
    
    // Build success message using MessageBuilder
    const message = this.messageBuilder.buildExpenseCreatedMessage(
      expense,
      normalizationResult
    );

    // Build warnings if category was normalized
    const warnings: string[] = [];
    const categoryWarning = this.messageBuilder.buildCategoryNormalizationWarning(normalizationResult);
    if (categoryWarning) {
      warnings.push(categoryWarning);
    }
    
    // Return structured result using generic ServiceResult
    return success(
      {
        id: expense.id,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        date: expense.date.toISOString().split('T')[0]
      },
      message,
      warnings.length > 0 ? warnings : undefined
    );
  }
}