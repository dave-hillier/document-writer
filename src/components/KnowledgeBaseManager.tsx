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

    try {
      const knowledgeBase = await knowledgeBaseService.createKnowledgeBase(name, description);
      dispatch({ type: 'KNOWLEDGE_BASE_CREATED', payload: { knowledgeBase } });
      setIsCreating(false);
      form.reset();
    } catch (error) {
      console.error('Failed to create knowledge base:', error);
      alert('Failed to create knowledge base. Please check your API key.');
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
    <div className="knowledge-base-manager">
      <header>
        <nav aria-label="Knowledge base navigation">
          <button
            onClick={() => navigate('/')}
            className="secondary"
          >
            ← Back to Documents
          </button>
        </nav>
        <h1>Knowledge Bases</h1>
        <p>Manage knowledge bases to enhance document generation with domain-specific content.</p>
      </header>

      {state.isLoadingKnowledgeBases ? (
        <div aria-busy="true">Loading knowledge bases...</div>
      ) : (
        <section className="knowledge-base-list">
            <header>
              <h2>Your Knowledge Bases</h2>
              <button
                onClick={() => setIsCreating(true)}
                className="primary"
                aria-label="Create new knowledge base"
              >
                <Plus size={20} aria-hidden="true" />
                <span>New Knowledge Base</span>
              </button>
            </header>

            {isCreating && (
              <article className="knowledge-base-form">
                <form onSubmit={handleCreate}>
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
                  <div className="form-actions">
                    <button type="submit" className="primary">Create</button>
                    <button type="button" onClick={() => setIsCreating(false)} className="secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              </article>
            )}

            {state.knowledgeBases.length === 0 ? (
              <p className="empty-state">No knowledge bases yet. Create one to get started!</p>
            ) : (
              <ul className="knowledge-base-items">
                {state.knowledgeBases.map(kb => (
                  <li key={kb.id}>
                    {editingId === kb.id ? (
                      <form onSubmit={(e) => handleUpdate(e, kb)}>
                        <input
                          name="name"
                          type="text"
                          defaultValue={kb.name}
                          required
                          autoFocus
                        />
                        <textarea
                          name="description"
                          rows={2}
                          defaultValue={kb.description || ''}
                        />
                        <div className="form-actions">
                          <button type="submit" className="primary">Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="secondary">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <article
                        className="knowledge-base-item"
                        onClick={() => handleKnowledgeBaseClick(kb)}
                      >
                        <header>
                          <h3>
                            <Database size={20} aria-hidden="true" />
                            {kb.name}
                          </h3>
                          <section className="actions">
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
                          </section>
                        </header>
                        {kb.description && <p>{kb.description}</p>}
                        <footer>
                          <span>{kb.fileCount} files</span>
                          <span>Updated {new Date(kb.updatedAt).toLocaleDateString()}</span>
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

        .knowledge-base-list {
          margin-top: 2rem;
        }

        .knowledge-base-list header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .knowledge-base-list button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .knowledge-base-form {
          background: var(--card-background-color);
          padding: 1rem;
          border-radius: var(--border-radius);
          margin-bottom: 1rem;
        }

        .form-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .knowledge-base-items {
          list-style: none;
          padding: 0;
        }

        .knowledge-base-item {
          background: var(--card-background-color);
          padding: 1rem;
          border-radius: var(--border-radius);
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .knowledge-base-item:hover {
          background: var(--card-sectionning-background-color);
        }


        .knowledge-base-item header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .knowledge-base-item h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-size: 1.1rem;
        }

        .knowledge-base-item .actions {
          display: flex;
          gap: 0.5rem;
        }

        .icon-button {
          background: none;
          border: none;
          padding: 0.25rem;
          cursor: pointer;
          color: var(--muted-color);
          transition: color 0.2s;
        }

        .icon-button:hover {
          color: var(--primary);
        }

        .icon-button.danger:hover {
          color: var(--del-color);
        }

        .knowledge-base-item footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: var(--muted-color);
          margin-top: 0.5rem;
        }

        .empty-state {
          text-align: center;
          color: var(--muted-color);
          padding: 2rem;
        }
      `}</style>
    </div>
  );
}