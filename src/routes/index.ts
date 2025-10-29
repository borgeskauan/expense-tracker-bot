import { Router } from 'express';
import { FunctionService } from '../services/functionService';
import { createChatRoutes } from './chat';
import { createMathRoutes } from './math';
import { createConversationRoutes } from './conversation';
import { createHealthRoutes } from './health';
import { createWhatsAppRoutes } from './whatsapp';

export function createRoutes(functionService: FunctionService) {
  const router = Router();

  router.use('/chat', createChatRoutes(functionService));
  router.use('/math', createMathRoutes(functionService));
  router.use('/conversation', createConversationRoutes(functionService));
  router.use('/health', createHealthRoutes());
  router.use('/whatsapp', createWhatsAppRoutes(functionService));

  return router;
}