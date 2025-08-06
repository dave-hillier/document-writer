import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import type { LuckyGenerationState } from '../../types';

interface LuckyGenerationDialogProps {
  isOpen: boolean;
  state: LuckyGenerationState;
  onCancel?: () => void;
}

export function LuckyGenerationDialog({ isOpen, state, onCancel }: LuckyGenerationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { isGenerating, currentStep, stepIndex, totalSteps } = state;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && isGenerating) {
      dialog.showModal();
    } else if (!isGenerating) {
      dialog.close();
    }
  }, [isOpen, isGenerating]);

  const progressPercentage = totalSteps > 0 ? Math.round((stepIndex / totalSteps) * 100) : 0;

  if (!isOpen || !isGenerating) return null;

  return (
    <dialog 
      ref={dialogRef}
      className="lucky-generation-dialog"
      aria-labelledby="lucky-title"
      aria-describedby="lucky-description"
    >
      <article className="lucky-generation-container">
        <header className="lucky-generation-header">
          <div className="lucky-icon">
            <Sparkles size={32} />
          </div>
          <div>
            <h2 id="lucky-title">Generating Lucky Document</h2>
            <p id="lucky-description">Creating a unique document based on your knowledge base patterns...</p>
          </div>
        </header>

        <section className="lucky-progress-section" aria-label="Generation progress">
          <div className="progress-info">
            <div className="current-step">
              <strong>Step {stepIndex} of {totalSteps}:</strong> {currentStep}
            </div>
            <div className="progress-percentage">
              {progressPercentage}%
            </div>
          </div>
          
          <progress 
            value={stepIndex} 
            max={totalSteps}
            aria-label={`Generation progress: ${progressPercentage}% complete`}
          >
            {progressPercentage}%
          </progress>
          
          <div className="progress-steps">
            {Array.from({ length: totalSteps }, (_, index) => (
              <div 
                key={index}
                className={`progress-step ${index < stepIndex ? 'completed' : index === stepIndex ? 'active' : 'pending'}`}
                aria-hidden="true"
              />
            ))}
          </div>
        </section>

        <footer className="lucky-generation-footer">
          <small>This may take a few moments depending on document length...</small>
          {onCancel && (
            <button
              onClick={onCancel}
              className="secondary outline"
            >
              Cancel Generation
            </button>
          )}
        </footer>
      </article>
    </dialog>
  );
}