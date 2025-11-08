import { ServiceResult } from './ServiceResult';
import { TransactionType } from '../config/transactionTypes';

export interface Transaction {
  userId: string;
  date?: Date | string; // Optional, defaults to today if not specified
  amount: number;
  category: string;
  description: string | null;
  type: TransactionType;
}

/**
 * Data structure for transaction returned in service results
 */
export interface TransactionData {
  id: number;
  amount: number;
  category: string;
  description: string | null;
  date: string; // ISO format for consistency
  type: TransactionType;
}

/**
 * Data structure for updating a transaction
 */
export interface TransactionUpdateData {
  amount?: number;
  category?: string;
  description?: string | null;
  date?: string;
  type?: TransactionType;
}

/**
 * Result type for transaction operations
 * Uses generic ServiceResult for consistency
 */
export type TransactionResult = ServiceResult<TransactionData>;

export interface RecurringTransactionInput {
  userId: string;
  amount: number;
  category: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number; // default: 1
  dayOfWeek?: number; // 0-6, for weekly
  dayOfMonth?: number; // 1-31, for monthly
  startDate: Date;
  type: TransactionType;
}

/**
 * Data structure for recurring transaction returned in service results
 */
export interface RecurringTransactionData {
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
  type: TransactionType;
}

/**
 * Data structure for updating a recurring transaction
 */
export interface RecurringTransactionUpdateData {
  amount?: number;
  category?: string;
  description?: string | null;
  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  type?: TransactionType;
}

/**
 * Result type for recurring transaction operations
 * Uses generic ServiceResult for consistency
 */
export type RecurringTransactionResult = ServiceResult<RecurringTransactionData>;

/**
 * Query result - generic key-value pairs from database
 */
export interface QueryResultData {
  [key: string]: any;
}

/**
 * Full query result with metadata
 */
export interface QueryResult {
  data: QueryResultData[];  // Raw database rows
  rowCount: number;         // Number of rows returned
  sqlExecuted: string;      // The SQL that was run (for AI context)
}

/**
 * Result type for query operations
 */
export type QueryResultServiceResult = ServiceResult<QueryResult>;
