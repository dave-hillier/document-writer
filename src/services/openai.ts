import type { DocumentConfig, DocumentOutline, Section, StylePrompt } from '../types';
import { createResponse } from './responses';
import { createOutlinePrompt, createSectionPrompt } from './promptTemplates';
import * as vectorStore from './vectorStore';
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

export async function generateOutline(
    config: DocumentConfig, 
    userPrompt: string,
    responseId: string | null,
    onChunk: (chunk: string) => void,
    onComplete: (responseId: string, outline: DocumentOutline, cacheMetrics?: { cachedTokens: number; totalTokens: number }) => void,
    onError: (error: Error) => void,
    shouldStop?: () => boolean,
    stylePrompt?: StylePrompt
  ): Promise<void> {
    // Search knowledge base for outline examples if configured
    let knowledgeBaseContext = '';
    if (config.knowledgeBaseId) {
      try {
        const knowledgeBase = await indexedDBService.getKnowledgeBase(config.knowledgeBaseId);
        if (knowledgeBase && knowledgeBase.outlineVectorStoreId) {
          // Search the outline vector store for relevant outline examples
          const searchResults = await vectorStore.search(
            knowledgeBase.outlineVectorStoreId,
            userPrompt,
            { maxResults: 3, rewriteQuery: true }
          );
          
          if (searchResults.results.length > 0) {
            knowledgeBaseContext = 'Example outlines from similar documents:\n\n';
            searchResults.results.forEach((result, index) => {
              knowledgeBaseContext += `[${index + 1}] ${result.filename} (relevance: ${(result.score * 100).toFixed(1)}%):\n`;
              result.content.forEach(chunk => {
                if (chunk.type === 'text') {
                  knowledgeBaseContext += chunk.text + '\n';
                }
              });
              knowledgeBaseContext += '\n---\n\n';
            });
          }
        } else if (knowledgeBase) {
          // Fallback to content store for backward compatibility
          const searchResults = await vectorStore.search(
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
      config,
      userPrompt,
      knowledgeBaseContext,
      stylePrompt
    });

    let fullResponse = '';
    
    // Use cache key based on document configuration
    const cacheKey = `outline-${hashString(`${config.tone}-${config.targetWordCount}`)}`;
    
    // Use outline-specific model
    const outlineModel = localStorage.getItem('openai-model-outline') || localStorage.getItem('openai-model') || 'gpt-4.1-nano';
    
    await createResponse(
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
          
          const parsedOutline = JSON.parse(jsonContent) as DocumentOutline;
          // Add unique IDs to sections based on title hash
          const outline: DocumentOutline = {
            ...parsedOutline,
            sections: parsedOutline.sections.map((section, index) => ({
              ...section,
              id: `section-${hashString(section.title)}-${index}`
            }))
          };
          onComplete(newResponseId, outline, cacheMetrics);
        } catch {
          console.error('Failed to parse JSON response:', fullResponse);
          onError(new Error('Invalid JSON response. Please try again.'));
        }
      },
      onError,
      shouldStop,
      cacheKey,
      outlineModel
    );
  }

export async function generateSection(
    section: Section, 
    config: DocumentConfig, 
    outline: DocumentOutline,
    previousSections: Section[],
    responseId: string | null,
    onChunk: (chunk: string) => void,
    onComplete: (responseId: string, content: string, wordCount: number, cacheMetrics?: { cachedTokens: number; totalTokens: number }) => void,
    onError: (error: Error) => void,
    shouldStop?: () => boolean,
    stylePrompt?: StylePrompt
  ): Promise<void> {
    // Search knowledge base for section-specific context
    let knowledgeBaseContext = '';
    if (config.knowledgeBaseId) {
      try {
        const knowledgeBase = await indexedDBService.getKnowledgeBase(config.knowledgeBaseId);
        if (knowledgeBase) {
          // Search using section title and sub-steps
          const sectionQuery = `${section.title} ${section.subSteps.join(' ')}`;
          const searchResults = await vectorStore.search(
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
      config,
      outline,
      section,
      currentSectionIndex,
      outlineStructure,
      previousContent,
      knowledgeBaseContext,
      stylePrompt
    });

    let fullContent = '';
    
    // Cache key that includes section ID to ensure uniqueness per section
    const cacheKey = `section-${hashString(`${config.tone}-${outline.title}-${section.title}-${section.id}`)}`;
    
    // Use generation-specific model
    const generationModel = localStorage.getItem('openai-model-generation') || localStorage.getItem('openai-model') || 'gpt-4.1-nano';
    
    await createResponse(
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
      cacheKey,
      generationModel
    );
  }