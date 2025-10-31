import { Type } from "@google/genai";
import { Expense, RecurringExpenseInput } from "../types/models";
import { ExpenseService } from "./expenseService";
import { RecurringExpenseService } from "./recurringExpenseService";
import { DEFAULT_CATEGORIES, getCategoryDescription } from "../config/categories";
import { FREQUENCIES } from "../config/frequencies";

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
    description: "Add a new expense record for a user. This function returns a structured result with success status, a formatted message, and the expense details including the category that was selected. Use the returned information to confirm to the user what was added.",
    properties: {
      expenseData: {
        type: Type.OBJECT,
        description: "The expense data to add",
        properties: {
          date: {
            type: Type.STRING,
            description: "The date of the expense in ISO format (YYYY-MM-DD). For relative dates like 'today', 'yesterday', 'last Monday', calculate the actual date. You can call getCurrentDate() if you need to confirm today's date.",
          },
          amount: {
            type: Type.NUMBER,
            description: "The amount of the expense, must be positive",
          },
          category: {
            type: Type.STRING,
            description: `The category of the expense. ${getCategoryDescription()} If user mentions an unclear category or doesn't mention it at all, choose the closest match from the list.`,
            enum: [...DEFAULT_CATEGORIES],
          },
          description: {
            type: Type.STRING,
            description: "Optional description of the expense",
          },
        },
        required: ["date", "amount", "category"],
      },
    },
    required: ["expenseData"],
  },
};

const recurringExpenseDeclaration = {
  name: "createRecurringExpense",
  parameters: {
    type: Type.OBJECT,
    description: "Create a new recurring expense that repeats on a regular schedule (daily, weekly, monthly, or yearly). This function returns a structured result with success status, a formatted message, and the recurring expense details including when the next expense is due.",
    properties: {
      recurringExpenseData: {
        type: Type.OBJECT,
        description: "The recurring expense data to add",
        properties: {
          amount: {
            type: Type.NUMBER,
            description: "The amount of the recurring expense, must be positive",
          },
          category: {
            type: Type.STRING,
            description: `The category of the expense. ${getCategoryDescription()} If user mentions an unclear category, choose the closest match from the list.`,
            enum: [...DEFAULT_CATEGORIES],
          },
          description: {
            type: Type.STRING,
            description: "Optional description of the recurring expense",
          },
          frequency: {
            type: Type.STRING,
            description: "How often the expense recurs",
            enum: FREQUENCIES,
          },
          interval: {
            type: Type.NUMBER,
            description: "The interval for the frequency (e.g., 2 for 'every 2 weeks'). Defaults to 1 if not specified. Must be at least 1.",
          },
          dayOfWeek: {
            type: Type.NUMBER,
            description: "For weekly frequency only: The day of the week (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday). Required for weekly frequency.",
          },
          dayOfMonth: {
            type: Type.NUMBER,
            description: "For monthly frequency only: The day of the month (1-31). Required for monthly frequency. If the day doesn't exist in a month (e.g., Feb 30), the last valid day of that month will be used.",
          },
          startDate: {
            type: Type.STRING,
            description: "The date when the recurring expense starts in ISO format (YYYY-MM-DD). For relative dates like 'today', 'next Monday', calculate the actual date. You can call getCurrentDate() if needed. Defaults to today if not specified.",
          },
        },
        required: ["amount", "category", "frequency"],
      },
    },
    required: ["recurringExpenseData"],
  },
};

export class FunctionDeclarationService {
  private readonly expenseService: ExpenseService;
  private readonly recurringExpenseService: RecurringExpenseService;

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
      async (params: { expenseData: Expense }) => {
        console.log("Executing addExpense with params:", params);
        return await this.expenseService.addExpense(params.expenseData);
      }
    ],
    // Recurring expense functions (async)
    [
      "createRecurringExpense",
      async (params: { recurringExpenseData: RecurringExpenseInput }) => {
        console.log("Executing createRecurringExpense with params:", params);
        return await this.recurringExpenseService.createRecurringExpense(params.recurringExpenseData);
      }
    ],
  ]);

  private readonly functionDeclarations = [
    getCurrentDateDeclaration, 
    expenseDeclaration,
    recurringExpenseDeclaration
  ];

  constructor(expenseService: ExpenseService, recurringExpenseService: RecurringExpenseService) {
    this.expenseService = expenseService;
    this.recurringExpenseService = recurringExpenseService;
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

  /**
   * Get available function names
   */
  getAvailableFunctions(): string[] {
    return Array.from(this.functionMapping.keys());
  }

  /**
   * Check if a function exists
   * @param functionName - The name of the function to check
   */
  hasFunction(functionName: string): boolean {
    return this.functionMapping.has(functionName);
  }
}