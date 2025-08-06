import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppContext } from '../contexts/useAppContext';
import { ModelsService } from '../services/models';
import type { ModelInfo } from '../services/models';
import { indexedDBService } from '../services/indexeddb';
import OpenAI from 'openai';

export function SettingsPage() {
  const { dispatch } = useAppContext();
  const [key, setKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [preprocessingModel, setPreprocessingModel] = useState('');
  const [outlineModel, setOutlineModel] = useState('');
  const [generationModel, setGenerationModel] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDeletingFiles, setIsDeletingFiles] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    dispatch({
      type: 'PAGE_NAVIGATION_SET',
      payload: {
        title: 'Settings'
      }
    });
  }, [dispatch]);

  useEffect(() => {
    setKey(localStorage.getItem('openai-api-key') || '');
    const defaultModel = localStorage.getItem('openai-model') || 'gpt-4o';
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
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      if (!key) return;

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
  }, [key]);

  const handleSave = () => {
    localStorage.setItem('openai-api-key', key);
    localStorage.setItem('openai-model', selectedModel);
    
    // Save advanced model settings
    localStorage.setItem('openai-model-preprocessing', preprocessingModel);
    localStorage.setItem('openai-model-outline', outlineModel);
    localStorage.setItem('openai-model-generation', generationModel);
    
    setHasUnsavedChanges(false);
    alert('Settings saved successfully!');
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

  const handleDeleteAllFiles = async () => {
    if (!confirm('This will delete ALL files from OpenAI Files API (purpose: assistants). This action cannot be undone. Are you sure?')) {
      return;
    }

    if (!confirm('Are you absolutely sure? This will permanently delete all uploaded files from OpenAI servers.')) {
      return;
    }

    setIsDeletingFiles(true);
    setDeleteProgress('Getting files from OpenAI...');

    try {
      const apiKey = localStorage.getItem('openai-api-key');
      if (!apiKey) {
        throw new Error('No OpenAI API key found');
      }

      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });

      // Get all files with purpose 'assistants'
      setDeleteProgress('Listing all files...');
      const files = await openai.files.list({
        purpose: 'assistants'
      });
      
      if (files.data.length === 0) {
        setDeleteProgress('No files found');
        setTimeout(() => {
          setIsDeletingFiles(false);
          setDeleteProgress('');
        }, 2000);
        return;
      }

      setDeleteProgress(`Found ${files.data.length} files. Deleting...`);

      // Delete each file
      for (let i = 0; i < files.data.length; i++) {
        const file = files.data[i];
        setDeleteProgress(`Deleting file ${i + 1}/${files.data.length}: ${file.filename}`);
        await openai.files.delete(file.id);
      }

      setDeleteProgress('All files deleted successfully!');
      setTimeout(() => {
        setIsDeletingFiles(false);
        setDeleteProgress('');
      }, 2000);
    } catch (error) {
      setDeleteProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => {
        setIsDeletingFiles(false);
        setDeleteProgress('');
      }, 3000);
    }
  };

  return (
    <>
      <section>
        <h2>OpenAI Configuration</h2>
        
        <label htmlFor="api-key">
          OpenAI API Key
          <input
            id="api-key"
            type="password"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setHasUnsavedChanges(true);
            }}
            placeholder="sk-..."
            aria-describedby="api-key-hint"
            required
          />
          <small id="api-key-hint">
            Your API key is stored locally and never sent to any server except OpenAI.
          </small>
        </label>

        <label htmlFor="model-select">
          Model
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              setHasUnsavedChanges(true);
            }}
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
          <small id="model-hint">
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
          
          <p>Configure different models for each stage of document generation.</p>
          
          <label htmlFor="preprocessing-model">
            Pre-processing Model
            <select
              id="preprocessing-model"
              value={preprocessingModel}
              onChange={(e) => {
                setPreprocessingModel(e.target.value);
                setHasUnsavedChanges(true);
              }}
              disabled={isLoadingModels || !key}
              aria-describedby="preprocessing-hint"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
            <small id="preprocessing-hint">
              Used for knowledge base search and query rewriting. Lighter models work well here.
            </small>
          </label>

          <label htmlFor="outline-model">
            Outline Generation Model
            <select
              id="outline-model"
              value={outlineModel}
              onChange={(e) => {
                setOutlineModel(e.target.value);
                setHasUnsavedChanges(true);
              }}
              disabled={isLoadingModels || !key}
              aria-describedby="outline-hint"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
            <small id="outline-hint">
              Creates the document structure. Benefits from good reasoning capabilities.
            </small>
          </label>

          <label htmlFor="generation-model">
            Content Generation Model
            <select
              id="generation-model"
              value={generationModel}
              onChange={(e) => {
                setGenerationModel(e.target.value);
                setHasUnsavedChanges(true);
              }}
              disabled={isLoadingModels || !key}
              aria-describedby="generation-hint"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
            <small id="generation-hint">
              Writes the actual content for each section. Consider using your most capable model here.
            </small>
          </label>

          <button
            type="button"
            className="secondary outline"
            onClick={() => {
              setPreprocessingModel(selectedModel);
              setOutlineModel(selectedModel);
              setGenerationModel(selectedModel);
              setHasUnsavedChanges(true);
            }}
          >
            Reset to Default Model
          </button>
        </details>

        <button
          onClick={handleSave}
          disabled={!key || !selectedModel}
          className={hasUnsavedChanges ? 'contrast' : undefined}
        >
          {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
        </button>
      </section>

      <section>
        <h2>
          <AlertTriangle size={20} aria-hidden="true" />
          Danger Zone
        </h2>
        
        <article className="danger-zone-item">
          <header>
            <h3>Delete All Files from OpenAI</h3>
          </header>
          <p>This will delete all files from OpenAI Files API (purpose: assistants). Use this when local cache gets out of sync with OpenAI.</p>
          {isDeletingFiles && (
            <div aria-live="polite" aria-busy="true">
              <p><strong>Progress:</strong> {deleteProgress}</p>
            </div>
          )}
          <footer>
            <button 
              onClick={handleDeleteAllFiles}
              className="secondary"
              disabled={isDeletingFiles}
            >
              {isDeletingFiles ? 'Deleting Files...' : 'Delete All Files'}
            </button>
          </footer>
        </article>
        
        <article className="danger-zone-item">
          <header>
            <h3>Reset Database</h3>
          </header>
          <p>This will delete all your documents and knowledge bases. This action cannot be undone.</p>
          <footer>
            <button 
              onClick={handleResetDatabase}
              className="secondary"
            >
              Reset Database
            </button>
          </footer>
        </article>
      </section>
    </>
  );
}