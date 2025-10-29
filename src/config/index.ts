import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'http://localhost:3000'
  }
};