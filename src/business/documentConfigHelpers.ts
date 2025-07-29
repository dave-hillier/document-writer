import type { DocumentConfig } from '../types';

export interface DocumentConfigFormData {
  tone: string;
  allowed: string;
  denied: string;
  targetWordCount: number;
  prompt: string;
  knowledgeBaseId?: string;
  stylePromptId?: string;
}

export function createDocumentConfig(formData: DocumentConfigFormData): DocumentConfig {
  const { tone, allowed, denied, targetWordCount, knowledgeBaseId, stylePromptId } = formData;
  
  return {
    tone,
    narrativeElements: {
      allowed: allowed.split(',').map(s => s.trim()).filter(s => s),
      denied: denied.split(',').map(s => s.trim()).filter(s => s)
    },
    targetWordCount,
    knowledgeBaseId,
    stylePromptId
  };
}

export function documentConfigToFormData(config: DocumentConfig): Omit<DocumentConfigFormData, 'prompt'> {
  return {
    tone: config.tone,
    allowed: config.narrativeElements.allowed.join(', '),
    denied: config.narrativeElements.denied.join(', '),
    targetWordCount: config.targetWordCount,
    knowledgeBaseId: config.knowledgeBaseId,
    stylePromptId: config.stylePromptId
  };
}