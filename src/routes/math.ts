import { Router } from 'express';
import { FunctionService } from '../services/functionService';

export function createMathRoutes(functionService: FunctionService) {
  const router = Router();

  // Test route with function calling
  router.get('/test-math', async (req, res) => {
    try {
      const result = await functionService.handleFunctionCalling(
        "I have 57 cats, each owns 44 mittens, how many mittens is that in total?"
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error in math test:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process math request'
      });
    }
  });

  // Test multi-step math problem
  router.get('/test-multi-step', async (req, res) => {
    try {
      const result = await functionService.handleFunctionCalling(
        "I have 100 apples. I give 20 to friends and then multiply the remaining by 3. How many apples do I have now?"
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error in multi-step test:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process multi-step request'
      });
    }
  });

  return router;
}