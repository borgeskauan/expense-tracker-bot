/**
 * Transaction types
 * Defines whether a transaction is an expense (money out) or income (money in)
 */
export const TRANSACTION_TYPES = ['expense', 'income'] as const;

/**
 * Transaction type derived from the transaction types array
 */
export type TransactionType = typeof TRANSACTION_TYPES[number];

/**
 * Transaction type enum-like constants for type-safe usage
 */
export const TransactionType = {
  EXPENSE: 'expense' as TransactionType,
  INCOME: 'income' as TransactionType,
} as const;

/**
 * Check if a transaction type is valid
 */
export function isValidTransactionType(type: string): type is TransactionType {
  return TRANSACTION_TYPES.includes(type as TransactionType);
}