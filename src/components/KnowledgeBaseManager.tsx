import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Plus, Trash2, Edit } from 'lucide-react';
import { useAppContext } from '../contexts/useAppContext';
import * as knowledgeBaseService from '../services/knowledgeBase';
import type { KnowledgeBase } from '../types';

export function KnowledgeBaseManager() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingKnowledgeBase, setIsCreatingKnowledgeBase] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadKnowledgeBases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadKnowledgeBases = async () => {
    dispatch({ type: 'KNOWLEDGE_BASES_LOADING_STARTED' });
    try {
      const knowledgeBases = await knowledgeBaseService.getAllKnowledgeBases();
      dispatch({ type: 'KNOWLEDGE_BASES_LOADED', payload: { knowledgeBases } });
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
      // Make sure to clear loading state even on error
      dispatch({ type: 'KNOWLEDGE_BASES_LOADED', payload: { knowledgeBases: [] } });
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!name.trim()) return;

    setIsCreatingKnowledgeBase(true);
    try {
      const knowledgeBase = await knowledgeBaseService.createKnowledgeBase(name, description);
      dispatch({ type: 'KNOWLEDGE_BASE_CREATED', payload: { knowledgeBase } });
      setIsCreating(false);
      form.reset();
      // Navigate to the newly created knowledge base
      navigate(`/knowledge-bases/${knowledgeBase.id}`);
    } catch (error) {
      console.error('Failed to create knowledge base:', error);
      alert('Failed to create knowledge base. Please check your API key.');
    } finally {
      setIsCreatingKnowledgeBase(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>, knowledgeBase: KnowledgeBase) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!name.trim()) return;

    try {
      const updated = await knowledgeBaseService.updateKnowledgeBase(knowledgeBase.id, {
        name,
        description
      });
      dispatch({ type: 'KNOWLEDGE_BASE_UPDATED', payload: { knowledgeBase: updated } });
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update knowledge base:', error);
      alert('Failed to update knowledge base.');
    }
  };

  const handleDelete = async (knowledgeBase: KnowledgeBase) => {
    if (!confirm(`Are you sure you want to delete "${knowledgeBase.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await knowledgeBaseService.deleteKnowledgeBase(knowledgeBase.id);
      dispatch({ type: 'KNOWLEDGE_BASE_DELETED', payload: { knowledgeBaseId: knowledgeBase.id } });
    } catch (error) {
      console.error('Failed to delete knowledge base:', error);
      alert('Failed to delete knowledge base.');
    }
  };

  const handleKnowledgeBaseClick = (knowledgeBase: KnowledgeBase) => {
    navigate(`/knowledge-bases/${knowledgeBase.id}`);
  };

  return (
    <article className="knowledge-base-manager" aria-label="Knowledge Base Manager">
      <header>
        <nav aria-label="Knowledge base navigation">
          <button
            onClick={() => navigate('/')}
            className="secondary"
          >
            ← Back to Documents
          </button>
        </nav>
        <hgroup>
          <h1>Knowledge Bases</h1>
          <p>Manage knowledge bases to enhance document generation with domain-specific content.</p>
        </hgroup>
        <nav aria-label="Knowledge base actions">
          <button
            onClick={() => setIsCreating(true)}
            className="primary"
            aria-label="Create new knowledge base"
          >
            <Plus size={20} aria-hidden="true" />
            New Knowledge Base
          </button>
        </nav>
      </header>

      {state.isLoadingKnowledgeBases ? (
        <section aria-busy="true">Loading knowledge bases...</section>
      ) : (
        <section>
            {isCreating && (
              <article>
                <form onSubmit={handleCreate}>
                  <fieldset>
                    <legend>Create New Knowledge Base</legend>
                    <label htmlFor="new-kb-name">
                      Name
                      <input
                        id="new-kb-name"
                        name="name"
                        type="text"
                        placeholder="e.g., Technical Documentation"
                        required
                        autoFocus
                      />
                    </label>
                    <label htmlFor="new-kb-description">
                      Description
                      <textarea
                        id="new-kb-description"
                        name="description"
                        rows={2}
                        placeholder="Optional description"
                      />
                    </label>
                  </fieldset>
                  <footer>
                    <button type="submit" disabled={isCreatingKnowledgeBase} aria-busy={isCreatingKnowledgeBase}>
                      {isCreatingKnowledgeBase ? 'Creating...' : 'Create'}
                    </button>
                    <button type="button" onClick={() => setIsCreating(false)} className="secondary" disabled={isCreatingKnowledgeBase}>
                      Cancel
                    </button>
                  </footer>
                </form>
              </article>
            )}

            {state.knowledgeBases.length === 0 ? (
              <section className="empty-state">
                <Database size={48} aria-hidden="true" />
                <p>No knowledge bases yet. Create one to get started!</p>
              </section>
            ) : (
              <ul className="knowledge-base-list">
                {state.knowledgeBases.map(kb => (
                  <li key={kb.id}>
                    {editingId === kb.id ? (
                      <form onSubmit={(e) => handleUpdate(e, kb)}>
                        <fieldset>
                          <legend>Edit Knowledge Base</legend>
                          <label htmlFor={`edit-kb-name-${kb.id}`}>
                            Name
                            <input
                              id={`edit-kb-name-${kb.id}`}
                              name="name"
                              type="text"
                              defaultValue={kb.name}
                              required
                              autoFocus
                            />
                          </label>
                          <label htmlFor={`edit-kb-description-${kb.id}`}>
                            Description
                            <textarea
                              id={`edit-kb-description-${kb.id}`}
                              name="description"
                              rows={2}
                              defaultValue={kb.description || ''}
                            />
                          </label>
                        </fieldset>
                        <footer>
                          <button type="submit">Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="secondary">
                            Cancel
                          </button>
                        </footer>
                      </form>
                    ) : (
                      <article className="knowledge-base-item" onClick={() => handleKnowledgeBaseClick(kb)}>
                        <header>
                          <h3>
                            <Database size={20} aria-hidden="true" />
                            {kb.name}
                          </h3>
                          <nav aria-label={`Actions for ${kb.name}`}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(kb.id);
                                }}
                                aria-label={`Edit ${kb.name}`}
                                className="icon-button"
                              >
                                <Edit size={16} aria-hidden="true" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(kb);
                                }}
                                aria-label={`Delete ${kb.name}`}
                                className="icon-button danger"
                              >
                                <Trash2 size={16} aria-hidden="true" />
                              </button>
                          </nav>
                        </header>
                        
                        {kb.description && <p>{kb.description}</p>}
                        
                        <footer>
                          <small>{kb.fileCount} files</small>
                          <small>Updated {new Date(kb.updatedAt).toLocaleDateString()}</small>
                        </footer>
                      </article>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </section>
      )}

      <style>{`
        .knowledge-base-manager {
          padding: 1rem 0;
        }

        .knowledge-base-manager > header {
          margin-bottom: 2rem;
        }

        .knowledge-base-manager nav[aria-label*="actions"] {
          display: flex;
          gap: 0.5rem;
        }

        .knowledge-base-manager nav[aria-label*="actions"] button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .knowledge-base-manager article > form > footer {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .knowledge-base-list {
          list-style: none;
          padding: 0;
          display: grid;
          gap: 1rem;
        }

        .knowledge-base-item {
          background: var(--pico-card-background-color);
          padding: 1rem;
          border-radius: var(--pico-border-radius);
          border: 1px solid var(--pico-muted-border-color);
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .knowledge-base-item:hover {
          background: var(--pico-card-sectionning-background-color);
        }

        .knowledge-base-item header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .knowledge-base-item h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-size: 1.1rem;
        }

        .knowledge-base-item nav {
          display: flex;
          gap: 0.5rem;
        }

        .icon-button {
          background: none;
          border: none;
          padding: 0.25rem;
          cursor: pointer;
          color: var(--pico-muted-color);
          transition: color 0.2s;
        }

        .icon-button:hover {
          color: var(--pico-primary);
        }

        .icon-button.danger:hover {
          color: var(--pico-del-color);
        }

        .knowledge-base-item footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: var(--pico-muted-color);
          margin-top: 0.5rem;
        }

        .empty-state {
          text-align: center;
          color: var(--pico-muted-color);
          padding: 2rem;
        }

        .empty-state svg {
          opacity: 0.5;
          margin-bottom: 1rem;
        }
      `}</style>
    </article>
  );
}