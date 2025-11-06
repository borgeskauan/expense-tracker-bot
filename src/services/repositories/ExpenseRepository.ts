import { PrismaClient, Expense } from '../../generated/prisma';
import { PrismaClientManager } from '../common/PrismaClientManager';

/**
 * Data for creating a new expense
 */
export interface CreateExpenseData {
  userId: string;
  date: Date;
  amount: number;
  category: string;
  description: string | null;
}

/**
 * Criteria for finding expenses
 */
export interface FindExpenseCriteria {
  userId?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Repository for Expense database operations
 * Encapsulates all data access logic for expenses
 */
export class ExpenseRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = PrismaClientManager.getClient();
  }

  /**
   * Create a new expense
   * 
   * @param data - Expense data to create
   * @returns The created expense
   */
  async create(data: CreateExpenseData): Promise<Expense> {
    return await this.prisma.expense.create({
      data: {
        userId: data.userId,
        date: data.date,
        amount: data.amount,
        category: data.category,
        description: data.description,
      },
    });
  }
}
