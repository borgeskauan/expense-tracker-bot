import { PrismaClient } from '../generated/prisma';
import { Expense, ExpenseResult } from '../types/models';
import { findClosestCategory, isValidCategory } from '../config/categories';

export class ExpenseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Add a new expense
   */
  async addExpense(expenseData: Expense): Promise<ExpenseResult> {
    try {
      expenseData.userId = '1'; // TODO: Move this out of here.
      expenseData.date = new Date(expenseData.date);

      // Validate and normalize category
      let categoryWasNormalized = false;
      const originalCategory = expenseData.category;
      
      if (!isValidCategory(expenseData.category)) {
        const closestCategory = findClosestCategory(expenseData.category);
        console.log(`Category "${expenseData.category}" not found. Using closest match: "${closestCategory}"`);
        expenseData.category = closestCategory;
        categoryWasNormalized = true;
      }

      const expense = await this.prisma.expense.create({
        data: {
          ...expenseData
        },
      });
      
      console.log(`Expense added: $${expense.amount} for ${expense.category} on ${expense.date}`);
      
      // Build success message
      let message = `Expense added successfully: $${expense.amount} in category "${expense.category}"`;
      if (categoryWasNormalized) {
        message += ` (categorized from "${originalCategory}")`;
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
      throw new Error('Failed to add expense');
    }
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}