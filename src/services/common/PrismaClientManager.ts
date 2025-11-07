import { PrismaClient } from '../../generated/prisma';

/**
 * Manages Prisma client lifecycle to avoid creating multiple instances
 * Uses singleton pattern to ensure single PrismaClient instance
 */
export class PrismaClientManager {
  private static instance: PrismaClient | null = null;

  /**
   * Get or create the shared Prisma client instance
   * 
   * @returns The shared PrismaClient instance
   */
  static getClient(): PrismaClient {
    this.instance ??= new PrismaClient();
    return this.instance;
  }
}
