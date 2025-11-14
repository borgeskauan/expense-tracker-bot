/**
 * Default expense categories
 * These are the standard categories available for expense transactions
 */
export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Personal Care',
  'Travel',
  'Education',
  'Groceries',
  'Housing',
  'Insurance',
  'Savings & Investments',
  'Gifts & Donations',
  'Fitness & Sports',
  'Pet Care',
  'Childcare',
  'Home Maintenance',
  'Car Maintenance',
  'Subscriptions',
  'Taxes',
  'Legal & Professional',
  'Charity',
  'Other'
] as const;

/**
 * Category type derived from the expense categories
 */
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

/**
 * Check if a category is valid expense category
 */
export function isValidExpenseCategory(category: string): boolean {
  return EXPENSE_CATEGORIES.includes(category as ExpenseCategory);
}

/**
 * Get expense category description for AI context
 */
export function getExpenseCategoryDescription(): string {
  return `Available expense categories: ${EXPENSE_CATEGORIES.join(', ')}. Choose the most appropriate category based on the expense type.`;
}
