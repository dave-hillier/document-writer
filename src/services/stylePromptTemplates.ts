import type { StylePrompt } from '../types';
import defaultStyleContent from '../default-style-prompt.md?raw';

export function createDefaultStylePrompts(): StylePrompt[] {
  const now = Date.now();
  
  return [
    {
      id: 'default',
      name: 'Default Professional',
      description: 'Clear, professional writing style suitable for most business documents',
      content: defaultStyleContent,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'academic',
      name: 'Academic Style',
      description: 'Formal academic writing with citations and scholarly tone',
      content: `# Academic Writing Style

## Writing Style

- Use formal, scholarly language throughout
- Maintain objective, analytical tone
- Support all claims with evidence or citations
- Use precise terminology and avoid colloquialisms
- Structure paragraphs with clear topic sentences
- Include transitions that connect ideas logically

## Tone and Voice

The academic writing style should be:
- Formal and objective
- Analytical rather than descriptive
- Evidence-based and scholarly
- Clear and precise without being verbose

## Content Structure

- Begin sections with clear thesis statements
- Present arguments systematically
- Use evidence to support each major point
- Address counterarguments where appropriate
- Conclude sections with synthesis of key findings

## Language Guidelines

- Use passive voice where appropriate for objectivity
- Employ disciplinary terminology accurately
- Maintain consistency in citation style
- Use hedging language (may, could, suggests) appropriately
- Avoid first-person pronouns unless specifically required

## Section Roles

- **Abstract/Introduction**: Establishes research context, states thesis, previews argument structure
- **Literature Review**: Surveys existing scholarship, identifies gaps, positions current work
- **Methodology**: Explains research approach, theoretical framework, analytical methods
- **Analysis**: Presents findings systematically, interprets evidence, builds arguments
- **Discussion**: Evaluates implications, addresses limitations, considers alternative interpretations  
- **Conclusion**: Synthesizes contributions, suggests future research directions`,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'creative',
      name: 'Creative & Engaging',
      description: 'Dynamic, storytelling approach with vivid examples and engaging narratives',
      content: `# Creative Writing Style

## Writing Style

- Use vivid, descriptive language that engages the senses
- Incorporate storytelling elements and anecdotes
- Vary sentence structure for rhythm and flow
- Use metaphors and analogies to illustrate complex concepts
- Create emotional connection with readers
- Balance creativity with clarity and purpose

## Tone and Voice

The creative writing style should be:
- Engaging and dynamic
- Warm and personable
- Imaginative yet informative
- Conversational but purposeful

## Content Structure

- Open sections with compelling hooks or stories
- Use narrative arcs to guide reader through content
- Include vivid examples and case studies
- Create mental images through descriptive language
- End sections with memorable takeaways

## Language Guidelines

- Use active voice predominantly
- Include sensory details and specific imagery
- Employ rhetorical questions to engage readers
- Use varied sentence lengths for pacing
- Include dialogue or quotes where appropriate
- Balance creativity with professional credibility

## Section Roles

- **Opening Hook**: Captivates with story, question, or vivid scene-setting
- **Context/Setup**: Builds world, introduces characters, establishes stakes
- **Rising Tension**: Develops conflict, explores challenges, builds momentum
- **Exploration**: Dives deep into themes, examines multiple perspectives creatively
- **Revelation/Insight**: Presents key discoveries through narrative or metaphor
- **Resolution**: Ties narrative threads together, provides satisfying closure
- **Reflection**: Offers deeper meaning, lasting insights, call to imagination`,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'technical',
      name: 'Technical Documentation',
      description: 'Precise, detailed style for technical documentation and specifications',
      content: `# Technical Writing Style

## Writing Style

- Use clear, concise language with precise terminology
- Focus on accuracy and completeness
- Structure information logically and hierarchically
- Include specific details, measurements, and specifications
- Use numbered lists and bullet points for clarity
- Avoid ambiguity and ensure reproducibility

## Tone and Voice

The technical writing style should be:
- Precise and authoritative
- Objective and factual
- Clear and unambiguous
- Professional and systematic

## Content Structure

- Begin with clear objectives or requirements
- Present information in logical sequence
- Use headings and subheadings for navigation
- Include step-by-step procedures where applicable
- Provide examples and code snippets as needed
- End with verification or testing criteria

## Language Guidelines

- Use present tense for current states and procedures
- Employ imperative mood for instructions
- Define technical terms on first use
- Use consistent terminology throughout
- Include specific measurements and values
- Avoid unnecessary qualifiers or hedging language

## Section Roles

- **Overview**: States objectives, scope, and system requirements clearly
- **Architecture/Design**: Details technical specifications, system components, data flow
- **Implementation**: Provides step-by-step procedures, code examples, configurations
- **Testing/Validation**: Documents test procedures, results, verification methods
- **Troubleshooting**: Identifies common issues, error conditions, diagnostic steps
- **Maintenance**: Covers ongoing operations, updates, monitoring requirements
- **Reference**: Summarizes key specifications, APIs, command references`,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'business',
      name: 'Business Executive',
      description: 'Strategic, results-focused style for executive summaries and business reports',
      content: `# Business Executive Style

## Writing Style

- Lead with key insights and bottom-line impact
- Use strategic language focused on outcomes
- Include concrete metrics and performance indicators
- Structure content for busy executives (executive summary approach)
- Emphasize ROI, competitive advantage, and business value
- Be concise while maintaining thoroughness

## Tone and Voice

The business executive style should be:
- Confident and decisive
- Results-oriented and strategic
- Professional and authoritative
- Direct and efficient

## Content Structure

- Start with executive summary or key findings
- Present strategic implications upfront
- Use data and metrics to support arguments
- Include actionable recommendations
- Address potential risks and mitigation strategies
- Conclude with clear next steps and timelines

## Language Guidelines

- Use active voice to convey decisiveness
- Include business terminology and KPIs
- Focus on measurable outcomes and benefits
- Use bullet points for key takeaways
- Emphasize competitive advantages
- Include calls-to-action and decision points

## Section Roles

- **Executive Summary**: Presents key findings, recommendations, and business impact upfront
- **Market Analysis**: Examines competitive landscape, opportunities, market conditions
- **Problem/Opportunity**: Identifies business challenges, gaps, strategic imperatives
- **Strategic Solution**: Outlines approach, competitive advantages, value proposition
- **Implementation Plan**: Details timeline, resources, milestones, risk mitigation
- **Financial Impact**: Projects ROI, costs, revenue potential, budget requirements
- **Next Steps**: Specifies immediate actions, decision points, success metrics`,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'casual',
      name: 'Casual & Conversational',
      description: 'Friendly, approachable style for blogs and informal communications',
      content: `# Casual Writing Style

## Writing Style

- Use conversational, friendly language
- Write as if speaking directly to the reader
- Include personal anecdotes and relatable examples
- Use contractions and informal expressions appropriately
- Maintain approachability while staying informative
- Balance personality with professionalism

## Tone and Voice

The casual writing style should be:
- Warm and approachable
- Conversational and friendly
- Relatable and down-to-earth
- Engaging and personable

## Content Structure

- Open with friendly, relatable introductions
- Use "you" to address readers directly
- Include personal insights and experiences
- Break up text with questions and asides
- Use everyday examples and analogies
- End with encouraging or motivating messages

## Language Guidelines

- Use first and second person pronouns
- Include contractions (don't, won't, can't)
- Use everyday vocabulary over technical jargon
- Ask rhetorical questions to engage readers
- Include colloquialisms and informal expressions
- Maintain authenticity while remaining professional

## Section Roles

- **Friendly Introduction**: Welcomes readers, sets conversational tone, previews what's coming
- **Background Story**: Shares context through personal experience or relatable scenarios
- **The Challenge**: Describes problems in relatable terms, acknowledges shared frustrations
- **Exploration**: Walks through ideas conversationally, includes personal insights and "aha" moments
- **What Works**: Shares practical solutions, tips, and real-world applications
- **Putting It Together**: Shows how to apply insights, includes encouragement and support
- **Wrap-Up**: Summarizes key takeaways, offers encouragement, invites continued conversation`,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    }
  ];
}

export async function initializeDefaultStylePrompts(
  saveStylePrompt: (stylePrompt: StylePrompt) => Promise<void>
): Promise<void> {
  const defaultPrompts = createDefaultStylePrompts();
  
  for (const prompt of defaultPrompts) {
    try {
      await saveStylePrompt(prompt);
    } catch (error) {
      console.error(`Failed to save default style prompt: ${prompt.name}`, error);
    }
  }
}