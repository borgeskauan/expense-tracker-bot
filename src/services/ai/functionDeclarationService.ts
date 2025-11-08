import { Type } from "@google/genai";
import { Transaction, RecurringTransactionInput, TransactionUpdateData, RecurringTransactionUpdateData } from "../../types/models";
import { TransactionService } from "../business/transactionService";
import { RecurringTransactionService } from "../business/recurringTransactionService";
import { QueryExecutorService } from "../business/queryExecutorService";
import { FREQUENCIES } from "../../config/frequencies";
import { TRANSACTION_TYPES, TransactionType } from "../../config/transactionTypes";

// Update property definitions for editing
const createTransactionUpdateProperties = () => ({
  amount: {
    type: Type.NUMBER,
    description: "New amount (optional, only if user wants to change it). Must be positive.",
  },
  category: {
    type: Type.STRING,
    description: "New category (optional). If changing type, ensure category matches the new type (expense or income categories).",
  },
  description: {
    type: Type.STRING,
    description: "New description (optional). Can be empty string to remove description.",
  },
  date: {
    type: Type.STRING,
    description: "New date in ISO format YYYY-MM-DD (optional).",
  },
  type: {
    type: Type.STRING,
    description: "Change transaction type (optional, used rarely). If changed from expense to income or vice versa, the category must be valid for the new type.",
    enum: [...TRANSACTION_TYPES],
  },
});

const createRecurringTransactionUpdateProperties = () => ({
  amount: {
    type: Type.NUMBER,
    description: "New amount (optional). Must be positive.",
  },
  category: {
    type: Type.STRING,
    description: "New category (optional). If changing type, ensure category matches the new type (expense or income categories).",
  },
  description: {
    type: Type.STRING,
    description: "New description (optional). Can be empty string to remove description.",
  },
  frequency: {
    type: Type.STRING,
    description: "New frequency (optional). Changing this will recalculate the next due date.",
    enum: FREQUENCIES,
  },
  interval: {
    type: Type.NUMBER,
    description: "New interval (optional, e.g., 2 for 'every 2 weeks'). Must be at least 1. Changing this will recalculate the next due date.",
  },
  dayOfWeek: {
    type: Type.NUMBER,
    description: "For weekly frequency: Day of the week (0=Sunday through 6=Saturday). Changing this will recalculate the next due date.",
  },
  dayOfMonth: {
    type: Type.NUMBER,
    description: "For monthly frequency: Day of the month (1-31). Changing this will recalculate the next due date.",
  },
  monthOfYear: {
    type: Type.NUMBER,
    description: "For yearly frequency: Month of the year (0=January through 11=December). Changing this will recalculate the next due date.",
  },
  type: {
    type: Type.STRING,
    description: "Change transaction type (optional, used rarely). If changed from expense to income or vice versa, the category must be valid for the new type.",
    enum: [...TRANSACTION_TYPES],
  },
});

// Function declarations
const getCurrentDateDeclaration = {
  name: "getCurrentDate",
  parameters: {
    type: Type.OBJECT,
    description: "Get the current date and time information. Use this when you need to confirm today's date or calculate relative dates like 'yesterday' or 'last week'.",
    properties: {},
  },
};

const transactionDeclaration = {
  name: "addTransaction",
  parameters: {
    type: Type.OBJECT,
    description: "Add a new transaction (expense or income) for a user. This function returns a structured result with a 'success' field. On success (success=true), it includes a formatted message and transaction details. On failure (success=false), it includes validation errors in the 'error' object with 'validationErrors' array. IMPORTANT: Always check the 'success' field and handle both cases. If validation fails, explain the errors to the user in a friendly way and ask for the missing or corrected information.",
    properties: {
      transactionData: {
        type: Type.OBJECT,
        description: "The transaction data to add",
        properties: {
          date: {
            type: Type.STRING,
            description: "The date of the transaction in ISO format (YYYY-MM-DD). For relative dates like 'today', 'yesterday', 'last Monday', calculate the actual date. You can call getCurrentDate() if you need to confirm today's date. Defaults to today if not specified.",
          },
          amount: {
            type: Type.NUMBER,
            description: "The amount of the transaction, must be positive",
          },
          category: {
            type: Type.STRING,
            description: "The category for the transaction. Choose from the appropriate list based on the type (expense or income). If user mentions an unclear category or doesn't mention it at all, choose the closest match from the list.",
          },
          description: {
            type: Type.STRING,
            description: "Optional description of the transaction",
          },
          type: {
            type: Type.STRING,
            description: "The transaction type: 'expense' for money spent or 'income' for money received",
            enum: [...TRANSACTION_TYPES],
          },
        },
        required: ["date", "amount", "category", "type"],
      },
    },
    required: ["transactionData"],
  },
};

const recurringTransactionDeclaration = {
  name: "createRecurringTransaction",
  parameters: {
    type: Type.OBJECT,
    description: "Create a new recurring transaction (expense or income) that repeats on a regular schedule (daily, weekly, monthly, or yearly). This function returns a structured result with a 'success' field. On success (success=true), it includes a formatted message and recurring transaction details including when the next transaction is due. On failure (success=false), it includes validation errors in the 'error' object with 'validationErrors' array. IMPORTANT: Always check the 'success' field and handle both cases. If validation fails, explain the errors to the user in a friendly way and ask for the missing or corrected information.",
    properties: {
      recurringTransactionData: {
        type: Type.OBJECT,
        description: "The recurring transaction data to add",
        properties: {
          amount: {
            type: Type.NUMBER,
            description: "The amount of the transaction, must be positive",
          },
          category: {
            type: Type.STRING,
            description: "The category for the transaction. Choose from the appropriate list based on the type (expense or income). If user mentions an unclear category, choose the closest match from the list.",
          },
          description: {
            type: Type.STRING,
            description: "Optional description of the transaction",
          },
          frequency: {
            type: Type.STRING,
            description: "How often the transaction recurs",
            enum: FREQUENCIES,
          },
          interval: {
            type: Type.NUMBER,
            description: "The interval for the frequency (e.g., 2 for 'every 2 weeks'). Defaults to 1 if not specified. Must be at least 1.",
          },
          dayOfWeek: {
            type: Type.NUMBER,
            description: "For weekly frequency only: The day of the week (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday). Required for weekly frequency. Defaults to the day of the week of the startDate if not specified.",
          },
          dayOfMonth: {
            type: Type.NUMBER,
            description: "For monthly frequency only: The day of the month (1-31). Required for monthly frequency. Defaults to the day of the month of the startDate if not specified.",
          },
          monthOfYear: {
            type: Type.NUMBER,
            description: "For yearly frequency only: The month of the year (0=January, 1=February, ..., 11=December). Required for yearly frequency. Defaults to the month of the startDate if not specified.",
          },
          startDate: {
            type: Type.STRING,
            description: "The date when the recurring transaction starts in ISO format (YYYY-MM-DD). For relative dates like 'today', 'next Monday', calculate the actual date. You can call getCurrentDate() if needed. Defaults to today if not specified.",
          },
          type: {
            type: Type.STRING,
            description: "The transaction type: 'expense' for recurring expenses or 'income' for recurring income",
            enum: [...TRANSACTION_TYPES],
          },
        },
        required: ["amount", "category", "frequency", "type"],
      },
    },
    required: ["recurringTransactionData"],
  },
};

const editLastTransactionDeclaration = {
  name: "editLastTransaction",
  parameters: {
    type: Type.OBJECT,
    description: "Edit the most recently added transaction (expense or income). Use this when user wants to modify their last transaction - change amount, category, description, date, or type. This function returns a structured result with a 'success' field. On success (success=true), it includes updated transaction details with a message highlighting what changed. On failure (success=false), it includes validation errors. IMPORTANT: Always check the 'success' field. If no transactions exist, inform the user they need to add one first.",
    properties: {
      updates: {
        type: Type.OBJECT,
        description: "Fields to update - only include the fields the user wants to change",
        properties: createTransactionUpdateProperties(),
      },
      transactionType: {
        type: Type.STRING,
        description: "Optional filter to specify whether to edit last expense or last income. Use when user explicitly says 'edit last expense' or 'edit last income'. If not specified, edits the most recent transaction of any type.",
        enum: [...TRANSACTION_TYPES],
      },
    },
    required: ["updates"],
  },
};

const editLastRecurringTransactionDeclaration = {
  name: "editLastRecurringTransaction",
  parameters: {
    type: Type.OBJECT,
    description: "Edit the most recently added recurring transaction (expense or income). Use this when user wants to modify their last recurring/subscription transaction - change amount, category, description, frequency, interval, or type. This function returns a structured result with a 'success' field. On success (success=true), it includes updated recurring transaction details. On failure (success=false), it includes validation errors. IMPORTANT: Always check the 'success' field. If no recurring transactions exist, inform the user they need to create one first.",
    properties: {
      updates: {
        type: Type.OBJECT,
        description: "Fields to update - only include the fields the user wants to change",
        properties: createRecurringTransactionUpdateProperties(),
      },
      transactionType: {
        type: Type.STRING,
        description: "Optional filter to specify whether to edit last recurring expense or last recurring income. Use when user explicitly says 'edit last recurring expense' or 'edit last recurring income'. If not specified, edits the most recent recurring transaction of any type.",
        enum: [...TRANSACTION_TYPES],
      },
    },
    required: ["updates"],
  },
};

const editTransactionByIdDeclaration = {
  name: "editTransactionById",
  parameters: {
    type: Type.OBJECT,
    description: `Edit a specific transaction by its ID. Use this when the user wants to edit a transaction they previously identified via queryTransactions.
    
    WORKFLOW:
    1. User asks to edit a specific transaction (e.g., "Edit that $50 coffee expense")
    2. Use queryTransactions to find matching transactions (including 'id' column in SELECT)
    3. Present the matches to the user with their IDs clearly visible
    4. Once user confirms which transaction to edit, call this function with the ID and updates
    
    This function returns a structured result with a 'success' field.
    
    On SUCCESS (success=true):
    - Returns updated transaction data (id, amount, category, description, date, type)
    - Returns human-readable message confirming the changes
    - May include warnings if category was normalized
    
    On FAILURE (success=false):
    - Returns error message (e.g., "Transaction not found", "Validation failed")
    - For validation errors, returns details about what went wrong
    - If transaction not found, user may not have access or it doesn't exist`,
    properties: {
      id: {
        type: Type.NUMBER,
        description: "The ID of the transaction to edit (obtained from queryTransactions results)",
      },
      updates: {
        type: Type.OBJECT,
        description: "Fields to update in the transaction - only include the fields the user wants to change",
        properties: {
          amount: {
            type: Type.NUMBER,
            description: "New transaction amount (optional)",
          },
          category: {
            type: Type.STRING,
            description: "New category (optional). Will be normalized to valid category for the transaction type.",
          },
          description: {
            type: Type.STRING,
            description: "New description (optional)",
          },
          date: {
            type: Type.STRING,
            description: "New date in YYYY-MM-DD format (optional)",
          },
        },
      },
    },
    required: ["id", "updates"],
  },
};

const editRecurringTransactionByIdDeclaration = {
  name: "editRecurringTransactionById",
  parameters: {
    type: Type.OBJECT,
    description: `Edit a specific recurring transaction by its ID. Use this when the user wants to edit a recurring transaction (subscription, bill, salary, etc.) they previously identified via queryTransactions.
    
    WORKFLOW:
    1. User asks to edit a specific recurring transaction (e.g., "Edit my Netflix subscription", "Change that monthly rent")
    2. Use queryTransactions on "RecurringTransaction" table to find matching recurring transactions (including 'id' column in SELECT)
    3. Present the matches to the user with their IDs clearly visible
    4. Once user confirms which recurring transaction to edit, call this function with the ID and updates
    
    This function returns a structured result with a 'success' field.
    
    On SUCCESS (success=true):
    - Returns updated recurring transaction data (id, amount, category, description, frequency, interval, dayOfWeek, dayOfMonth, monthOfYear, nextDue, startDate, type)
    - Returns human-readable message confirming the changes
    - May include warnings if category was normalized
    - If frequency/timing fields changed, nextDue will be automatically recalculated
    
    On FAILURE (success=false):
    - Returns error message (e.g., "Recurring transaction not found", "Validation failed")
    - For validation errors, returns details about what went wrong
    - If recurring transaction not found, user may not have access or it doesn't exist/is inactive`,
    properties: {
      id: {
        type: Type.NUMBER,
        description: "The ID of the recurring transaction to edit (obtained from queryTransactions results on RecurringTransaction table)",
      },
      updates: {
        type: Type.OBJECT,
        description: "Fields to update in the recurring transaction - only include the fields the user wants to change",
        properties: createRecurringTransactionUpdateProperties(),
      },
    },
    required: ["id", "updates"],
  },
};

const queryTransactionsDeclaration = {
  name: "queryTransactions",
  parameters: {
    type: Type.OBJECT,
    description: `Query transaction data from the database. This function serves multiple purposes:

    1. **Generate Reports**: Query data to create financial insights and summaries
    2. **Find Transactions for Editing**: Discover transaction IDs to edit specific transactions
    3. **Find Transactions for Deleting**: Discover transaction IDs to delete specific transactions
    
    The function returns a structured result with a 'success' field.
    
    On SUCCESS (success=true):
    - Returns 'data' array with query results (raw database rows, including 'id' field)
    - Returns 'rowCount' (number of results)
    - Returns 'sqlExecuted' (the query that ran)
    - Use the 'id' field from results to edit or delete specific transactions
    
    On FAILURE (success=false):
    - Returns validation error message explaining what went wrong
    
    Database Schema:
    - "Transaction" table columns: id (INTEGER), userId (TEXT), date (TEXT), amount (REAL), category (TEXT), description (TEXT), type (TEXT: 'expense' or 'income'), createdAt (TEXT), updatedAt (TEXT)
    - "RecurringTransaction" table columns: id (INTEGER), userId (TEXT), amount (REAL), category (TEXT), description (TEXT), type (TEXT: 'expense' or 'income'), frequency (TEXT), interval (INTEGER), dayOfWeek (INTEGER), dayOfMonth (INTEGER), monthOfYear (INTEGER), startDate (TEXT), nextDue (TEXT), isActive (INTEGER: 0 or 1), createdAt (TEXT), updatedAt (TEXT)
    
    CRITICAL SQL RULES:
    1. Always include WHERE userId = '{USER_ID_PLACEHOLDER}' (system will inject actual userId)
    2. Only SELECT queries allowed (no DELETE, UPDATE, INSERT, DROP, ALTER, CREATE, TRUNCATE, EXEC, PRAGMA)
    3. MUST use LIMIT clause to restrict results (recommended LIMIT 50 or less for readability). System auto-adds LIMIT 100 if missing.
    4. Can use SQLite functions: strftime, SUM, COUNT, AVG, MAX, MIN, GROUP BY, ORDER BY, etc.
    5. Date format in database is ISO string (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
    6. Table names should be quoted with double quotes for SQLite compatibility (e.g., "Transaction")
    
    Common Query Examples:
    
    1. Total spending by category:
       SELECT category, SUM(amount) as total FROM "Transaction" 
       WHERE userId = '{USER_ID_PLACEHOLDER}' AND type = 'expense' 
       GROUP BY category ORDER BY total DESC LIMIT 10
    
    2. Monthly spending totals:
       SELECT strftime('%Y-%m', date) as month, SUM(amount) as total 
       FROM "Transaction" WHERE userId = '{USER_ID_PLACEHOLDER}' AND type = 'expense' 
       GROUP BY month ORDER BY month DESC LIMIT 12
    
    3. Recent transactions:
       SELECT date, amount, category, description, type 
       FROM "Transaction" WHERE userId = '{USER_ID_PLACEHOLDER}' 
       ORDER BY date DESC LIMIT 10
    
    4. Income vs Expenses comparison:
       SELECT type, SUM(amount) as total 
       FROM "Transaction" WHERE userId = '{USER_ID_PLACEHOLDER}' 
       GROUP BY type
    
    5. Spending in specific date range:
       SELECT date, amount, category, description 
       FROM "Transaction" WHERE userId = '{USER_ID_PLACEHOLDER}' 
       AND date >= '2025-11-01' AND date <= '2025-11-30' 
       ORDER BY date DESC LIMIT 50
    
    6. Average daily spending:
       SELECT AVG(daily_total) as avg_per_day FROM (
         SELECT date, SUM(amount) as daily_total 
         FROM "Transaction" WHERE userId = '{USER_ID_PLACEHOLDER}' AND type = 'expense' 
         GROUP BY date
       ) LIMIT 1
    
    7. Find specific transaction for editing (by description/category):
       SELECT id, date, amount, category, description, type 
       FROM "Transaction" WHERE userId = '{USER_ID_PLACEHOLDER}' 
       AND (description LIKE '%coffee%' OR category = 'Food & Dining') 
       ORDER BY date DESC LIMIT 10
    
    8. Find specific transaction for deleting (by amount and date):
       SELECT id, date, amount, category, description, type 
       FROM "Transaction" WHERE userId = '{USER_ID_PLACEHOLDER}' 
       AND amount = 50.00 AND category = 'Entertainment' 
       AND date >= '2025-11-01' 
       ORDER BY date DESC LIMIT 5
    
    9. Find transaction by approximate description:
       SELECT id, date, amount, category, description, type 
       FROM "Transaction" WHERE userId = '{USER_ID_PLACEHOLDER}' 
       AND description LIKE '%salary%' 
       ORDER BY date DESC LIMIT 5
    
    After receiving results:
    - For REPORTS: Format the data into a user-friendly message with insights, currency formatting ($X.XX), trends, and summaries
    - For FINDING TRANSACTIONS: Present the matching transactions with their IDs clearly visible, then ask which one to edit/delete
    - If rowCount is 0, tell user no results were found and suggest they add transactions or adjust search criteria
    - Keep formatting concise and readable for WhatsApp
    - Use bullet points or numbered lists for clarity
    - When showing transactions for editing/deleting, include: id, date, amount, category, and description`,
    properties: {
      queryDescription: {
        type: Type.STRING,
        description: "Brief human-readable description of what the query does - for reports, editing, or deleting (for logging and user context)",
      },
      sqlQuery: {
        type: Type.STRING,
        description: "The SQL SELECT query to execute. MUST include 'WHERE userId = {USER_ID_PLACEHOLDER}' and LIMIT clause. Include 'id' column when finding transactions for editing/deleting. Use SQLite syntax.",
      },
    },
    required: ["queryDescription", "sqlQuery"],
  },
};

const deleteTransactionsDeclaration = {
  name: "deleteTransactions",
  parameters: {
    type: Type.OBJECT,
    description: `Delete one or multiple one-time transactions by their IDs. Use this when the user wants to permanently remove specific transactions they previously identified via queryTransactions.
    
    WORKFLOW:
    1. User asks to delete specific transaction(s) (e.g., "Delete that $50 coffee expense", "Delete all those duplicate entries")
    2. Use queryTransactions on "Transaction" table to find matching transactions (including 'id' column in SELECT)
    3. Present the matches to the user with their IDs clearly visible
    4. IMPORTANT: Warn user this is permanent deletion and cannot be undone
    5. Once user confirms which transaction(s) to delete, call this function with the ID(s)
    
    This function returns a structured result with a 'success' field.
    
    On SUCCESS (success=true):
    - Returns deletedCount (number of transactions deleted)
    - Returns human-readable message (e.g., "Deleted 3 transactions")
    
    On FAILURE (success=false):
    - Returns error message (e.g., "Transactions not found or unauthorized: 123, 456")
    - Lists specific IDs that failed (not found or unauthorized)
    - No partial deletions - all or nothing (transaction safety)`,
    properties: {
      ids: {
        type: Type.ARRAY,
        description: "Array of transaction IDs to delete (obtained from queryTransactions results on Transaction table). Can be single ID [123] or multiple [123, 456, 789]",
        items: {
          type: Type.NUMBER,
          description: "Transaction ID"
        }
      }
    },
    required: ["ids"]
  }
};

const deleteRecurringTransactionsDeclaration = {
  name: "deleteRecurringTransactions",
  parameters: {
    type: Type.OBJECT,
    description: `Delete (deactivate) one or multiple recurring transactions by their IDs. Use this when the user wants to stop/cancel specific recurring transactions (subscriptions, bills, etc.) they previously identified via queryTransactions.
    
    WORKFLOW:
    1. User asks to delete recurring transaction(s) (e.g., "Cancel my Netflix subscription", "Delete those old recurring bills")
    2. Use queryTransactions on "RecurringTransaction" table to find matching recurring transactions (including 'id' column in SELECT)
    3. Present the matches to the user with their IDs clearly visible (show frequency/amount for context)
    4. Explain this will deactivate the recurring transaction (no future occurrences)
    5. Once user confirms which recurring transaction(s) to delete, call this function with the ID(s)
    
    IMPORTANT: This DEACTIVATES recurring transactions (soft delete). They won't appear in active lists but are preserved for history.
    
    This function returns a structured result with a 'success' field.
    
    On SUCCESS (success=true):
    - Returns deactivatedCount (number of recurring transactions deactivated)
    - Returns human-readable message (e.g., "Deactivated 2 subscriptions")
    
    On FAILURE (success=false):
    - Returns error message (e.g., "Recurring transactions not found, unauthorized, or already inactive: 45, 67")
    - Lists specific IDs that failed (not found, unauthorized, or already inactive)
    - No partial deletions - all or nothing (transaction safety)`,
    properties: {
      ids: {
        type: Type.ARRAY,
        description: "Array of recurring transaction IDs to delete (obtained from queryTransactions results on RecurringTransaction table). Can be single ID [12] or multiple [12, 34, 56]",
        items: {
          type: Type.NUMBER,
          description: "Recurring transaction ID"
        }
      }
    },
    required: ["ids"]
  }
};

export class FunctionDeclarationService {
  private readonly transactionService: TransactionService;
  private readonly recurringTransactionService: RecurringTransactionService;
  private readonly queryExecutorService: QueryExecutorService;

  private readonly functionMapping = new Map<string, Function>([
    // Date/Time functions
    [
      "getCurrentDate",
      () => {
        const now = new Date();
        return {
          date: now.toISOString().split('T')[0], // YYYY-MM-DD
          dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
          fullDate: now.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          timestamp: now.toISOString()
        };
      }
    ],
    // Transaction function (async) - handles both expense and income
    [
      "addTransaction",
      async (params: { transactionData: Transaction }) => {
        console.log("Executing addTransaction with params:", params);
        return await this.transactionService.addTransaction(params.transactionData);
      }
    ],
    // Recurring transaction function (async) - handles both expense and income
    [
      "createRecurringTransaction",
      async (params: { recurringTransactionData: RecurringTransactionInput }) => {
        console.log("Executing createRecurringTransaction with params:", params);
        return await this.recurringTransactionService.createRecurringTransaction(params.recurringTransactionData);
      }
    ],
    // Edit last transaction (async)
    [
      "editLastTransaction",
      async (params: { updates: TransactionUpdateData, transactionType?: TransactionType }) => {
        console.log("Executing editLastTransaction with params:", params);
        return await this.transactionService.editLastTransaction(params.updates, params.transactionType);
      }
    ],
    // Edit last recurring transaction (async)
    [
      "editLastRecurringTransaction",
      async (params: { updates: RecurringTransactionUpdateData, transactionType?: TransactionType }) => {
        console.log("Executing editLastRecurringTransaction with params:", params);
        return await this.recurringTransactionService.editLastRecurringTransaction(params.updates, params.transactionType);
      }
    ],
    // Edit transaction by ID (async)
    [
      "editTransactionById",
      async (params: { id: number, updates: TransactionUpdateData }) => {
        console.log("Executing editTransactionById with params:", params);
        return await this.transactionService.editTransactionById(params.id, params.updates);
      }
    ],
    // Edit recurring transaction by ID (async)
    [
      "editRecurringTransactionById",
      async (params: { id: number, updates: RecurringTransactionUpdateData }) => {
        console.log("Executing editRecurringTransactionById with params:", params);
        return await this.recurringTransactionService.editRecurringTransactionById(params.id, params.updates);
      }
    ],
    // Delete transactions (async)
    [
      "deleteTransactions",
      async (params: { ids: number[] }) => {
        console.log("Executing deleteTransactions with params:", params);
        return await this.transactionService.deleteTransactions(params.ids);
      }
    ],
    // Delete recurring transactions (async)
    [
      "deleteRecurringTransactions",
      async (params: { ids: number[] }) => {
        console.log("Executing deleteRecurringTransactions with params:", params);
        return await this.recurringTransactionService.deleteRecurringTransactions(params.ids);
      }
    ],
    // Query transactions for reports, editing, or deleting (async)
    [
      "queryTransactions",
      async (params: { queryDescription: string, sqlQuery: string }) => {
        console.log("Executing queryTransactions with params:", params);
        return await this.queryExecutorService.executeQuery(
          params.sqlQuery,
          params.queryDescription
        );
      }
    ],
  ]);

  private readonly functionDeclarations = [
    getCurrentDateDeclaration, 
    transactionDeclaration,
    recurringTransactionDeclaration,
    editLastTransactionDeclaration,
    editLastRecurringTransactionDeclaration,
    editTransactionByIdDeclaration,
    editRecurringTransactionByIdDeclaration,
    queryTransactionsDeclaration,
    deleteTransactionsDeclaration,
    deleteRecurringTransactionsDeclaration
  ];

  constructor(
    transactionService: TransactionService, 
    recurringTransactionService: RecurringTransactionService,
    queryExecutorService: QueryExecutorService
  ) {
    this.transactionService = transactionService;
    this.recurringTransactionService = recurringTransactionService;
    this.queryExecutorService = queryExecutorService;
  }

  /**
   * Get all function declarations for AI tools
   */
  getFunctionDeclarations() {
    return this.functionDeclarations;
  }

  /**
   * Execute a function by name with parameters
   * @param functionName - The name of the function to execute
   * @param parameters - The parameters for the function
   * @returns The result of the function execution
   * @throws Error if the function is not found
   */
  async executeFunction(functionName: string, parameters: any): Promise<any> {
    const func = this.functionMapping.get(functionName);
    if (!func) {
      throw new Error(`Function '${functionName}' not found`);
    }
    return await func(parameters);
  }
}