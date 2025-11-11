import { ContentListUnion, FunctionCallingConfigMode, GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { GenerateContentResponse, IAIConversationalService } from '../../../types/ai';
import { FunctionDeclarationService } from '../functionDeclarationService';

export class GeminiConversationalService implements IAIConversationalService {
  private ai: GoogleGenAI;
  private config: GenerateContentConfig;
  private model: string;

  constructor(
    apiKey: string, 
    model: string,
    systemInstruction: string,
    functionDeclarationService: FunctionDeclarationService
  ) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
    this.config = {
      systemInstruction: systemInstruction,
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
      model: this.model,
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