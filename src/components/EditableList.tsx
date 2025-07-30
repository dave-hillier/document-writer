import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

interface EditableListProps {
  items: string[];
  onSave: (newItems: string[]) => void;
  ariaLabel: string;
}

export function EditableList({ items, onSave, ariaLabel }: EditableListProps) {
  const [localItems, setLocalItems] = useState(items);
  const itemRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleItemBlur = (index: number) => {
    const element = itemRefs.current[index];
    if (element) {
      const newValue = element.textContent?.trim() || '';
      if (newValue && newValue !== localItems[index]) {
        const newItems = [...localItems];
        newItems[index] = newValue;
        setLocalItems(newItems);
        onSave(newItems);
      } else {
        element.textContent = localItems[index];
      }
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      itemRefs.current[index]?.blur();
    } else if (e.key === 'Escape') {
      const element = itemRefs.current[index];
      if (element) {
        element.textContent = localItems[index];
        element.blur();
      }
    }
  };

  const handleAddItem = () => {
    const newItems = [...localItems, 'New step'];
    setLocalItems(newItems);
    onSave(newItems);
    setTimeout(() => {
      const newIndex = newItems.length - 1;
      const element = itemRefs.current[newIndex];
      if (element) {
        element.focus();
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }, 0);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = localItems.filter((_, i) => i !== index);
    setLocalItems(newItems);
    onSave(newItems);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div role="group" aria-label={ariaLabel}>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {localItems.map((item, index) => (
          <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span
              ref={el => { itemRefs.current[index] = el; }}
              contentEditable
              suppressContentEditableWarning
              onBlur={() => handleItemBlur(index)}
              onKeyDown={(e) => handleItemKeyDown(e, index)}
              onPaste={handlePaste}
              aria-label={`Step ${index + 1}`}
              style={{ flex: 1, cursor: 'text', minWidth: '1em', padding: '0.25rem' }}
            >
              {item}
            </span>
            <button
              onClick={() => handleRemoveItem(index)}
              className="outline"
              aria-label={`Remove step ${index + 1}`}
              style={{ padding: '0.25rem', minWidth: 'auto' }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
        <li>
          <button
            onClick={handleAddItem}
            className="outline"
            aria-label="Add new step"
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <Plus size={16} aria-hidden="true" />
            Add step
          </button>
        </li>
      </ul>
    </div>
  );
}