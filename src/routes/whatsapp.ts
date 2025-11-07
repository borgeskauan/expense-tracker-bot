import { Router } from 'express';
import { AIMessageService } from '../services/ai/aiMessageService';
import { WhatsAppController } from '../controllers/whatsappController';

export function createWhatsAppRoutes(aiMessageService: AIMessageService) {
  const router = Router();
  const controller = new WhatsAppController(aiMessageService);

  /**
   * Webhook endpoint to receive messages from WhatsApp
   * This endpoint will be called by the WhatsApp API when a message is received
   */
  router.post('/', (req, res) => controller.handleWebhook(req, res));

  return router;
}
