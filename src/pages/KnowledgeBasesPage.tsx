import { lazy, Suspense } from 'react';

const LazyKnowledgeBaseManager = lazy(() => 
  import('../components/knowledge-base/KnowledgeBaseManager').then(module => ({ 
    default: module.KnowledgeBaseManager 
  }))
);

export function KnowledgeBasesPage() {
  return (
    <Suspense fallback={<div aria-busy="true">Loading knowledge bases...</div>}>
      <LazyKnowledgeBaseManager />
    </Suspense>
  );
}