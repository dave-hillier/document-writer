import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Search } from 'lucide-react';
import { useAppContext } from '../contexts/useAppContext';
import * as knowledgeBaseService from '../services/knowledgeBase';
import { FileUploader } from './FileUploader';
import { QueryTester } from './QueryTester';
import type { KnowledgeBase } from '../types';

export function KnowledgeBaseDetails() {
  const { knowledgeBaseId } = useParams<{ knowledgeBaseId: string }>();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'files' | 'query'>('files');
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadKnowledgeBase = async () => {
      if (!knowledgeBaseId) {
        navigate('/knowledge-bases');
        return;
      }

      setIsLoading(true);
      try {
        // First check if it's already in our state
        const existingKb = state.knowledgeBases.find(kb => kb.id === knowledgeBaseId);
        if (existingKb) {
          setKnowledgeBase(existingKb);
          setIsLoading(false);
          return;
        }

        // If not in state, load all knowledge bases to refresh the list
        const knowledgeBases = await knowledgeBaseService.getAllKnowledgeBases();
        dispatch({ type: 'KNOWLEDGE_BASES_LOADED', payload: { knowledgeBases } });
        
        const kb = knowledgeBases.find(kb => kb.id === knowledgeBaseId);
        if (kb) {
          setKnowledgeBase(kb);
        } else {
          // Knowledge base not found, redirect to list
          navigate('/knowledge-bases');
        }
      } catch (error) {
        console.error('Failed to load knowledge base:', error);
        navigate('/knowledge-bases');
      } finally {
        setIsLoading(false);
      }
    };

    loadKnowledgeBase();
  }, [knowledgeBaseId, state.knowledgeBases, dispatch, navigate]);

  if (isLoading) {
    return (
      <div className="knowledge-base-details">
        <div aria-busy="true">Loading knowledge base...</div>
      </div>
    );
  }

  if (!knowledgeBase) {
    return (
      <div className="knowledge-base-details">
        <p>Knowledge base not found.</p>
      </div>
    );
  }

  return (
    <div className="knowledge-base-details">
      <header>
        <nav aria-label="Knowledge base navigation">
          <button
            onClick={() => navigate('/knowledge-bases')}
            className="secondary"
          >
            ← Back to Knowledge Bases
          </button>
        </nav>
        <h1>{knowledgeBase.name}</h1>
        {knowledgeBase.description && <p>{knowledgeBase.description}</p>}
        
        <nav className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'files'}
            onClick={() => setActiveTab('files')}
            className={activeTab === 'files' ? 'active' : ''}
          >
            <FileText size={20} aria-hidden="true" />
            Files
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'query'}
            onClick={() => setActiveTab('query')}
            className={activeTab === 'query' ? 'active' : ''}
          >
            <Search size={20} aria-hidden="true" />
            Query Test
          </button>
        </nav>
      </header>

      <main className="tab-content">
        {activeTab === 'files' ? (
          <FileUploader
            knowledgeBaseId={knowledgeBase.id}
            knowledgeBaseService={knowledgeBaseService}
          />
        ) : (
          <QueryTester
            knowledgeBaseId={knowledgeBase.id}
            knowledgeBaseService={knowledgeBaseService}
          />
        )}
      </main>

      <style>{`
        .knowledge-base-details {
          padding: 1rem 0;
        }

        .knowledge-base-details header {
          margin-bottom: 2rem;
        }

        .knowledge-base-details nav[aria-label="Knowledge base navigation"] {
          margin-bottom: 1rem;
        }

        .knowledge-base-details h1 {
          margin: 1rem 0 0.5rem 0;
        }

        .tabs {
          display: flex;
          gap: 1rem;
          border-bottom: 1px solid var(--pico-muted-border-color);
          margin-top: 1rem;
        }

        .tabs button {
          background: none;
          border: none;
          padding: 0.5rem 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--pico-muted-color);
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tabs button:hover {
          color: var(--pico-primary);
        }

        .tabs button.active {
          color: var(--pico-primary);
          border-bottom-color: var(--pico-primary);
        }

        .tab-content {
          padding: 1rem 0;
        }
      `}</style>
    </div>
  );
}