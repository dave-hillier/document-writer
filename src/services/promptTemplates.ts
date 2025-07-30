import type { DocumentConfig, DocumentOutline, Section, StylePrompt } from '../types';
import workflowPromptContent from '../workflow-prompt.md?raw';
import defaultStyleContent from '../default-style-prompt.md?raw';

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

## Task

Generate a detailed outline that serves the specific document requirements. **CRITICAL**: Analyze the user's request to determine the optimal section structure - do not follow rigid templates.

**Section Structure Requirements:**
1. **Analyze Context First**: Examine the user's topic, intended audience, and document purpose to determine what sections are actually needed
2. **Create 4-8 Contextual Sections**: Each section should have a role that logically serves the document's objectives
3. **Dynamic Role Assignment**: Section roles should emerge from the content needs, not predefined templates
4. **Logical Progression**: Ensure sections flow logically toward achieving the document's purpose
5. **Sub-steps for Each Section**: Provide 3-5 sub-steps that guide content development for each section's specific role

**Examples of Context-Driven Thinking:**
- A "how-to" document might need: Problem Context → Prerequisites → Step-by-Step Process → Troubleshooting → Next Steps
- A "business proposal" might need: Executive Summary → Market Opportunity → Solution Approach → Implementation Plan → ROI Analysis
- A "research analysis" might need: Background → Methodology → Findings → Implications → Future Directions
- A "personal story" might need: Setting the Scene → The Challenge → The Journey → Key Insights → Lessons Learned

Follow the style guidelines for HOW to write each section, but let the content determine WHICH sections to include.

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
- **Sub-steps to cover**: ${section.subSteps.join(', ')}`;
}