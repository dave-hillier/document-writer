import React, { useState } from 'react';
import type { DocumentConfig as IDocumentConfig } from '../types';
import { createDocumentConfig, documentConfigToFormData } from '../business/documentConfigHelpers';
import { useAppContext } from '../contexts/useAppContext';
import { KnowledgeBaseSelector } from './KnowledgeBaseSelector';
import { StylePromptSelector } from './StylePromptSelector';
import { StylePromptManager } from './StylePromptManager';

interface DocumentConfigProps {
  onSubmit: (config: IDocumentConfig, prompt: string) => void;
}

export function DocumentConfig({ onSubmit }: DocumentConfigProps) {
  const { state } = useAppContext();
  const { documentConfig: config, isGenerating, isStreaming, streamingContent } = state;
  const formDefaults = documentConfigToFormData(config);
  const [tone, setTone] = useState(formDefaults.tone);
  const [allowed, setAllowed] = useState(formDefaults.allowed);
  const [denied, setDenied] = useState(formDefaults.denied);
  const [targetWordCount, setTargetWordCount] = useState(formDefaults.targetWordCount);
  const [prompt, setPrompt] = useState('');
  const [knowledgeBaseId, setKnowledgeBaseId] = useState<string | undefined>(config.knowledgeBaseId);
  const [stylePromptId, setStylePromptId] = useState<string | undefined>(config.stylePromptId);
  const [showStyleManager, setShowStyleManager] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newConfig = createDocumentConfig({
      tone,
      allowed,
      denied,
      targetWordCount,
      prompt,
      knowledgeBaseId,
      stylePromptId
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

        <label htmlFor="document-tone">
          Tone
          <select
            id="document-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            aria-label="Select document tone"
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="academic">Academic</option>
            <option value="creative">Creative</option>
            <option value="technical">Technical</option>
          </select>
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

        <div data-style-selector-group>
          <StylePromptSelector 
            selectedId={stylePromptId}
            onChange={setStylePromptId}
          />
          <button
            type="button"
            onClick={() => setShowStyleManager(true)}
            className="secondary"
            data-manage-button
          >
            Manage Styles
          </button>
        </div>

        <button
          type="submit"
          disabled={isGenerating || !prompt}
          aria-busy={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Outline'}
        </button>
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
      
      {showStyleManager && (
        <StylePromptManager onClose={() => setShowStyleManager(false)} />
      )}
    </form>
  );
}