import { Router } from 'express';
import { FunctionService } from '../services/functionService';

export function createConversationRoutes(functionService: FunctionService) {
  const router = Router();

  // Clear conversation history
  router.delete('/', (req, res) => {
    functionService.clearConversation();
    res.json({ success: true, message: 'Conversation history cleared' });
  });

  // Get current conversation history
  router.get('/', (req, res) => {
    res.json({ contents: functionService.getConversation() });
  });

  return router;
}