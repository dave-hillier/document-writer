import type { DocumentConfig, DocumentOutline, Section, StylePrompt } from '../types';
import workflowPromptContent from '../workflow-prompt.md?raw';
import defaultStyleContent from '../default-style-prompt.md?raw';
import outlineSystemPromptContent from '../outline-system-prompt.md?raw';

export interface OutlinePromptParams {
  config: DocumentConfig;
  userPrompt: string;
  knowledgeBaseContext?: string;
  stylePrompt?: StylePrompt;
}

export interface SectionPromptParams {
  config: DocumentConfig;
  outline: DocumentOutline;
  section: Section;
  currentSectionIndex: number;
  outlineStructure: string;
  previousContent: string;
  knowledgeBaseContext?: string;
  stylePrompt?: StylePrompt;
}

export function createOutlinePrompt(params: OutlinePromptParams): string {
  const { config, userPrompt, knowledgeBaseContext, stylePrompt } = params;
  
  const styleContent = stylePrompt?.content || defaultStyleContent;
  
  return `${workflowPromptContent}

${styleContent}

${outlineSystemPromptContent}

## Configuration

- **Tone**: ${config.tone}
- **Allowed narrative elements**: ${config.narrativeElements.allowed.join(', ') || 'None specified'}
- **Denied narrative elements**: ${config.narrativeElements.denied.join(', ') || 'None specified'}
- **Target word count**: ${config.targetWordCount}

## User Request

${userPrompt}${knowledgeBaseContext ? `\n\n## Knowledge Base Context\n\n${knowledgeBaseContext}` : ''}`;
}

export function createSectionPrompt(params: SectionPromptParams): string {
  const { 
    config, 
    outline, 
    section, 
    currentSectionIndex, 
    outlineStructure, 
    previousContent,
    knowledgeBaseContext,
    stylePrompt 
  } = params;

  const styleContent = stylePrompt?.content || defaultStyleContent;

  // Optimize prompt structure for maximum caching: most static content first, most variable content last
  return `${workflowPromptContent}

${styleContent}

## Section Generation Task

Write a section with exactly 400-800 words that:

1. Fulfills the section's designated role
2. Covers all the sub-steps comprehensively
3. Maintains the specified tone consistently
4. Follows the style guidelines provided above
5. Uses only allowed narrative elements
6. Avoids denied narrative elements completely
7. Flows naturally from previous sections (if any)
8. Positions content appropriately within the overall document structure
9. Avoids concluding prematurely if there are more sections to follow

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
- **Sub-steps to cover**: ${section.subSteps.join(', ')}${section.directions && section.directions.length > 0 ? `

**IMPORTANT - Cues to Respond To:**
${section.directions.map((cue, i) => `${i + 1}. ${cue}`).join('\n')}

Your content must directly address each of these cues as if answering the prompts.` : ''}`;
}