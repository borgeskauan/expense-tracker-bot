import { Request, Response } from 'express';
import { AIMessageService } from '../services/aiMessageService';
import { whatsappService } from '../services/whatsappService';
import { conversationService } from '../services/conversationService';
import { WhatsAppWebhookPayload } from '../types/whatsapp';

export class WhatsAppController {
  constructor(private readonly aiMessageService: AIMessageService) {}

  /**
   * Handle incoming WhatsApp webhook messages
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as WhatsAppWebhookPayload;

      console.log('Received WhatsApp webhook:', JSON.stringify(payload, null, 2));

      // Ignore messages from the bot itself
      if (payload.fromMe) {
        console.log('Ignoring message from bot itself');
        res.json({ success: true, ignored: true, reason: 'fromMe' });
        return;
      }

      // Validate payload
      if (!payload.remoteJid || !payload.text) {
        console.warn('Invalid webhook payload:', payload);
        res.status(400).json({ 
          error: 'Invalid payload',
          message: 'Missing required fields: remoteJid or text' 
        });
        return;
      }

      const userId = payload.remoteJid;
      const userMessage = payload.text;
      const userName = payload.pushName || 'User';

      console.log(`Processing message from ${userName} (${userId}): ${userMessage}`);

      // Get conversation history
      const conversationHistory = await conversationService.getConversationHistory(userId);

      // Process the message with AI (passing the conversation history)
      const result = await this.aiMessageService.handleMessage(userMessage, conversationHistory);

      // Save the new conversation entries (user message, function calls/responses, and model response)
      await conversationService.addMessagesToConversation(userId, result.newConversationEntries);

      // Send the response back to WhatsApp
      const sendResult = await whatsappService.sendMessage(userId, result.response);

      console.log(`Response sent to ${userId}:`, sendResult);

      // Respond to the webhook
      res.json({
        success: true,
        messageId: sendResult.id,
        to: sendResult.to,
        processed: {
          functionUsed: result.functionUsed,
          functionCalls: result.functionCalls?.length || 0,
          iterations: result.iterations
        }
      });

    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clear conversation history for a user
   */
  async clearConversation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'Missing userId' });
        return;
      }

      await conversationService.clearConversation(userId);

      res.json({
        success: true,
        message: 'Conversation cleared'
      });

    } catch (error) {
      console.error('Error clearing conversation:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
