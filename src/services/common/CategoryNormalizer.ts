import { findClosestCategory, isValidCategory } from '../../config/categories';

/**
 * Result of category normalization
 */
export interface CategoryNormalizationResult {
  category: string;
  wasNormalized: boolean;
  originalCategory?: string;
}

/**
 * Utility class for validating and normalizing expense categories
 * Uses composition to share category validation logic across services
 */
export class CategoryNormalizer {
  /**
   * Validate and normalize a category string
   * If the category is invalid, finds the closest match
   * 
   * @param category - The category to validate/normalize
   * @returns Normalization result with the final category and metadata
   */
  normalize(category: string): CategoryNormalizationResult {
    if (isValidCategory(category)) {
      return {
        category,
        wasNormalized: false,
      };
    }

    const closestCategory = findClosestCategory(category);
    console.log(`Category "${category}" not found. Using closest match: "${closestCategory}"`);
    
    return {
      category: closestCategory,
      wasNormalized: true,
      originalCategory: category,
    };
  }

  /**
   * Check if a category is valid without normalizing
   * 
   * @param category - The category to validate
   * @returns true if valid, false otherwise
   */
  isValid(category: string): boolean {
    return isValidCategory(category);
  }
}
