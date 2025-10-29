export interface Expense {
  userId: string;
  date: Date;
  amount: number;
  category: string;
  description: string | null;
}