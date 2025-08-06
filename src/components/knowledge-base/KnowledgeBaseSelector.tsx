import { useEffect } from 'react';
import { Database } from 'lucide-react';
import { useAppContext } from '../../contexts/useAppContext';
import * as knowledgeBaseService from '../../services/knowledgeBase';

interface KnowledgeBaseSelectorProps {
  selectedId?: string;
  onChange: (knowledgeBaseId: string | undefined) => void;
}

export function KnowledgeBaseSelector({ selectedId, onChange }: KnowledgeBaseSelectorProps) {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    if (state.knowledgeBases.length === 0 && !state.isLoadingKnowledgeBases) {
      loadKnowledgeBases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadKnowledgeBases = async () => {
    dispatch({ type: 'KNOWLEDGE_BASES_LOADING_STARTED' });
    try {
      const knowledgeBases = await knowledgeBaseService.getAllKnowledgeBases();
      dispatch({ type: 'KNOWLEDGE_BASES_LOADED', payload: { knowledgeBases } });
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange(value === '' ? undefined : value);
    
    const knowledgeBase = state.knowledgeBases.find(kb => kb.id === value) || null;
    dispatch({ type: 'KNOWLEDGE_BASE_SELECTED', payload: { knowledgeBase } });
  };

  return (
    <div>
      <label htmlFor="knowledge-base-select">
        <span>
          <Database size={20} aria-hidden="true" />
          Knowledge Base (Optional)
        </span>
        <select
          id="knowledge-base-select"
          value={selectedId || ''}
          onChange={handleChange}
          disabled={state.isLoadingKnowledgeBases}
        >
          <option value="">None - Generate without additional context</option>
          {state.knowledgeBases.map(kb => (
            <option key={kb.id} value={kb.id}>
              {kb.name} ({kb.fileCount} files)
            </option>
          ))}
        </select>
      </label>
      
      {selectedId && state.selectedKnowledgeBase && (
        <div>
          <p>
            {state.selectedKnowledgeBase.description || 
             `This knowledge base contains ${state.selectedKnowledgeBase.fileCount} files that will be used to enhance document generation.`}
          </p>
        </div>
      )}


    </div>
  );
}