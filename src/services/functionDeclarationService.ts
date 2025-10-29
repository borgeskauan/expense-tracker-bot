import { Type } from "@google/genai";
import { Expense } from "../types/models";
import { ExpenseService } from "./expenseService";

// Function declarations
const expenseDeclaration = {
  name: "addExpense",
  parameters: {
    type: Type.OBJECT,
    description: "Add a new expense record for a user.",
    properties: {
      expenseData: {
        type: Type.OBJECT,
        description: "The expense data to add",
        properties: {
          date: {
            type: Type.STRING,
            description: "The date of the expense in ISO format (YYYY-MM-DD)",
          },
          amount: {
            type: Type.NUMBER,
            description: "The amount of the expense, must be positive",
          },
          category: {
            type: Type.STRING,
            description: "The category of the expense (e.g., food, transportation, entertainment)",
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
  }
};

export class FunctionDeclarationService {
  private readonly expenseService: ExpenseService;

  private readonly functionMapping = new Map<string, Function>([
    // Expense functions (async)
    ["addExpense", async (params: { expenseData: Expense }) => await this.expenseService.addExpense(params.expenseData)],
  ]);

  private readonly functionDeclarations = [
    expenseDeclaration
  ];

  constructor(expenseService: ExpenseService) {
    this.expenseService = expenseService;
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