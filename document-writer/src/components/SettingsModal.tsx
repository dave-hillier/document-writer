import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [key, setKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setKey(localStorage.getItem('openai-api-key') || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('openai-api-key', key);
    onClose();
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
      
        <footer>
          <button
            onClick={onClose}
            className="secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!key}
          >
            Save
          </button>
        </footer>
      </article>
    </dialog>
  );
}