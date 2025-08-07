import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Plus, Trash2, Edit } from 'lucide-react';
import { useAppContext } from '../../contexts/useAppContext';
import * as knowledgeBaseService from '../../services/knowledgeBase';
import type { KnowledgeBase } from '../../types';

export function KnowledgeBaseManager() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingKnowledgeBase, setIsCreatingKnowledgeBase] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch({
      type: 'PAGE_NAVIGATION_SET',
      payload: {
        title: 'Knowledge Bases'
      }
    });
  }, [dispatch, navigate]);

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
    <div className="knowledge-base-manager">
      <header>
        <hgroup>
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
              <section>
                <Database size={48} aria-hidden="true" />
                <p>No knowledge bases yet. Create one to get started!</p>
              </section>
            ) : (
              <ul>
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
                      <article>
                        <header>
                          <h3>
                            <Database size={20} aria-hidden="true" />
                            <a href={`/knowledge-bases/${kb.id}`} onClick={(e) => {
                              e.preventDefault();
                              handleKnowledgeBaseClick(kb);
                            }}>
                              {kb.name}
                            </a>
                          </h3>
                          <nav aria-label={`Actions for ${kb.name}`}>
                              <button
                                onClick={() => setEditingId(kb.id)}
                                aria-label={`Edit ${kb.name}`}
                              >
                                <Edit size={16} aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => handleDelete(kb)}
                                aria-label={`Delete ${kb.name}`}
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
    </div>
  );
}