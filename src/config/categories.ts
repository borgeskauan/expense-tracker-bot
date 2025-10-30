/**
 * Default expense categories
 * These are the standard categories available to all users
 */
export const DEFAULT_CATEGORIES = [
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
  'Other'
] as const;

/**
 * Category type derived from the default categories
 */
export type ExpenseCategory = typeof DEFAULT_CATEGORIES[number];

/**
 * Get all available categories
 */
export function getAvailableCategories(): string[] {
  return [...DEFAULT_CATEGORIES];
}

/**
 * Check if a category is valid
 */
export function isValidCategory(category: string): boolean {
  return DEFAULT_CATEGORIES.includes(category as ExpenseCategory);
}

export function findClosestCategory(input: string): string {
  return 'Other';
}

/**
 * Get category description for AI context
 */
export function getCategoryDescription(): string {
  return `Available expense categories: ${DEFAULT_CATEGORIES.join(', ')}. Choose the most appropriate category based on the expense type.`;
}
