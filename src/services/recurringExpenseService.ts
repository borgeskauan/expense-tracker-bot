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
      data.userId = '1'; // TODO: Move this out of here.

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

      // Apply defaults for startDate
      const startDate = data.startDate || new Date();
      if (!data.startDate) {
        console.log('startDate not provided, defaulting to today');
      }

      // Validate and apply defaults for frequency-related fields
      const frequencyData = this.validateFrequency(data, startDate);

      // Calculate next due date
      const nextDue = calculateNextDueDate(
        startDate,
        frequencyData.frequency,
        frequencyData.interval,
        frequencyData.dayOfWeek,
        frequencyData.dayOfMonth
      );

      // Create database record
      const recurringExpense = await this.prisma.recurringExpense.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          category: data.category,
          description: data.description || null,
          frequency: frequencyData.frequency,
          interval: frequencyData.interval,
          dayOfWeek: frequencyData.dayOfWeek ?? null,
          dayOfMonth: frequencyData.dayOfMonth ?? null,
          startDate: startDate,
          nextDue: nextDue,
          isActive: true,
        },
      });

      console.log(`Recurring expense created: $${recurringExpense.amount} for ${recurringExpense.category} ${data.frequency}`);

      // Build success message
      const frequencyDesc = getFrequencyDescription(
        frequencyData.frequency,
        frequencyData.interval,
        frequencyData.dayOfWeek,
        frequencyData.dayOfMonth
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
   * Validate frequency and apply defaults for frequency-related fields
   * Returns a pure object with validated values without mutating the input
   */
  private validateFrequency(
    data: RecurringExpenseInput, 
    startDate: Date
  ): {
    frequency: Frequency;
    interval: number;
    dayOfWeek?: number;
    dayOfMonth?: number;
  } {
    if (!isValidFrequency(data.frequency)) {
      throw new Error(`Invalid frequency. Must be one of: daily, weekly, monthly, yearly`);
    }

    // Validate interval
    const interval = data.interval || 1;
    if (interval < 1) {
      throw new Error('Interval must be at least 1');
    }

    let dayOfWeek: number | undefined = data.dayOfWeek;
    let dayOfMonth: number | undefined = data.dayOfMonth;

    // Validate frequency-specific fields
    if (data.frequency === 'weekly') {
      // Default dayOfWeek to the day of week of startDate if not provided
      if (dayOfWeek === undefined) {
        dayOfWeek = startDate.getDay(); // 0-6 (Sunday-Saturday)
        console.log(`dayOfWeek not provided for weekly frequency, defaulting to ${dayOfWeek} (${startDate.toLocaleDateString('en-US', { weekday: 'long' })})`);
      }
      if (!isValidDayOfWeek(dayOfWeek)) {
        throw new Error('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)');
      }
    }

    if (data.frequency === 'monthly') {
      // Default dayOfMonth to the day of month of startDate if not provided
      if (dayOfMonth === undefined) {
        dayOfMonth = startDate.getDate(); // 1-31
        console.log(`dayOfMonth not provided for monthly frequency, defaulting to ${dayOfMonth}`);
      }
      if (!isValidDayOfMonth(dayOfMonth)) {
        throw new Error('dayOfMonth must be between 1 and 31');
      }
    }

    return {
      frequency: data.frequency as Frequency,
      interval,
      dayOfWeek,
      dayOfMonth,
    };
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
