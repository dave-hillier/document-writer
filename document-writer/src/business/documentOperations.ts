import type { DocumentConfig, DocumentOutline, Section } from '../types';
import { DocumentGenerator } from '../services/openai';

export interface GenerateOutlineParams {
  config: DocumentConfig;
  prompt: string;
  apiKey: string;
  responseId: string | null;
}

export interface GenerateSectionParams {
  sectionId: string;
  apiKey: string;
  outline: DocumentOutline;
  sections: Section[];
  documentConfig: DocumentConfig;
  responseId: string | null;
}

export interface GenerateAllSectionsParams {
  apiKey: string;
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
}

export interface SectionResult {
  responseId: string;
  sectionId: string;
  content: string;
  wordCount: number;
}

export async function generateOutline(
  params: GenerateOutlineParams,
  callbacks: StreamingCallbacks
): Promise<OutlineResult> {
  const { config, prompt, apiKey, responseId } = params;
  const { onChunk } = callbacks;

  if (!apiKey) {
    throw new Error('Please set your OpenAI API key in settings');
  }

  const generator = new DocumentGenerator(apiKey);
  
  return new Promise((resolve, reject) => {
    generator.generateOutline(
      config,
      prompt,
      responseId,
      onChunk,
      (responseId, outline) => {
        resolve({ responseId, outline });
      },
      reject
    );
  });
}

export async function generateSection(
  params: GenerateSectionParams,
  callbacks: StreamingCallbacks
): Promise<SectionResult> {
  const { sectionId, apiKey, outline, sections, documentConfig, responseId } = params;
  const { onChunk } = callbacks;

  if (!outline || !apiKey) {
    throw new Error('Missing outline or API key');
  }

  const sectionIndex = sections.findIndex(s => s.id === sectionId);
  const section = sections[sectionIndex];
  if (!section) {
    throw new Error('Section not found');
  }

  const generator = new DocumentGenerator(apiKey);
  const previousSections = sections.slice(0, sectionIndex).filter(s => s.content);
  
  return new Promise((resolve, reject) => {
    generator.generateSection(
      section,
      documentConfig,
      outline,
      previousSections,
      responseId,
      onChunk,
      (responseId, content, wordCount) => {
        resolve({ responseId, sectionId, content, wordCount });
      },
      reject
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
  const { apiKey, outline, sections, documentConfig, responseId, onSectionStart, shouldStop } = params;
  const { onChunk, onSectionGenerated, onSectionStarted } = callbacks;

  if (!outline || !apiKey) {
    throw new Error('Missing outline or API key');
  }

  const incompleteSections = sections.filter(s => !s.content);
  if (incompleteSections.length === 0) {
    return;
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    if (shouldStop()) {
      throw new Error('Generation stopped by user');
    }

    if (section.content) continue;

    onSectionStart(i);
    onSectionStarted(section.id);

    const sectionParams: GenerateSectionParams = {
      sectionId: section.id,
      apiKey,
      outline,
      sections,
      documentConfig,
      responseId
    };

    const result = await generateSection(sectionParams, { onChunk });
    onSectionGenerated(result);
    
    if (shouldStop()) {
      throw new Error('Generation stopped by user');
    }
  }
}