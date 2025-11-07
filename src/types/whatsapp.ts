export interface WhatsAppWebhookPayload {
  remoteJid: string; // Sender JID
  fromMe: boolean; // Whether the message is from the bot
  pushName: string; // Sender's display name
  text: string; // Message text
}
