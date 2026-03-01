import { ViewMode } from '../types';

interface ActionBarProps {
  viewMode: ViewMode;
  resolvedTheme: 'dark' | 'light';
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  onToggleView: () => void;
  onToggleTheme: () => void;
}

export function ActionBar({
  viewMode,
  resolvedTheme,
  canUndo,
  onUndo,
  onReset,
  onToggleView,
  onToggleTheme
}: ActionBarProps) {
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
      <button type="button" className="action-button" onClick={onToggleTheme}>
        Theme: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
      </button>
    </div>
  );
}
