import OpenAI from 'openai';

function createOpenAIClient(): OpenAI {
  const apiKey = localStorage.getItem('openai-api-key');
  if (!apiKey) {
    throw new Error('Please set your OpenAI API key in settings');
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
}

export async function createResponse(
  input: string,
  previousResponseId: string | null,
  onChunk: (chunk: string) => void,
  onComplete: (responseId: string, cacheMetrics?: { cachedTokens: number; totalTokens: number }) => void,
  onError: (error: Error) => void,
  shouldStop?: () => boolean,
  promptCacheKey?: string,
  model?: string,
  logType?: 'outline_generation' | 'section_generation'
): Promise<void> {
  const actualModel = model || localStorage.getItem('openai-model') || 'gpt-4o';
  const startTime = Date.now();
  
  // Log the prompt
  if (logType) {
    console.log(`🤖 [${logType.toUpperCase()}] Starting ${actualModel}`, {
      model: actualModel,
      promptLength: input.length,
      cacheKey: promptCacheKey,
      previousResponseId
    });
    console.log(`📝 Prompt:`, input.substring(0, 500) + (input.length > 500 ? '...' : ''));
  }

  let fullResponse = '';

  try {
    const openai = createOpenAIClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (openai as any).responses.create({
      input,
      model: actualModel,
      stream: true,
      previous_response_id: previousResponseId,
      store: true,
      ...(promptCacheKey && { prompt_cache_key: promptCacheKey })
    });

    let responseId: string | null = null;
    let cacheMetrics: { cachedTokens: number; totalTokens: number } | undefined;

    for await (const event of response) {
      if (shouldStop && shouldStop()) {
        throw new Error('Generation stopped by user');
      }
      
      if (event.type === 'response.output_text.delta') {
        if (event.delta) {
          fullResponse += event.delta;
          onChunk(event.delta);
        }
      } else if (event.type === 'response.completed') {
        responseId = event.response?.id || null;
        // Extract cache metrics from usage data
        const usage = event.response?.usage;
        if (usage?.prompt_tokens_details?.cached_tokens !== undefined) {
          cacheMetrics = {
            cachedTokens: usage.prompt_tokens_details.cached_tokens,
            totalTokens: usage.prompt_tokens
          };
        }
      } else if (event.type === 'response.created') {
        // Response started, no action needed
      } else {
        // Unexpected event type
      }
    }

    if (responseId) {
      // Log the complete response
      if (logType) {
        const duration = Date.now() - startTime;
        console.log(`✅ [${logType.toUpperCase()}] Completed in ${duration}ms`, {
          responseId,
          responseLength: fullResponse.length,
          cacheMetrics,
          duration
        });
        console.log(`💬 Response:`, fullResponse.substring(0, 500) + (fullResponse.length > 500 ? '...' : ''));
      }
      onComplete(responseId, cacheMetrics);
    } else {
      throw new Error('No response ID received from API');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Response creation failed';
    const duration = Date.now() - startTime;
    if (logType) {
      console.error(`❌ [${logType.toUpperCase()}] Failed after ${duration}ms:`, errorMessage);
    }
    onError(error instanceof Error ? error : new Error(errorMessage));
  }
}