export interface FunctionCallHistory {
  name: string;
  parameters: any;
  result: number;
}

export interface FunctionCallResult {
  response: string;
  functionUsed: boolean;
  functionCalls: FunctionCallHistory[];
  iterations: number;
  newConversationEntries: Content[]; // Only the new entries added during this interaction
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface Content {
  role: "user" | "model";
  parts: Part[];
}

export interface Part {
  text?: string;
  functionResponse?: {
    name: string;
    response: { resultValue: any };
  };
}

export interface IAIService {
  generateContent(contents: Content[]): Promise<GenerateContentResponse>;
}

export interface GenerateContentResponse {
  functionCalls?: any[];
  candidates?: Array<{
    content: Content;
  }>;
  text?: string;
}

export interface IAIMessageService {
  handleFunctionCalling(message: string, conversationHistory?: Content[]): Promise<FunctionCallResult>;
}