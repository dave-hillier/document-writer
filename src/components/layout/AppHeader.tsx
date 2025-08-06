import { ArrowLeft } from 'lucide-react';
import { useAppContext } from '../../contexts/useAppContext';

export function AppHeader() {
  const { state } = useAppContext();
  const { pageNavigation } = state;

  return (
    <header className="app-header" role="banner">
      <div className="container">
        <nav className="header-nav">
          {pageNavigation.backButton && (
            <button 
              onClick={pageNavigation.backButton.action}
              className="back-button secondary"
              aria-label="Go back"
            >
              <ArrowLeft size={20} aria-hidden="true" />
              {pageNavigation.backButton.text}
            </button>
          )}
          <h1>{pageNavigation.title}</h1>
        </nav>
      </div>
    </header>
  );
}