import { GeminiService } from './geminiService';
import { FunctionService } from './functionService';
import { config } from '../config';
import { FunctionDeclarationService } from './functionDeclarationService';
import { ExpenseService } from './expenseService';

export class DependencyService {
  private static instance: DependencyService;
  private services: Map<string, any> = new Map();
  private initialized: boolean = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): DependencyService {
    if (!DependencyService.instance) {
      DependencyService.instance = new DependencyService();
    }
    return DependencyService.instance;
  }

  initialize(): void {
    if (this.initialized) {
      console.warn('DependencyService already initialized');
      return;
    }

    try {
      // Validate configuration internally
      if (!config.geminiApiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }

      const expenseService = new ExpenseService();

      const functionDeclarationService = new FunctionDeclarationService(expenseService);

      // Create services with configuration from the config module
      const geminiService = new GeminiService(config.geminiApiKey, functionDeclarationService);
      const functionService = new FunctionService(geminiService, functionDeclarationService);

      // Register services
      this.services.set('GeminiService', geminiService);
      this.services.set('FunctionService', functionService);
      this.services.set('functionDeclarationService', functionDeclarationService);

      this.initialized = true;
      console.log('DependencyService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DependencyService:', error);
      throw error;
    }
  }

  // Convenience getters for commonly used services
  get functionService(): FunctionService {
    return this.getService<FunctionService>('FunctionService');
  }

  // Clear all services (useful for testing)
  clear(): void {
    this.services.clear();
    this.initialized = false;
  }

  private getService<T>(serviceName: string): T {
    if (!this.initialized) {
      throw new Error('DependencyService not initialized. Call initialize() first.');
    }

    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }

    return service as T;
  }
}

// Convenience export for easy access
export const dependencyService = DependencyService.getInstance();