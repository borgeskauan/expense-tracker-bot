import dotenv from 'dotenv';

dotenv.config();

function getSystemInstruction(): string {
  const baseInstruction = process.env.SYSTEM_INSTRUCTION;
  if (!baseInstruction || baseInstruction.trim() === '') {
    throw new Error('SYSTEM_INSTRUCTION environment variable is required');
  }

  return baseInstruction;
}

export const config = {
  port: process.env.PORT || 3001,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  systemInstruction: getSystemInstruction(),
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'http://localhost:3000'
  }
};