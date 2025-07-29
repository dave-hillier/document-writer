import type { DocumentConfig, DocumentOutline, Section, StylePrompt } from '../types';
import { generateOutline as generateOutlineService, generateSection as generateSectionService } from '../services/openai';
import { indexedDBService } from '../services/indexeddb';

export interface GenerateOutlineParams {
  config: DocumentConfig;
  prompt: string;
  responseId: string | null;
}

export interface GenerateSectionParams {
  sectionId: string;
  outline: DocumentOutline;
  sections: Section[];
  documentConfig: DocumentConfig;
  responseId: string | null;
  shouldStop?: () => boolean;
}

export interface GenerateAllSectionsParams {
  outline: DocumentOutline;
  sections: Section[];
  documentConfig: DocumentConfig;
  responseId: string | null;
  onSectionStart: (sectionIndex: number) => void;
  shouldStop: () => boolean;
}

export interface StreamingCallbacks {
  onChunk: (chunk: string) => void;
}

export interface OutlineResult {
  responseId: string;
  outline: DocumentOutline;
  cacheMetrics?: { cachedTokens: number; totalTokens: number };
}

export interface SectionResult {
  responseId: string;
  sectionId: string;
  content: string;
  wordCount: number;
  cacheMetrics?: { cachedTokens: number; totalTokens: number };
}

export async function generateOutline(
  params: GenerateOutlineParams,
  callbacks: StreamingCallbacks
): Promise<OutlineResult> {
  const { config, prompt, responseId } = params;
  const { onChunk } = callbacks;

  // Fetch style prompt if specified
  let stylePrompt: StylePrompt | undefined;
  if (config.stylePromptId) {
    try {
      stylePrompt = await indexedDBService.getStylePrompt(config.stylePromptId) || undefined;
    } catch (error) {
      console.error('Failed to fetch style prompt:', error);
    }
  }

  return new Promise((resolve, reject) => {
    generateOutlineService(
      config,
      prompt,
      responseId,
      onChunk,
      (responseId, outline, cacheMetrics) => {
        resolve({ responseId, outline, cacheMetrics });
      },
      reject,
      undefined,
      stylePrompt
    );
  });
}

export async function generateSection(
  params: GenerateSectionParams,
  callbacks: StreamingCallbacks
): Promise<SectionResult> {
  const { sectionId, outline, sections, documentConfig, responseId, shouldStop } = params;
  const { onChunk } = callbacks;

  if (!outline) {
    throw new Error('Missing outline');
  }

  const sectionIndex = sections.findIndex(s => s.id === sectionId);
  const section = sections[sectionIndex];
  if (!section) {
    throw new Error('Section not found');
  }

  const previousSections = sections.slice(0, sectionIndex).filter(s => s.content);
  
  // Fetch style prompt if specified
  let stylePrompt: StylePrompt | undefined;
  if (documentConfig.stylePromptId) {
    try {
      stylePrompt = await indexedDBService.getStylePrompt(documentConfig.stylePromptId) || undefined;
    } catch (error) {
      console.error('Failed to fetch style prompt:', error);
    }
  }
  
  return new Promise((resolve, reject) => {
    generateSectionService(
      section,
      documentConfig,
      outline,
      previousSections,
      responseId,
      onChunk,
      (responseId, content, wordCount, cacheMetrics) => {
        resolve({ responseId, sectionId, content, wordCount, cacheMetrics });
      },
      reject,
      shouldStop,
      stylePrompt
    );
  });
}

export async function generateAllSections(
  params: GenerateAllSectionsParams,
  callbacks: StreamingCallbacks & {
    onSectionGenerated: (result: SectionResult) => void;
    onSectionStarted: (sectionId: string) => void;
  }
): Promise<void> {
  const { outline, sections, documentConfig, responseId, onSectionStart, shouldStop } = params;
  const { onChunk, onSectionGenerated, onSectionStarted } = callbacks;

  if (!outline) {
    throw new Error('Missing outline');
  }

  const incompleteSections = sections.filter(s => !s.content);
  if (incompleteSections.length === 0) {
    return;
  }

  // Maintain local sections state to track content updates
  let currentSections = [...sections];

  for (let i = 0; i < currentSections.length; i++) {
    const section = currentSections[i];
    
    if (shouldStop()) {
      throw new Error('Generation stopped by user');
    }

    if (section.content) continue;

    onSectionStart(i);
    onSectionStarted(section.id);

    const sectionParams: GenerateSectionParams = {
      sectionId: section.id,
      outline,
      sections: currentSections,
      documentConfig,
      responseId,
      shouldStop
    };

    const result = await generateSection(sectionParams, { onChunk });
    
    // Update local sections with generated content
    currentSections = currentSections.map(s => 
      s.id === result.sectionId 
        ? { ...s, content: result.content, wordCount: result.wordCount }
        : s
    );
    
    onSectionGenerated(result);
    
    if (shouldStop()) {
      throw new Error('Generation stopped by user');
    }
  }
}

