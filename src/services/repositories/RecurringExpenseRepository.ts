import { PrismaClient, RecurringExpense } from '../../generated/prisma';
import { DatabaseError } from '../../errors';
import { PrismaClientManager } from '../common/PrismaClientManager';

/**
 * Data for creating a new recurring expense
 */
export interface CreateRecurringExpenseData {
  userId: string;
  amount: number;
  category: string;
  description: string | null;
  frequency: string;
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  startDate: Date;
  nextDue: Date;
  isActive: boolean;
}

/**
 * Data for updating a recurring expense
 */
export interface UpdateRecurringExpenseData {
  amount?: number;
  category?: string;
  description?: string | null;
  frequency?: string;
  interval?: number;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  nextDue?: Date;
  isActive?: boolean;
}

/**
 * Criteria for finding recurring expenses
 */
export interface FindRecurringExpenseCriteria {
  userId?: string;
  category?: string;
  isActive?: boolean;
  frequency?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

/**
 * Repository for RecurringExpense database operations
 * Encapsulates all data access logic for recurring expenses
 */
export class RecurringExpenseRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = PrismaClientManager.getClient();
  }

  /**
   * Create a new recurring expense
   * 
   * @param data - Recurring expense data to create
   * @returns The created recurring expense
   * @throws DatabaseError if the operation fails
   */
  async create(data: CreateRecurringExpenseData): Promise<RecurringExpense> {
    try {
      return await this.prisma.recurringExpense.create({
        data,
      });
    } catch (error) {
      throw new DatabaseError(
        'Failed to create recurring expense',
        error instanceof Error ? error : undefined,
        { operation: 'create', entity: 'recurringExpense', data }
      );
    }
  }
}
