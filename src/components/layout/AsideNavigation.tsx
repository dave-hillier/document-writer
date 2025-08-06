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
        <section>
          <h2>Documents</h2>
          <ul>
            <li>
              <Link 
                to="/" 
                aria-current={isActive('/') ? 'page' : undefined}
                className={isActive('/') ? 'active' : undefined}
              >
                <FileText size={18} aria-hidden="true" />
                New Document
              </Link>
            </li>
            <li>
              <Link 
                to="/history" 
                aria-current={isActive('/history') ? 'page' : undefined}
                className={isActive('/history') ? 'active' : undefined}
              >
                <History size={18} aria-hidden="true" />
                History
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <h2>Knowledge Base</h2>
          <ul>
            <li>
              <Link 
                to="/knowledge-bases" 
                aria-current={isActive('/knowledge-bases') ? 'page' : undefined}
                className={isActive('/knowledge-bases') ? 'active' : undefined}
              >
                <Database size={18} aria-hidden="true" />
                Knowledge Bases
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <h2>Settings</h2>
          <ul>
            <li>
              <Link 
                to="/settings" 
                aria-current={isActive('/settings') ? 'page' : undefined}
                className={isActive('/settings') ? 'active' : undefined}
              >
                <Settings size={18} aria-hidden="true" />
                Settings
              </Link>
            </li>
          </ul>
        </section>
      </nav>
    </aside>
  );
}