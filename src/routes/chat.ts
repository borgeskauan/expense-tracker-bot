import { Router } from 'express';
import { FunctionService } from '../services/functionService';

export function createChatRoutes(functionService: FunctionService) {
  const router = Router();

  // Chat endpoint with function calling support
  router.post('/', async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const result = await functionService.handleFunctionCalling(message);

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('Error in chat endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}