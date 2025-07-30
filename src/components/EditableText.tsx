import { useRef, useEffect, useState } from 'react';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  ariaLabel: string;
  className?: string;
  element?: 'h1' | 'h3' | 'p' | 'span';
}

export function EditableText({ value, onSave, ariaLabel, className, element = 'span' }: EditableTextProps) {
  const [editValue, setEditValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const Element = element;

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    const newValue = e.currentTarget.textContent || '';
    setEditValue(newValue);
  };

  const handleBlur = () => {
    const newValue = editValue.trim();
    if (newValue && newValue !== value) {
      onSave(newValue);
    } else {
      setEditValue(value);
    }
    setIsEditing(false);
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      (e.currentTarget as HTMLElement).blur();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      selection.deleteFromDocument();
      selection.getRangeAt(0).insertNode(document.createTextNode(text));
      selection.collapseToEnd();
      const event = new Event('input', { bubbles: true });
      if (elementRef.current) {
        elementRef.current.dispatchEvent(event);
      }
    }
  };

  const elementRef = useRef<HTMLDivElement>(null);

  if (element === 'h1' || element === 'h3') {
    const HeadingElement = element;
    return (
      <HeadingElement
        ref={elementRef as React.RefObject<HTMLHeadingElement>}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        aria-label={ariaLabel}
        className={className}
        data-editable
        data-min-width
      >
        {isEditing ? editValue : value}
      </HeadingElement>
    );
  }

  return (
    <Element
      ref={elementRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      aria-label={ariaLabel}
      className={className}
      data-editable
      data-min-width
    >
      {isEditing ? editValue : value}
    </Element>
  );
}