import { Content, FunctionCallHistory, FunctionCallResult, IAIService, IFunctionService } from "../types/ai";
import { FunctionDeclarationService } from "./functionDeclarationService";


export class FunctionService implements IFunctionService {
  private readonly aiService: IAIService;
  private readonly functionDeclarationService: FunctionDeclarationService;
  private contents: Content[];
  private readonly MAX_ITERATIONS = 100;

  constructor(aiService: IAIService, functionDeclarationService: FunctionDeclarationService) {
    this.aiService = aiService;
    this.functionDeclarationService = functionDeclarationService;
    this.contents = this.getInitialConversation();
  }

  async handleFunctionCalling(message: string): Promise<FunctionCallResult> {
    let iterations = 0;
    let currentContents = [...this.contents];
    const functionCallsHistory: FunctionCallHistory[] = [];

    try {
      this.addUserMessage(currentContents, message);

      const finalResponse = await this.processFunctionCalls(
        currentContents,
        functionCallsHistory,
        iterations
      );

      this.updateConversation(currentContents, finalResponse);

      return this.buildSuccessResult(finalResponse, functionCallsHistory, iterations);
    } catch (error) {
      console.error('Error in function calling:', error);
      throw error;
    }
  }

  getConversation(): Content[] {
    return this.contents;
  }

  clearConversation(): void {
    this.contents = this.getInitialConversation();
  }

  private getInitialConversation(): Content[] {
    return [
      {
        role: "user",
        parts: [{ text: "Hello" }],
      },
      {
        role: "model",
        parts: [{
          text: `Great to meet you. Today is ${new Date().toDateString()} What would you like to know?`
        }]
      },
    ];
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

  private updateConversation(contents: Content[], finalResponse: any): void {
    if (finalResponse.candidates?.[0]?.content) {
      contents.push(finalResponse.candidates[0].content);
    }
    this.contents = contents;
  }

  private buildSuccessResult(
    finalResponse: any,
    functionCallsHistory: FunctionCallHistory[],
    iterations: number
  ): FunctionCallResult {
    return {
      response: finalResponse.text || 'No response text',
      functionUsed: functionCallsHistory.length > 0,
      functionCalls: functionCallsHistory,
      iterations: iterations
    };
  }
}