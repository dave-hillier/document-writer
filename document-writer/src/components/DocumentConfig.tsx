import React, { useState } from 'react';
import type { DocumentConfig as IDocumentConfig } from '../types';

interface DocumentConfigProps {
  config: IDocumentConfig;
  onSubmit: (config: IDocumentConfig, prompt: string) => void;
  isGenerating: boolean;
}

export function DocumentConfig({ config, onSubmit, isGenerating }: DocumentConfigProps) {
  const [tone, setTone] = useState(config.tone);
  const [allowed, setAllowed] = useState(config.narrativeElements.allowed.join(', '));
  const [denied, setDenied] = useState(config.narrativeElements.denied.join(', '));
  const [targetWordCount, setTargetWordCount] = useState(config.targetWordCount);
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newConfig: IDocumentConfig = {
      tone,
      narrativeElements: {
        allowed: allowed.split(',').map(s => s.trim()).filter(s => s),
        denied: denied.split(',').map(s => s.trim()).filter(s => s)
      },
      targetWordCount
    };
    
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
          <small id="allowed-hint" className="form-hint">Comma-separated list of narrative elements to include</small>
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
          <small id="denied-hint" className="form-hint">Comma-separated list of narrative elements to avoid</small>
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

        <button
          type="submit"
          disabled={isGenerating || !prompt}
          aria-busy={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Outline'}
        </button>
      </fieldset>
    </form>
  );
}