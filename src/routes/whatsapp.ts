import { Router } from 'express';
import { FunctionService } from '../services/functionService';
import { whatsappService } from '../services/whatsappService';
import { conversationService } from '../services/conversationService';

export interface WhatsAppWebhookPayload {
  id: string; // Message ID
  remoteJid: string; // Sender JID
  fromMe: boolean; // Whether the message is from the bot
  pushName: string; // Sender's display name
  timestamp: number; // Unix timestamp in milliseconds
  text: string; // Message text
  raw?: any; // Raw WhatsApp message object
}

export function createWhatsAppRoutes(functionService: FunctionService) {
  const router = Router();

  /**
   * Webhook endpoint to receive messages from WhatsApp
   * This endpoint will be called by the WhatsApp API when a message is received
   */
  router.post('/', async (req, res) => {
    try {
      const payload = req.body as WhatsAppWebhookPayload;

      console.log('Received WhatsApp webhook:', JSON.stringify(payload, null, 2));

      // Ignore messages from the bot itself
      if (payload.fromMe) {
        console.log('Ignoring message from bot itself');
        return res.json({ success: true, ignored: true, reason: 'fromMe' });
      }

      // Validate payload
      if (!payload.remoteJid || !payload.text) {
        console.warn('Invalid webhook payload:', payload);
        return res.status(400).json({ 
          error: 'Invalid payload',
          message: 'Missing required fields: remoteJid or text' 
        });
      }

      const userId = payload.remoteJid;
      const userMessage = payload.text;
      const userName = payload.pushName || 'User';

      console.log(`Processing message from ${userName} (${userId}): ${userMessage}`);

      // Get conversation history
      const conversationHistory = await conversationService.getConversationHistory(userId);
      
      // Create a temporary function service with the user's conversation history
      const userContents = [...conversationHistory];
      
      // Add the new user message
      userContents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      // Process the message with AI
      const result = await functionService.handleFunctionCalling(userMessage);

      // Save the updated conversation
      await conversationService.updateConversation(userId, [
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: result.response }] }
      ]);

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
  });

  /**
   * Clear conversation history for a user
   */
  router.delete('/conversation/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
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
  });

  return router;
}
