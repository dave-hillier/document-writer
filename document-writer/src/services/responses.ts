import OpenAI from 'openai';

export class ResponsesService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async createResponse(
    input: string,
    previousResponseId: string | null,
    onChunk: (chunk: string) => void,
    onComplete: (responseId: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await (this.openai as any).responses.create({
        input,
        model: 'gpt-4o',
        stream: true,
        previous_response_id: previousResponseId,
        store: true
      });

      let responseId: string | null = null;

      for await (const event of response) {
        if (event.type === 'response.delta') {
          if (event.delta?.content) {
            onChunk(event.delta.content);
          }
        } else if (event.type === 'response.completed') {
          responseId = event.response?.id || null;
        }
      }

      if (responseId) {
        onComplete(responseId);
      } else {
        throw new Error('No response ID received from API');
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Response creation failed'));
    }
  }
}