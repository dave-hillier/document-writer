import type { DocumentConfig, DocumentOutline, Section } from '../types';

export interface OutlinePromptParams {
  systemPromptContent: string;
  config: DocumentConfig;
  userPrompt: string;
  knowledgeBaseContext?: string;
}

export interface SectionPromptParams {
  systemPromptContent: string;
  config: DocumentConfig;
  outline: DocumentOutline;
  section: Section;
  currentSectionIndex: number;
  outlineStructure: string;
  previousContent: string;
  knowledgeBaseContext?: string;
}

export function createOutlinePrompt(params: OutlinePromptParams): string {
  const { systemPromptContent, config, userPrompt, knowledgeBaseContext } = params;
  
  return `${systemPromptContent}

## Task

Generate a detailed outline following the structure described in the system prompt. The outline should have 4-8 sections, each with a clear role and 3-5 sub-steps.

## Configuration

- **Tone**: ${config.tone}
- **Allowed narrative elements**: ${config.narrativeElements.allowed.join(', ') || 'None specified'}
- **Denied narrative elements**: ${config.narrativeElements.denied.join(', ') || 'None specified'}
- **Target word count**: ${config.targetWordCount}

## Output Format

**IMPORTANT**: Return ONLY valid JSON in this exact format, with no additional text:

\`\`\`json
{
  "title": "Document Title",
  "sections": [
    {
      "id": "unique-id",
      "title": "Section Title",
      "role": "Section Role",
      "subSteps": ["step1", "step2", "step3"]
    }
  ]
}
\`\`\`

## User Request

${userPrompt}${knowledgeBaseContext ? `\n\n## Knowledge Base Context\n\n${knowledgeBaseContext}` : ''}`;
}

export function createSectionPrompt(params: SectionPromptParams): string {
  const { 
    systemPromptContent, 
    config, 
    outline, 
    section, 
    currentSectionIndex, 
    outlineStructure, 
    previousContent,
    knowledgeBaseContext 
  } = params;

  // Optimize prompt structure for maximum caching: most static content first, most variable content last
  return `${systemPromptContent}

## Section Generation Task

Write a section with exactly 400-800 words that:

1. Fulfills the section's designated role
2. Covers all the sub-steps comprehensively
3. Maintains the specified tone consistently
4. Uses only allowed narrative elements
5. Avoids denied narrative elements completely
6. Flows naturally from previous sections (if any)
7. Positions content appropriately within the overall document structure
8. Avoids concluding prematurely if there are more sections to follow

**CRITICAL**: Your response must contain exactly 400-800 words. Count your words carefully.
**Write only the section content, no titles or metadata.**

## Document Configuration

- **Tone**: ${config.tone}
- **Allowed narrative elements**: ${config.narrativeElements.allowed.join(', ') || 'None specified'}
- **Denied narrative elements**: ${config.narrativeElements.denied.join(', ') || 'None specified'}

## Document Context

**Document Title**: ${outline.title}

### Full Document Outline

${outlineStructure}

${knowledgeBaseContext ? `## Knowledge Base Context\n\n${knowledgeBaseContext}\n` : ''}${previousContent ? `## Previous Sections\n\n${previousContent}\n` : ''}
## Current Section

- **Section**: ${section.title} (Section ${currentSectionIndex + 1} of ${outline.sections.length})
- **Role**: ${section.role}
- **Sub-steps to cover**: ${section.subSteps.join(', ')}`;
}