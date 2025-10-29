export interface WhatsAppWebhookPayload {
  id: string; // Message ID
  remoteJid: string; // Sender JID
  fromMe: boolean; // Whether the message is from the bot
  pushName: string; // Sender's display name
  timestamp: number; // Unix timestamp in milliseconds
  text: string; // Message text
  raw?: any; // Raw WhatsApp message object
}
