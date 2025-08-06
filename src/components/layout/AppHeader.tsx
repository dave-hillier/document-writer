import { Link } from 'react-router-dom';
import { Settings, History, FileText, Database } from 'lucide-react';

interface AppHeaderProps {
  onSettingsClick: () => void;
}

export function AppHeader({ onSettingsClick }: AppHeaderProps) {
  return (
    <header className="container app-header" role="banner">
      <nav aria-label="Main navigation">
        <ul>
          <li><h1>Document Writer</h1></li>
        </ul>
        <ul>
          <li>
            <Link to="/knowledge-bases" aria-label="Knowledge bases" data-tooltip="Knowledge Bases">
              <Database size={24} aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link to="/history" aria-label="Document history" data-tooltip="History">
              <History size={24} aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link to="/" aria-label="New document" data-tooltip="New Document">
              <FileText size={24} aria-hidden="true" />
            </Link>
          </li>
          <li>
            <button
              onClick={onSettingsClick}
              aria-label="Open settings"
              data-tooltip="Settings"
              className="contrast outline"
            >
              <Settings size={24} aria-hidden="true" />
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}