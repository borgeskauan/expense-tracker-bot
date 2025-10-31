export interface Expense {
  userId: string;
  date: Date;
  amount: number;
  category: string;
  description: string | null;
}

export interface ExpenseResult {
  success: boolean;
  message: string;
  expense: {
    id: number;
    amount: number;
    category: string;
    description: string | null;
    date: string; // ISO format for consistency
  };
}

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

export interface RecurringExpenseResult {
  success: boolean;
  message: string;
  recurringExpense: {
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
  };
}
