import OpenAI from 'openai';

export class ResponsesService {
  private openai: OpenAI;

  constructor() {
    const apiKey = localStorage.getItem('openai-api-key');
    if (!apiKey) {
      throw new Error('Please set your OpenAI API key in settings');
    }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (this.openai as any).responses.create({
        input,
        model: 'gpt-4o',
        stream: true,
        previous_response_id: previousResponseId,
        store: true
      });

      let responseId: string | null = null;

      for await (const event of response) {
        if (event.type === 'response.output_text.delta') {
          if (event.delta) {
            onChunk(event.delta);
          }
        } else if (event.type === 'response.completed') {
          responseId = event.response?.id || null;
        } else if (event.type === 'response.created') {
          // Response started, no action needed
        } else {
          // Log unexpected event types for debugging
          console.debug('Unexpected event type:', event.type);
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