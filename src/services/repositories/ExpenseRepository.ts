import { PrismaClient, Expense } from '../../generated/prisma';
import { DatabaseError } from '../../errors';
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
   * @throws DatabaseError if the operation fails
   */
  async create(data: CreateExpenseData): Promise<Expense> {
    try {
      return await this.prisma.expense.create({
        data: {
          userId: data.userId,
          date: data.date,
          amount: data.amount,
          category: data.category,
          description: data.description,
        },
      });
    } catch (error) {
      throw new DatabaseError(
        'Failed to create expense',
        error instanceof Error ? error : undefined,
        { operation: 'create', entity: 'expense', data }
      );
    }
  }
}
