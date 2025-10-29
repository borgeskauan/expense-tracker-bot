import { PrismaClient } from '../generated/prisma';
import { Expense } from '../types/models';

export class ExpenseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Add a new expense
   */
  async addExpense(expenseData: Expense): Promise<Expense> {
    try {
      expenseData.userId = '1'; // TODO: Move this out of here.
      expenseData.date = new Date(expenseData.date);

      const expense = await this.prisma.expense.create({
        data: {
          ...expenseData
        },
      });
      return expense;
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