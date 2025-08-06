import { Routes, Route } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { DocumentPage } from '../pages/DocumentPage';
import { HistoryPage } from '../pages/HistoryPage';
import { KnowledgeBasesPage } from '../pages/KnowledgeBasesPage';
import { KnowledgeBaseDetailsPage } from '../pages/KnowledgeBaseDetailsPage';
import { SettingsPage } from '../pages/SettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/document/:documentId" element={<DocumentPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/knowledge-bases" element={<KnowledgeBasesPage />} />
      <Route path="/knowledge-bases/:knowledgeBaseId" element={<KnowledgeBaseDetailsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}