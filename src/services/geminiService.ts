import { ContentListUnion, FunctionCallingConfigMode, GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { GenerateContentResponse, IAIService } from '../types/ai';
import { FunctionDeclarationService } from './functionDeclarationService';

export class GeminiService implements IAIService {
  private ai: GoogleGenAI;
  private config: GenerateContentConfig;

  constructor(apiKey: string, functionDeclarationService: FunctionDeclarationService) {
    this.ai = new GoogleGenAI({ apiKey });
    this.config = {
      tools: [
        {
          functionDeclarations: functionDeclarationService.getFunctionDeclarations(),
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.AUTO
        },
      }
    };
  }

  async generateContent(contents: ContentListUnion): Promise<GenerateContentResponse> {
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: this.config
    });

    return this.adaptGenAIResponse(response);
  }

  private adaptGenAIResponse(response: any): GenerateContentResponse {
    return {
      functionCalls: response.functionCalls,
      candidates: response.candidates?.map((candidate: any) => ({
        content: candidate.content || { role: "model", parts: [] }
      })),
      text: response.text
    };
  }
}