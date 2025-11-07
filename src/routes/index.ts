import { Router } from 'express';
import { AIMessageService } from '../services/aiMessageService';
import { createWhatsAppRoutes } from './whatsapp';

export function createRoutes(aiMessageService: AIMessageService) {
  const router = Router();

  router.use('/whatsapp', createWhatsAppRoutes(aiMessageService));

  return router;
}