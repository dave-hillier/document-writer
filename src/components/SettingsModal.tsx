import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { ModelsService } from '../services/models';
import type { ModelInfo } from '../services/models';
import { indexedDBService } from '../services/indexeddb';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [key, setKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [preprocessingModel, setPreprocessingModel] = useState('');
  const [outlineModel, setOutlineModel] = useState('');
  const [generationModel, setGenerationModel] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKey(localStorage.getItem('openai-api-key') || '');
      const defaultModel = localStorage.getItem('openai-model') || 'gpt-4.1-nano';
      setSelectedModel(defaultModel);
      
      // Load advanced model settings with fallback to default model
      setPreprocessingModel(localStorage.getItem('openai-model-preprocessing') || defaultModel);
      setOutlineModel(localStorage.getItem('openai-model-outline') || defaultModel);
      setGenerationModel(localStorage.getItem('openai-model-generation') || defaultModel);
      
      // Show advanced section if any model differs from default
      const hasCustomModels = 
        (localStorage.getItem('openai-model-preprocessing') && localStorage.getItem('openai-model-preprocessing') !== defaultModel) ||
        (localStorage.getItem('openai-model-outline') && localStorage.getItem('openai-model-outline') !== defaultModel) ||
        (localStorage.getItem('openai-model-generation') && localStorage.getItem('openai-model-generation') !== defaultModel);
      setShowAdvanced(!!hasCustomModels);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchModels = async () => {
      if (!key || !isOpen) return;

      setIsLoadingModels(true);
      setModelsError(null);

      try {
        const modelsService = new ModelsService(key);
        const availableModels = await modelsService.getAvailableModels();
        setModels(availableModels);
      } catch (error) {
        setModelsError(error instanceof Error ? error.message : 'Failed to fetch models');
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [key, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('openai-api-key', key);
    localStorage.setItem('openai-model', selectedModel);
    
    // Save advanced model settings
    localStorage.setItem('openai-model-preprocessing', preprocessingModel);
    localStorage.setItem('openai-model-outline', outlineModel);
    localStorage.setItem('openai-model-generation', generationModel);
    
    onClose();
  };

  const handleResetDatabase = async () => {
    if (!confirm('This will delete all your documents and knowledge bases. Are you sure?')) {
      return;
    }

    try {
      await indexedDBService.resetDatabase();
      alert('Database reset successfully. Please refresh the page.');
      window.location.reload();
    } catch (error) {
      alert(`Failed to reset database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <dialog open data-modal role="dialog" aria-labelledby="settings-title" aria-describedby="settings-description">
      <article>
        <header>
          <button
            aria-label="Close settings"
            rel="prev"
            onClick={onClose}
            data-close
          >
            <X size={20} aria-hidden="true" />
          </button>
          <h3 id="settings-title">Settings</h3>
        </header>
      
        <label htmlFor="api-key">
          OpenAI API Key
          <input
            id="api-key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            aria-describedby="api-key-hint"
            required
          />
          <small id="api-key-hint" data-hint>
            Your API key is stored locally and never sent to any server except OpenAI.
          </small>
        </label>

        <label htmlFor="model-select">
          Model
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isLoadingModels || !key}
            aria-describedby="model-hint"
            required
          >
            {isLoadingModels ? (
              <option value="">Loading models...</option>
            ) : modelsError ? (
              <option value={selectedModel}>{selectedModel} (using fallback)</option>
            ) : (
              models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))
            )}
          </select>
          <small id="model-hint" data-hint>
            {isLoadingModels 
              ? 'Fetching available models...' 
              : modelsError 
                ? `Error loading models: ${modelsError}` 
                : 'Select the OpenAI model to use for document generation.'
            }
          </small>
        </label>

        <details open={showAdvanced}>
          <summary 
            role="button"
            onClick={(e) => {
              e.preventDefault();
              setShowAdvanced(!showAdvanced);
            }}
          >
            Advanced Model Settings
          </summary>
          
          <p data-hint>Configure different models for each stage of document generation.</p>
          
          <label htmlFor="preprocessing-model">
            Pre-processing Model
            <select
              id="preprocessing-model"
              value={preprocessingModel}
              onChange={(e) => setPreprocessingModel(e.target.value)}
              disabled={isLoadingModels || !key}
              aria-describedby="preprocessing-hint"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
            <small id="preprocessing-hint" data-hint>
              Used for knowledge base search and query rewriting. Lighter models work well here.
            </small>
          </label>

          <label htmlFor="outline-model">
            Outline Generation Model
            <select
              id="outline-model"
              value={outlineModel}
              onChange={(e) => setOutlineModel(e.target.value)}
              disabled={isLoadingModels || !key}
              aria-describedby="outline-hint"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
            <small id="outline-hint" data-hint>
              Creates the document structure. Benefits from good reasoning capabilities.
            </small>
          </label>

          <label htmlFor="generation-model">
            Content Generation Model
            <select
              id="generation-model"
              value={generationModel}
              onChange={(e) => setGenerationModel(e.target.value)}
              disabled={isLoadingModels || !key}
              aria-describedby="generation-hint"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
            <small id="generation-hint" data-hint>
              Writes the actual content for each section. Consider using your most capable model here.
            </small>
          </label>

          <button
            type="button"
            data-variant="secondary"
            data-outline
            onClick={() => {
              setPreprocessingModel(selectedModel);
              setOutlineModel(selectedModel);
              setGenerationModel(selectedModel);
            }}
            data-reset-button
          >
            Reset to Default Model
          </button>
        </details>

        <hr />
        
        <section>
          <h4>
            <AlertTriangle size={16} aria-hidden="true" />
            {' '}Danger Zone
          </h4>
          <article>
            <header>
              <strong>Reset Database</strong>
            </header>
            <p>This will delete all your documents and knowledge bases. This action cannot be undone.</p>
            <button 
              onClick={handleResetDatabase}
              data-variant="secondary"
            >
              Reset Database
            </button>
          </article>
        </section>
      
        <footer>
          <button
            onClick={onClose}
            data-variant="secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!key || !selectedModel}
          >
            Save
          </button>
        </footer>
      </article>
    </dialog>
  );
}