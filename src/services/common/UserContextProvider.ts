/**
 * Provides user context for operations
 * Encapsulates user ID resolution logic
 */
export class UserContextProvider {
  private userId: string;

  /**
   * Create a new user context provider
   * 
   * @param userId - The user ID to use for operations. If not provided, uses default.
   */
  constructor(userId?: string) {
    // TODO: In the future, this should come from authentication/session
    // For now, accept userId parameter or default to '1'
    this.userId = userId || '1';
    
    if (!userId) {
      console.log('UserContextProvider: No userId provided, using default "1"');
    }
  }

  /**
   * Get the current user ID
   * 
   * @returns The user ID for the current context
   */
  getUserId(): string {
    return this.userId;
  }

  /**
   * Update the user ID for this context
   * 
   * @param userId - The new user ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Create a user context provider from a WhatsApp JID or other identifier
   * 
   * @param identifier - The identifier to extract user ID from
   * @returns A new UserContextProvider instance
   */
  static fromIdentifier(identifier: string): UserContextProvider {
    // In the future, this could normalize WhatsApp JIDs or other identifiers
    return new UserContextProvider(identifier);
  }
}
