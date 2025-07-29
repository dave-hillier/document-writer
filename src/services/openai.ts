import type { DocumentConfig, DocumentOutline, Section } from '../types';
import systemPromptContent from '../system-prompt.md?raw';
import { ResponsesService } from './responses';
import { createOutlinePrompt, createSectionPrompt } from './promptTemplates';
import { VectorStoreService } from './vectorStore';
import { indexedDBService } from './indexeddb';

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export class DocumentGenerator {
  private responsesService: ResponsesService;
  private vectorStoreService: VectorStoreService;

  constructor() {
    this.responsesService = new ResponsesService();
    this.vectorStoreService = new VectorStoreService();
  }

  async generateOutline(
    config: DocumentConfig, 
    userPrompt: string,
    responseId: string | null,
    onChunk: (chunk: string) => void,
    onComplete: (responseId: string, outline: DocumentOutline, cacheMetrics?: { cachedTokens: number; totalTokens: number }) => void,
    onError: (error: Error) => void,
    shouldStop?: () => boolean
  ): Promise<void> {
    // Search knowledge base if configured
    let knowledgeBaseContext = '';
    if (config.knowledgeBaseId) {
      try {
        const knowledgeBase = await indexedDBService.getKnowledgeBase(config.knowledgeBaseId);
        if (knowledgeBase) {
          const searchResults = await this.vectorStoreService.search(
            knowledgeBase.vectorStoreId,
            userPrompt,
            { maxResults: 5, rewriteQuery: true }
          );
          
          if (searchResults.results.length > 0) {
            knowledgeBaseContext = 'Relevant information from knowledge base:\n\n';
            searchResults.results.forEach((result, index) => {
              knowledgeBaseContext += `[${index + 1}] ${result.filename} (relevance: ${(result.score * 100).toFixed(1)}%):\n`;
              result.content.forEach(chunk => {
                if (chunk.type === 'text') {
                  knowledgeBaseContext += chunk.text + '\n';
                }
              });
              knowledgeBaseContext += '\n';
            });
          }
        }
      } catch (error) {
        console.error('Failed to search knowledge base:', error);
        // Continue without knowledge base context
      }
    }
    // Structure prompt with static content first for optimal caching
    const prompt = createOutlinePrompt({
      systemPromptContent,
      config,
      userPrompt,
      knowledgeBaseContext
    });

    let fullResponse = '';
    
    // Use cache key based on document configuration
    const cacheKey = `outline-${hashString(`${config.tone}-${config.targetWordCount}`)}`;
    
    await this.responsesService.createResponse(
      prompt,
      responseId,
      (chunk) => {
        fullResponse += chunk;
        onChunk(chunk);
      },
      (newResponseId, cacheMetrics) => {
        try {
          // Extract JSON from markdown code blocks if present
          const jsonMatch = fullResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          const jsonContent = jsonMatch ? jsonMatch[1].trim() : fullResponse.trim();
          
          const outline = JSON.parse(jsonContent) as DocumentOutline;
          onComplete(newResponseId, outline, cacheMetrics);
        } catch {
          console.error('Failed to parse JSON response:', fullResponse);
          onError(new Error('Invalid JSON response. Please try again.'));
        }
      },
      onError,
      shouldStop,
      cacheKey
    );
  }

  async generateSection(
    section: Section, 
    config: DocumentConfig, 
    outline: DocumentOutline,
    previousSections: Section[],
    responseId: string | null,
    onChunk: (chunk: string) => void,
    onComplete: (responseId: string, content: string, wordCount: number, cacheMetrics?: { cachedTokens: number; totalTokens: number }) => void,
    onError: (error: Error) => void,
    shouldStop?: () => boolean
  ): Promise<void> {
    // Search knowledge base for section-specific context
    let knowledgeBaseContext = '';
    if (config.knowledgeBaseId) {
      try {
        const knowledgeBase = await indexedDBService.getKnowledgeBase(config.knowledgeBaseId);
        if (knowledgeBase) {
          // Search using section title and sub-steps
          const sectionQuery = `${section.title} ${section.subSteps.join(' ')}`;
          const searchResults = await this.vectorStoreService.search(
            knowledgeBase.vectorStoreId,
            sectionQuery,
            { maxResults: 3, rewriteQuery: true }
          );
          
          if (searchResults.results.length > 0) {
            knowledgeBaseContext = 'Relevant information for this section:\n\n';
            searchResults.results.forEach((result, index) => {
              knowledgeBaseContext += `[${index + 1}] ${result.filename}:\n`;
              result.content.forEach(chunk => {
                if (chunk.type === 'text') {
                  knowledgeBaseContext += chunk.text + '\n';
                }
              });
              knowledgeBaseContext += '\n';
            });
          }
        }
      } catch (error) {
        console.error('Failed to search knowledge base for section:', error);
        // Continue without knowledge base context
      }
    }
    const outlineStructure = outline.sections
      .map((s, index) => `${index + 1}. ${s.title} (Role: ${s.role})`)
      .join('\n');

    const currentSectionIndex = outline.sections.findIndex(s => s.id === section.id);

    const previousContent = previousSections
      .map(s => `${s.title}:\n${s.content}`)
      .join('\n\n---\n\n');

    // Optimize prompt structure for maximum caching: most static content first
    const prompt = createSectionPrompt({
      systemPromptContent,
      config,
      outline,
      section,
      currentSectionIndex,
      outlineStructure,
      previousContent,
      knowledgeBaseContext
    });

    let fullContent = '';
    
    // Cache key for sections with same document configuration
    const cacheKey = `section-${hashString(`${config.tone}-${outline.title}`)}`;
    
    await this.responsesService.createResponse(
      prompt,
      responseId,
      (chunk) => {
        if (shouldStop && shouldStop()) {
          throw new Error('Generation stopped by user');
        }
        fullContent += chunk;
        onChunk(chunk);
      },
      (newResponseId, cacheMetrics) => {
        const wordCount = fullContent.split(/\s+/).filter(word => word.length > 0).length;
        onComplete(newResponseId, fullContent, wordCount, cacheMetrics);
      },
      onError,
      shouldStop,
      cacheKey
    );
  }
}