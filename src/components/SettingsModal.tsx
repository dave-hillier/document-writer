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
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKey(localStorage.getItem('openai-api-key') || '');
      setSelectedModel(localStorage.getItem('openai-model') || 'gpt-4.1-nano');
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
    <dialog open className="modal" role="dialog" aria-labelledby="settings-title" aria-describedby="settings-description">
      <article>
        <header>
          <button
            aria-label="Close settings"
            rel="prev"
            onClick={onClose}
            className="close"
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
          <small id="api-key-hint" className="form-hint">
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
          <small id="model-hint" className="form-hint">
            {isLoadingModels 
              ? 'Fetching available models...' 
              : modelsError 
                ? `Error loading models: ${modelsError}` 
                : 'Select the OpenAI model to use for document generation.'
            }
          </small>
        </label>

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
              className="secondary"
            >
              Reset Database
            </button>
          </article>
        </section>
      
        <footer>
          <button
            onClick={onClose}
            className="secondary"
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