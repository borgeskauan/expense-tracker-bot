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
