import { useState } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  apiKey: string;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

export function SettingsModal({ isOpen, apiKey, onClose, onSave }: SettingsModalProps) {
  const [key, setKey] = useState(apiKey);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(key);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation">
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
        
          <div className="form-group">
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
            </label>
            <small id="api-key-hint" className="form-hint">
              Your API key is stored locally and never sent to any server except OpenAI.
            </small>
          </div>
        
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
    </div>
  );
}