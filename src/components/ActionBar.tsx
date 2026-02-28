import { ViewMode } from '../types';

interface ActionBarProps {
  viewMode: ViewMode;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  onToggleView: () => void;
}

export function ActionBar({ viewMode, canUndo, onUndo, onReset, onToggleView }: ActionBarProps) {
  return (
    <div className="action-bar" role="toolbar" aria-label="Puzzle actions">
      <button type="button" className="action-button" onClick={onReset}>
        Reset puzzle
      </button>
      <button type="button" className="action-button" onClick={onUndo} disabled={!canUndo}>
        Undo last change
      </button>
      <button type="button" className="action-button action-button-primary" onClick={onToggleView}>
        {viewMode === 'hints' ? 'Show candidates' : 'Show hints'}
      </button>
    </div>
  );
}
