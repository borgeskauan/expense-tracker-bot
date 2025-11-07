import { Type } from "@google/genai";
import { Transaction, RecurringTransactionInput } from "../../types/models";
import { TransactionService } from "../business/transactionService";
import { RecurringTransactionService } from "../business/recurringTransactionService";
import { EXPENSE_CATEGORIES, getExpenseCategoryDescription } from "../../config/expenseCategories";
import { INCOME_CATEGORIES, getIncomeCategoryDescription } from "../../config/incomeCategories";
import { FREQUENCIES } from "../../config/frequencies";
import { TransactionType } from "../../config/transactionTypes";

// Shared property definitions
const createTransactionProperties = (categories: readonly string[], categoryDescription: string) => ({
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
    description: `${categoryDescription} If user mentions an unclear category or doesn't mention it at all, choose the closest match from the list.`,
    enum: [...categories],
  },
  description: {
    type: Type.STRING,
    description: "Optional description of the transaction",
  },
});

const createRecurringTransactionProperties = (categories: readonly string[], categoryDescription: string) => ({
  amount: {
    type: Type.NUMBER,
    description: "The amount of the transaction, must be positive",
  },
  category: {
    type: Type.STRING,
    description: `${categoryDescription} If user mentions an unclear category, choose the closest match from the list.`,
    enum: [...categories],
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
  startDate: {
    type: Type.STRING,
    description: "The date when the recurring transaction starts in ISO format (YYYY-MM-DD). For relative dates like 'today', 'next Monday', calculate the actual date. You can call getCurrentDate() if needed. Defaults to today if not specified.",
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

const expenseDeclaration = {
  name: "addExpense",
  parameters: {
    type: Type.OBJECT,
    description: "Add a new expense record (money spent) for a user. This function returns a structured result with a 'success' field. On success (success=true), it includes a formatted message and expense details. On failure (success=false), it includes validation errors in the 'error' object with 'validationErrors' array. IMPORTANT: Always check the 'success' field and handle both cases. If validation fails, explain the errors to the user in a friendly way and ask for the missing or corrected information.",
    properties: {
      expenseData: {
        type: Type.OBJECT,
        description: "The expense data to add",
        properties: createTransactionProperties(EXPENSE_CATEGORIES, getExpenseCategoryDescription()),
        required: ["date", "amount", "category"],
      },
    },
    required: ["expenseData"],
  },
};

const incomeDeclaration = {
  name: "addIncome",
  parameters: {
    type: Type.OBJECT,
    description: "Add a new income record (money received) for a user. This function returns a structured result with a 'success' field. On success (success=true), it includes a formatted message and income details. On failure (success=false), it includes validation errors in the 'error' object with 'validationErrors' array. IMPORTANT: Always check the 'success' field and handle both cases. If validation fails, explain the errors to the user in a friendly way and ask for the missing or corrected information.",
    properties: {
      incomeData: {
        type: Type.OBJECT,
        description: "The income data to add",
        properties: createTransactionProperties(INCOME_CATEGORIES, getIncomeCategoryDescription()),
        required: ["date", "amount", "category"],
      },
    },
    required: ["incomeData"],
  },
};

const recurringExpenseDeclaration = {
  name: "createRecurringExpense",
  parameters: {
    type: Type.OBJECT,
    description: "Create a new recurring expense (money spent regularly) that repeats on a regular schedule (daily, weekly, monthly, or yearly). This function returns a structured result with a 'success' field. On success (success=true), it includes a formatted message and recurring expense details including when the next expense is due. On failure (success=false), it includes validation errors in the 'error' object with 'validationErrors' array. IMPORTANT: Always check the 'success' field and handle both cases. If validation fails, explain the errors to the user in a friendly way and ask for the missing or corrected information.",
    properties: {
      recurringExpenseData: {
        type: Type.OBJECT,
        description: "The recurring expense data to add",
        properties: createRecurringTransactionProperties(EXPENSE_CATEGORIES, getExpenseCategoryDescription()),
        required: ["amount", "category", "frequency"],
      },
    },
    required: ["recurringExpenseData"],
  },
};

const recurringIncomeDeclaration = {
  name: "createRecurringIncome",
  parameters: {
    type: Type.OBJECT,
    description: "Create a new recurring income (money received regularly) that repeats on a regular schedule (daily, weekly, monthly, or yearly). This function returns a structured result with a 'success' field. On success (success=true), it includes a formatted message and recurring income details including when the next income is due. On failure (success=false), it includes validation errors in the 'error' object with 'validationErrors' array. IMPORTANT: Always check the 'success' field and handle both cases. If validation fails, explain the errors to the user in a friendly way and ask for the missing or corrected information.",
    properties: {
      recurringIncomeData: {
        type: Type.OBJECT,
        description: "The recurring income data to add",
        properties: createRecurringTransactionProperties(INCOME_CATEGORIES, getIncomeCategoryDescription()),
        required: ["amount", "category", "frequency"],
      },
    },
    required: ["recurringIncomeData"],
  },
};

export class FunctionDeclarationService {
  private readonly transactionService: TransactionService;
  private readonly recurringTransactionService: RecurringTransactionService;

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
    // Expense functions (async)
    [
      "addExpense",
      async (params: { expenseData: Omit<Transaction, 'type'> }) => {
        console.log("Executing addExpense with params:", params);
        return await this.transactionService.addTransaction({
          ...params.expenseData,
          type: TransactionType.EXPENSE
        });
      }
    ],
    // Income functions (async)
    [
      "addIncome",
      async (params: { incomeData: Omit<Transaction, 'type'> }) => {
        console.log("Executing addIncome with params:", params);
        return await this.transactionService.addTransaction({
          ...params.incomeData,
          type: TransactionType.INCOME
        });
      }
    ],
    // Recurring expense functions (async)
    [
      "createRecurringExpense",
      async (params: { recurringExpenseData: Omit<RecurringTransactionInput, 'type'> }) => {
        console.log("Executing createRecurringExpense with params:", params);
        return await this.recurringTransactionService.createRecurringTransaction({
          ...params.recurringExpenseData,
          type: TransactionType.EXPENSE
        });
      }
    ],
    // Recurring income functions (async)
    [
      "createRecurringIncome",
      async (params: { recurringIncomeData: Omit<RecurringTransactionInput, 'type'> }) => {
        console.log("Executing createRecurringIncome with params:", params);
        return await this.recurringTransactionService.createRecurringTransaction({
          ...params.recurringIncomeData,
          type: TransactionType.INCOME
        });
      }
    ],
  ]);

  private readonly functionDeclarations = [
    getCurrentDateDeclaration, 
    expenseDeclaration,
    incomeDeclaration,
    recurringExpenseDeclaration,
    recurringIncomeDeclaration
  ];

  constructor(transactionService: TransactionService, recurringTransactionService: RecurringTransactionService) {
    this.transactionService = transactionService;
    this.recurringTransactionService = recurringTransactionService;
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