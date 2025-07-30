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
2. **Create 4-8 Contextual Sections**: Each section should have a unique, descriptive role that explains its specific function in the document
3. **Descriptive Role Assignment**: Write section roles as complete phrases that describe what the section accomplishes (e.g., "Establishes the historical context and significance of the topic" rather than just "Background")
4. **Logical Progression**: Ensure sections flow logically toward achieving the document's purpose
5. **Sub-steps for Each Section**: Provide 3-5 sub-steps that guide content development for each section's specific function

**Guidelines for Creating Descriptive Roles:**
- Each role should be a complete thought explaining the section's purpose
- Avoid generic labels like "Introduction", "Background", "Conclusion"
- Instead, describe what the section does: "Introduces the core challenge and why it matters to the reader"
- Roles should be specific to the content, not interchangeable templates
- Consider: What unique contribution does this section make to the overall document?

**Examples of Descriptive Roles:**
- Instead of "Introduction" → "Captures reader attention by presenting the central paradox"
- Instead of "Background" → "Traces the evolution of the problem over the past decade"
- Instead of "Solution" → "Presents a novel approach that addresses root causes rather than symptoms"
- Instead of "Conclusion" → "Synthesizes insights into actionable recommendations for the reader"

Let the content's unique requirements shape each section's descriptive role.

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