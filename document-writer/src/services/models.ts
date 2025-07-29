import OpenAI from 'openai';

export interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export class ModelsService {
  private openai: OpenAI;
  private cachedModels: ModelInfo[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    // Return cached models if still valid
    if (this.cachedModels && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cachedModels;
    }

    try {
      const response = await this.openai.models.list();
      
      // Filter to only include relevant chat models
      const chatModels = response.data.filter(model => 
        model.id.startsWith('gpt-') || 
        model.id.startsWith('o1-') ||
        model.id.includes('chat')
      ).sort((a, b) => a.id.localeCompare(b.id));

      this.cachedModels = chatModels;
      this.cacheTimestamp = Date.now();
      
      return chatModels;
    } catch (error) {
      // Return fallback models if API call fails
      const fallbackModels: ModelInfo[] = [
        { id: 'gpt-4.1-nano', object: 'model', created: 0, owned_by: 'openai' },
        { id: 'gpt-4o', object: 'model', created: 0, owned_by: 'openai' },
        { id: 'gpt-4o-mini', object: 'model', created: 0, owned_by: 'openai' },
        { id: 'gpt-4-turbo', object: 'model', created: 0, owned_by: 'openai' },
        { id: 'gpt-3.5-turbo', object: 'model', created: 0, owned_by: 'openai' }
      ];
      
      console.warn('Failed to fetch models from API, using fallback list:', error);
      return fallbackModels;
    }
  }

  clearCache(): void {
    this.cachedModels = null;
    this.cacheTimestamp = 0;
  }
}