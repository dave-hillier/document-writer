import { Link, useLocation } from 'react-router-dom';
import { FileText, History, Database, Settings } from 'lucide-react';

export function AsideNavigation() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside role="navigation" aria-label="Main navigation">
      <nav>
        <details open>
          <summary>Documents</summary>
          <ul>
            <li>
              <Link 
                to="/" 
                aria-current={isActive('/') ? 'page' : undefined}
              >
                <FileText size={18} aria-hidden="true" />
                New Document
              </Link>
            </li>
            <li>
              <Link 
                to="/history" 
                aria-current={isActive('/history') ? 'page' : undefined}
              >
                <History size={18} aria-hidden="true" />
                History
              </Link>
            </li>
          </ul>
        </details>

        <details open>
          <summary>Knowledge Base</summary>
          <ul>
            <li>
              <Link 
                to="/knowledge-bases" 
                aria-current={isActive('/knowledge-bases') ? 'page' : undefined}
              >
                <Database size={18} aria-hidden="true" />
                Knowledge Bases
              </Link>
            </li>
          </ul>
        </details>

        <details open>
          <summary>Settings</summary>
          <ul>
            <li>
              <Link 
                to="/settings" 
                aria-current={isActive('/settings') ? 'page' : undefined}
              >
                <Settings size={18} aria-hidden="true" />
                Settings
              </Link>
            </li>
          </ul>
        </details>
      </nav>
    </aside>
  );
}