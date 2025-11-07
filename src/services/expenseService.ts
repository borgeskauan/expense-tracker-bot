import { Expense, ExpenseResult, ExpenseData } from '../types/models';
import { success } from '../types/ServiceResult';
import { CategoryNormalizer } from './common/CategoryNormalizer';
import { UserContextProvider } from './common/UserContextProvider';
import { ExpenseValidator } from './validators/ExpenseValidator';
import { ExpenseRepository } from './repositories/ExpenseRepository';
import { MessageBuilder } from './common/MessageBuilder';
import { ErrorMapper } from './common/ErrorMapper';

export class ExpenseService {
  private repository: ExpenseRepository;
  private categoryNormalizer: CategoryNormalizer;
  private userContext: UserContextProvider;
  private validator: ExpenseValidator;
  private messageBuilder: MessageBuilder;

  constructor(userContext?: UserContextProvider) {
    this.repository = new ExpenseRepository();
    this.categoryNormalizer = new CategoryNormalizer();
    this.userContext = userContext || new UserContextProvider();
    this.validator = new ExpenseValidator();
    this.messageBuilder = new MessageBuilder();
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

      // Create expense using repository
      const expense = await this.repository.create({
        userId: expenseData.userId,
        date: expenseData.date,
        amount: expenseData.amount,
        category: expenseData.category,
        description: expenseData.description,
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
    } catch (error) {
      console.error('Error adding expense:', error);
      return ErrorMapper.toServiceResult<ExpenseData>(error);
    }
  }
}