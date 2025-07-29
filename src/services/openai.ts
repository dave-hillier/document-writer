import type { DocumentConfig, DocumentOutline, Section } from '../types';
import systemPromptContent from '../system-prompt.md?raw';
import { ResponsesService } from './responses';
import { createOutlinePrompt, createSectionPrompt } from './promptTemplates';

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

  constructor() {
    this.responsesService = new ResponsesService();
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
    // Structure prompt with static content first for optimal caching
    const prompt = createOutlinePrompt({
      systemPromptContent,
      config,
      userPrompt
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
      previousContent
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