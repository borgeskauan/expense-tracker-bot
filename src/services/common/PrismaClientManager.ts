import { PrismaClient } from '../../generated/prisma';

/**
 * Manages Prisma client lifecycle to avoid creating multiple instances
 * Uses singleton pattern to ensure single PrismaClient instance
 */
export class PrismaClientManager {
  private static instance: PrismaClient | null = null;
  private static refCount: number = 0;

  /**
   * Get or create the shared Prisma client instance
   * 
   * @returns The shared PrismaClient instance
   */
  static getClient(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient();
    }
    this.refCount++;
    return this.instance;
  }

  /**
   * Disconnect from the database
   * Only disconnects when all references are released
   * 
   * @returns Promise that resolves when disconnected
   */
  static async disconnect(): Promise<void> {
    this.refCount = Math.max(0, this.refCount - 1);
    
    // Only disconnect if no more references
    if (this.refCount === 0 && this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
    }
  }

  /**
   * Force disconnect regardless of reference count
   * Use with caution - typically for testing or app shutdown
   * 
   * @returns Promise that resolves when disconnected
   */
  static async forceDisconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
      this.refCount = 0;
    }
  }

  /**
   * Get current reference count (useful for debugging)
   */
  static getRefCount(): number {
    return this.refCount;
  }
}
