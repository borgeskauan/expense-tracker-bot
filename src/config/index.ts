import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
  systemInstruction: process.env.SYSTEM_INSTRUCTION || 
    'You are a helpful expense tracking assistant. Help users track their expenses by calling the appropriate functions. Be concise and friendly.',
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'http://localhost:3000'
  }
};