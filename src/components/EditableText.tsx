import { useRef, useEffect } from 'react';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  ariaLabel: string;
  className?: string;
  element?: 'h1' | 'h3' | 'p' | 'span';
}

export function EditableText({ value, onSave, ariaLabel, className, element = 'span' }: EditableTextProps) {
  const elementRef = useRef<HTMLElement>(null);
  const Element = element;

  useEffect(() => {
    if (elementRef.current && elementRef.current.textContent !== value) {
      elementRef.current.textContent = value;
    }
  }, [value]);

  const handleBlur = () => {
    if (elementRef.current) {
      const newValue = elementRef.current.textContent?.trim() || '';
      if (newValue && newValue !== value) {
        onSave(newValue);
      } else {
        elementRef.current.textContent = value;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      elementRef.current?.blur();
    } else if (e.key === 'Escape') {
      if (elementRef.current) {
        elementRef.current.textContent = value;
        elementRef.current.blur();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <Element
      ref={elementRef as any}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      aria-label={ariaLabel}
      className={className}
      style={{ cursor: 'text', minWidth: '1em' }}
    >
      {value}
    </Element>
  );
}