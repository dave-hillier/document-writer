import type { DocumentConfig } from '../types';

export interface DocumentConfigFormData {
  allowed: string;
  denied: string;
  targetWordCount: number;
  prompt: string;
  knowledgeBaseId?: string;
}

export function createDocumentConfig(formData: DocumentConfigFormData): DocumentConfig {
  const { allowed, denied, targetWordCount, knowledgeBaseId } = formData;
  
  return {
    narrativeElements: {
      allowed: allowed.split(',').map(s => s.trim()).filter(s => s),
      denied: denied.split(',').map(s => s.trim()).filter(s => s)
    },
    targetWordCount,
    knowledgeBaseId
  };
}

export function documentConfigToFormData(config: DocumentConfig): Omit<DocumentConfigFormData, 'prompt'> {
  return {
    allowed: config.narrativeElements.allowed.join(', '),
    denied: config.narrativeElements.denied.join(', '),
    targetWordCount: config.targetWordCount,
    knowledgeBaseId: config.knowledgeBaseId
  };
}