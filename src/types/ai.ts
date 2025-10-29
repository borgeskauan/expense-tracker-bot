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
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  features: string[];
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

export interface IFunctionService {
  handleFunctionCalling(message: string): Promise<FunctionCallResult>;
  getConversation(): Content[];
  clearConversation(): void;
}