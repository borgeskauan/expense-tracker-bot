import { PrismaClient } from '../generated/prisma';
import { RecurringExpenseInput, RecurringExpenseResult } from '../types/models';
import { findClosestCategory, isValidCategory } from '../config/categories';
import { 
  isValidFrequency, 
  isValidDayOfWeek, 
  isValidDayOfMonth,
  calculateNextDueDate,
  getFrequencyDescription,
  Frequency
} from '../config/frequencies';

export class RecurringExpenseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new recurring expense
   */
  async createRecurringExpense(data: RecurringExpenseInput): Promise<RecurringExpenseResult> {
    try {
      // Validate amount
      if (data.amount <= 0) {
        throw new Error('Amount must be positive');
      }

      // Validate and normalize category
      let categoryWasNormalized = false;
      const originalCategory = data.category;
      
      if (!isValidCategory(data.category)) {
        const closestCategory = findClosestCategory(data.category);
        console.log(`Category "${data.category}" not found. Using closest match: "${closestCategory}"`);
        data.category = closestCategory;
        categoryWasNormalized = true;
      }

      // Validate frequency
      if (!isValidFrequency(data.frequency)) {
        throw new Error(`Invalid frequency. Must be one of: daily, weekly, monthly, yearly`);
      }

      // Validate interval
      const interval = data.interval || 1;
      if (interval < 1) {
        throw new Error('Interval must be at least 1');
      }

      // Validate frequency-specific fields
      if (data.frequency === 'weekly') {
        if (data.dayOfWeek === undefined) {
          throw new Error('dayOfWeek is required for weekly frequency');
        }
        if (!isValidDayOfWeek(data.dayOfWeek)) {
          throw new Error('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)');
        }
      }

      if (data.frequency === 'monthly') {
        if (data.dayOfMonth === undefined) {
          throw new Error('dayOfMonth is required for monthly frequency');
        }
        if (!isValidDayOfMonth(data.dayOfMonth)) {
          throw new Error('dayOfMonth must be between 1 and 31');
        }
      }

      // Calculate next due date
      const nextDue = calculateNextDueDate(
        data.startDate,
        data.frequency as Frequency,
        interval,
        data.dayOfWeek,
        data.dayOfMonth
      );

      // Create database record
      const recurringExpense = await this.prisma.recurringExpense.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          category: data.category,
          description: data.description || null,
          frequency: data.frequency,
          interval: interval,
          dayOfWeek: data.dayOfWeek ?? null,
          dayOfMonth: data.dayOfMonth ?? null,
          startDate: data.startDate,
          nextDue: nextDue,
          isActive: true,
        },
      });

      console.log(`Recurring expense created: $${recurringExpense.amount} for ${recurringExpense.category} ${data.frequency}`);

      // Build success message
      const frequencyDesc = getFrequencyDescription(
        data.frequency as Frequency,
        interval,
        data.dayOfWeek,
        data.dayOfMonth
      );

      let message = `Recurring expense created: $${recurringExpense.amount} for ${recurringExpense.category}`;
      
      if (categoryWasNormalized) {
        message += ` (categorized from "${originalCategory}")`;
      }
      
      if (recurringExpense.description) {
        message += ` - ${recurringExpense.description}`;
      }
      
      message += ` ${frequencyDesc}, starting ${recurringExpense.startDate.toISOString().split('T')[0]}`;

      // Return structured result
      return {
        success: true,
        message: message,
        recurringExpense: {
          id: recurringExpense.id,
          amount: recurringExpense.amount,
          category: recurringExpense.category,
          description: recurringExpense.description,
          frequency: recurringExpense.frequency,
          interval: recurringExpense.interval,
          dayOfWeek: recurringExpense.dayOfWeek,
          dayOfMonth: recurringExpense.dayOfMonth,
          nextDue: recurringExpense.nextDue.toISOString().split('T')[0],
          startDate: recurringExpense.startDate.toISOString().split('T')[0]
        }
      };
    } catch (error) {
      console.error('Error creating recurring expense:', error);
      throw error instanceof Error ? error : new Error('Failed to create recurring expense');
    }
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
