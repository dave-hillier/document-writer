import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { DocumentConfig as IDocumentConfig } from '../types';
import { createDocumentConfig, documentConfigToFormData } from '../business/documentConfigHelpers';
import { useAppContext } from '../contexts/useAppContext';
import { KnowledgeBaseSelector } from './KnowledgeBaseSelector';

interface DocumentConfigProps {
  onSubmit: (config: IDocumentConfig, prompt: string) => void;
  onLuckyGeneration?: () => void;
}

export function DocumentConfig({ onSubmit, onLuckyGeneration }: DocumentConfigProps) {
  const { state } = useAppContext();
  const { documentConfig: config, isGenerating, isStreaming, streamingContent, luckyGeneration, knowledgeBases } = state;
  const formDefaults = documentConfigToFormData(config);
  const [allowed, setAllowed] = useState(formDefaults.allowed);
  const [denied, setDenied] = useState(formDefaults.denied);
  const [targetWordCount, setTargetWordCount] = useState(formDefaults.targetWordCount);
  const [prompt, setPrompt] = useState('');
  const [knowledgeBaseId, setKnowledgeBaseId] = useState<string | undefined>(config.knowledgeBaseId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newConfig = createDocumentConfig({
      allowed,
      denied,
      targetWordCount,
      prompt,
      knowledgeBaseId
    });
    
    onSubmit(newConfig, prompt);
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Document configuration form">
      <fieldset>
        <legend>Document Configuration</legend>
      
        <label htmlFor="document-topic">
          Document Topic/Request
          <textarea
            id="document-topic"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Describe the document you want to create..."
            required
            aria-required="true"
          />
        </label>

        <label htmlFor="allowed-elements">
          Allowed Narrative Elements
          <input
            id="allowed-elements"
            type="text"
            value={allowed}
            onChange={(e) => setAllowed(e.target.value)}
            placeholder="examples, anecdotes, statistics..."
            aria-describedby="allowed-hint"
          />
          <small id="allowed-hint" data-hint>Comma-separated list of narrative elements to include</small>
        </label>

        <label htmlFor="denied-elements">
          Denied Narrative Elements
          <input
            id="denied-elements"
            type="text"
            value={denied}
            onChange={(e) => setDenied(e.target.value)}
            placeholder="personal opinions, speculation..."
            aria-describedby="denied-hint"
          />
          <small id="denied-hint" data-hint>Comma-separated list of narrative elements to avoid</small>
        </label>

        <label htmlFor="word-count">
          Target Word Count
          <input
            id="word-count"
            type="number"
            value={targetWordCount}
            onChange={(e) => setTargetWordCount(Number(e.target.value))}
            min={1000}
            step={500}
            aria-label="Target word count for the document"
          />
        </label>

        <KnowledgeBaseSelector 
          selectedId={knowledgeBaseId}
          onChange={setKnowledgeBaseId}
        />

        <div className="generation-buttons">
          <button
            type="submit"
            disabled={isGenerating || luckyGeneration.isGenerating || !prompt}
            aria-busy={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Outline'}
          </button>
          
          {onLuckyGeneration && knowledgeBases.length > 0 && (
            <button
              type="button"
              onClick={onLuckyGeneration}
              disabled={isGenerating || luckyGeneration.isGenerating}
              className="secondary lucky-button"
              aria-busy={luckyGeneration.isGenerating}
            >
              <Sparkles size={16} />
              {luckyGeneration.isGenerating ? 'Generating...' : "I'm Feeling Lucky"}
            </button>
          )}
        </div>
      </fieldset>
      
      {isStreaming && streamingContent && (
        <article aria-label="Generating outline" role="status" aria-live="polite">
          <header>
            <h3>Generating Outline...</h3>
          </header>
          <pre>
            {streamingContent}
            <span data-cursor aria-label="Generating">▋</span>
          </pre>
        </article>
      )}
      
    </form>
  );
}