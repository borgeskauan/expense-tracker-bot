import { Content, FunctionCallHistory, FunctionCallResult, IAIService, IAIMessageService } from "../types/ai";
import { FunctionDeclarationService } from "./functionDeclarationService";


export class AIMessageService implements IAIMessageService {
  private readonly aiService: IAIService;
  private readonly functionDeclarationService: FunctionDeclarationService;
  private readonly MAX_ITERATIONS = 50;

  constructor(aiService: IAIService, functionDeclarationService: FunctionDeclarationService) {
    this.aiService = aiService;
    this.functionDeclarationService = functionDeclarationService;
  }

  async handleFunctionCalling(message: string, conversationHistory: Content[] = []): Promise<FunctionCallResult> {
    let iterations = 0;
    const currentContents = [...conversationHistory];
    const functionCallsHistory: FunctionCallHistory[] = [];

    try {
      this.addUserMessage(currentContents, message);

      const finalResponse = await this.processFunctionCalls(
        currentContents,
        functionCallsHistory,
        iterations
      );

      this.addModelResponse(currentContents, finalResponse);

      return this.buildSuccessResult(finalResponse, functionCallsHistory, iterations, currentContents);
    } catch (error) {
      console.error('Error in function calling:', error);
      throw error;
    }
  }

  private async processFunctionCalls(
    contents: Content[],
    history: FunctionCallHistory[],
    iterations: number
  ): Promise<any> {
    while (iterations < this.MAX_ITERATIONS) {
      iterations++;
      console.log(`Iteration ${iterations}`);

      const generateContentResponse = await this.aiService.generateContent(contents);
      const functionCalls = generateContentResponse.functionCalls || [];

      if (functionCalls.length === 0) {
        return generateContentResponse;
      }

      console.log(`Function call(s) detected in iteration ${iterations}:`, functionCalls);

      this.addModelResponse(contents, generateContentResponse);
      await this.executeFunctionCalls(functionCalls, contents, history);

      console.log(`Completed iteration ${iterations}, function responses sent back to model`);
    }

    throw new Error(`Maximum iterations (${this.MAX_ITERATIONS}) reached. Possible infinite loop.`);
  }

  private async executeFunctionCalls(
    functionCalls: any[],
    contents: Content[],
    history: FunctionCallHistory[]
  ): Promise<void> {
    const functionResponses = [];

    for (const functionCall of functionCalls) {
      if (!this.isValidFunctionCall(functionCall)) {
        console.warn('Invalid function call:', functionCall);
        continue;
      }

      const result = await this.executeSingleFunctionCall(functionCall);
      history.push({
        name: functionCall.name,
        parameters: functionCall.args,
        result: result
      });

      functionResponses.push({
        name: functionCall.name,
        response: { resultValue: result }
      });
    }

    this.addFunctionResponses(contents, functionResponses);
  }

  private async executeSingleFunctionCall(functionCall: any): Promise<any> {
    const result = this.functionDeclarationService.executeFunction(functionCall.name, functionCall.args);

    console.log(`Function ${functionCall.name} result:`, result);
    return result;
  }

  private isValidFunctionCall(functionCall: any): boolean {
    return functionCall.name && functionCall.args;
  }

  private addUserMessage(contents: Content[], message: string): void {
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });
  }

  private addModelResponse(contents: Content[], response: any): void {
    if (response.candidates?.[0]?.content) {
      contents.push(response.candidates[0].content);
    }
  }

  private addFunctionResponses(contents: Content[], functionResponses: any[]): void {
    if (functionResponses.length > 0) {
      contents.push({
        role: 'user',
        parts: functionResponses.map(fr => ({ functionResponse: fr }))
      });
    }
  }

  private buildSuccessResult(
    finalResponse: any,
    functionCallsHistory: FunctionCallHistory[],
    iterations: number,
    conversationHistory: Content[]
  ): FunctionCallResult {
    return {
      response: finalResponse.text || 'No response text',
      functionUsed: functionCallsHistory.length > 0,
      functionCalls: functionCallsHistory,
      iterations: iterations,
      conversationHistory: conversationHistory
    };
  }
}