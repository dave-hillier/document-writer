import OpenAI from 'openai';
import type { DocumentOutline } from '../types';

const getOpenAIClient = (): OpenAI => {
  const apiKey = localStorage.getItem('openai-api-key');
  if (!apiKey) {
    throw new Error('Please set your OpenAI API key in settings');
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
};

const OUTLINE_EXTRACTION_PROMPT = `You are an expert at analyzing documents and extracting their structural outline.

**CRITICAL**: Analyze the document to determine the optimal section structure - do not follow rigid templates.

Extract the document's outline in the following JSON format:
{
  "title": "Document Title",
  "sections": [
    {
      "title": "Section Title",
      "role": "Introduction|Background/Context|Problem/Challenge|Analysis|Solution/Approach|Implementation|Results/Outcomes|Conclusion",
      "subSteps": [
        "First key point or sub-topic",
        "Second key point or sub-topic",
        "Third key point or sub-topic",
        "Fourth key point or sub-topic (optional)",
        "Fifth key point or sub-topic (optional)"
      ],
      "cues": [
        "Define microservices as distributed system architecture",
        "Compare microservices benefits over monolithic limitations", 
        "Address scalability challenges with horizontal scaling"
      ],
      "narrativeElements": [
        "examples",
        "breath work",
        "progressive relaxation",
        "visualization" 
      ]
    }
  ]
}

**Section Structure Requirements:**
1. **Analyze Context First**: Examine the document's topic, intended audience, and purpose to determine what sections are actually needed
2. **Extract 4-8 Logical Sections**: Each section should have a clear, specific purpose in the document
3. **Concise Role Assignment**: Write section roles as just a few words that describe the section's purpose (e.g., "Introduction", "Problem", "Solution", "Implementation")
4. **Logical Progression**: Ensure sections flow logically toward achieving the document's purpose
5. **Brief Sub-steps**: Provide 3-5 concise sub-steps that guide content development for each section
6. **Cues**: For each section, provide 2-4 imperative cues that guide content generation. These are direct prompts or commands that the section should respond to
7. **Narrative Elements**: For each section, identify appropriate narrative elements that would enhance the content

**Cues Guidelines:**
- Think of cues as imperative writing prompts that each section must address
- Frame as direct commands or prompts that trigger specific responses
- Use cue-response format: "Define microservices as distributed system architecture"
- Keep cues focused and specific to the section's purpose
- Ensure each cue can be meaningfully answered within the section

**Narrative Elements Guidelines:**
- Generate single-word elements that capture the essence of the section's communication style
- Generate elements based on what's actually needed for the specific content - don't use a fixed list
- Create words that truly describe how the section should communicate its ideas
- Choose 2-5 contextually appropriate elements per section

Return ONLY valid JSON without any markdown formatting or explanation.`;

export async function extractOutlineFromFile(file: File): Promise<DocumentOutline> {
  const openai = getOpenAIClient();
  
  try {
    // Read file content
    const content = await file.text();
    
    // Extract outline using OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: OUTLINE_EXTRACTION_PROMPT
        },
        {
          role: 'user',
          content: `Extract the outline from this document:\n\n${content.substring(0, 30000)}` // Limit content length
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const outlineData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Add IDs to sections
    const outline: DocumentOutline = {
      title: outlineData.title || 'Untitled Document',
      sections: (outlineData.sections || []).map((section: { title: string; role: string; subSteps?: string[]; cues?: string[]; narrativeElements?: string[] }, index: number) => ({
        id: `section-${Date.now()}-${index}`,
        title: section.title,
        role: section.role,
        subSteps: section.subSteps || [],
        cues: section.cues || [],
        narrativeElements: section.narrativeElements || []
      }))
    };

    return outline;
  } catch (error) {
    console.error('Failed to extract outline:', error);
    throw new Error('Failed to extract document outline');
  }
}

export function outlineToMarkdown(outline: DocumentOutline): string {
  let markdown = `# ${outline.title}\n\n`;
  
  outline.sections.forEach((section, index) => {
    markdown += `## ${index + 1}. ${section.title}\n`;
    markdown += `**Role:** ${section.role}\n\n`;
    markdown += `**Key Points:**\n`;
    section.subSteps.forEach(step => {
      markdown += `- ${step}\n`;
    });
    
    if (section.cues && section.cues.length > 0) {
      markdown += `\n**Cues:**\n`;
      section.cues.forEach(cue => {
        markdown += `- ${cue}\n`;
      });
    }
    
    if (section.narrativeElements && section.narrativeElements.length > 0) {
      markdown += `\n**Narrative Elements:**\n`;
      section.narrativeElements.forEach(element => {
        markdown += `- ${element}\n`;
      });
    }
    
    markdown += '\n';
  });
  
  return markdown;
}