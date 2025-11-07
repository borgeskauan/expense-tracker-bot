import { ServiceResult } from './ServiceResult';

export interface Expense {
  userId: string;
  date?: Date | string; // Optional, defaults to today if not specified
  amount: number;
  category: string;
  description: string | null;
}

/**
 * Data structure for expense returned in service results
 */
export interface ExpenseData {
  id: number;
  amount: number;
  category: string;
  description: string | null;
  date: string; // ISO format for consistency
}

/**
 * Result type for expense operations
 * Uses generic ServiceResult for consistency
 */
export type ExpenseResult = ServiceResult<ExpenseData>;

export interface RecurringExpenseInput {
  userId: string;
  amount: number;
  category: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number; // default: 1
  dayOfWeek?: number; // 0-6, for weekly
  dayOfMonth?: number; // 1-31, for monthly
  startDate: Date;
}

/**
 * Data structure for recurring expense returned in service results
 */
export interface RecurringExpenseData {
  id: number;
  amount: number;
  category: string;
  description: string | null;
  frequency: string;
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  nextDue: string; // ISO date
  startDate: string; // ISO date
}

/**
 * Result type for recurring expense operations
 * Uses generic ServiceResult for consistency
 */
export type RecurringExpenseResult = ServiceResult<RecurringExpenseData>;
