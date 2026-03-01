import { GridState } from '../types';
import { useRef } from 'react';

interface WordleGridProps {
  grid: GridState;
  activeRow: number;
  activeCol: number;
  onTileTap: (row: number, col: number) => void;
  onTileLongPress: (row: number, col: number) => void;
}

function feedbackClass(feedback: number | null): string {
  if (feedback === null) {
    return 'tile-empty';
  }
  if (feedback === 2) {
    return 'tile-green';
  }
  if (feedback === 1) {
    return 'tile-yellow';
  }
  return 'tile-grey';
}

function feedbackLabel(feedback: number | null): string {
  if (feedback === 2) return 'green';
  if (feedback === 1) return 'yellow';
  if (feedback === 0) return 'grey';
  return 'empty';
}

export function WordleGrid({
  grid,
  activeRow,
  activeCol,
  onTileTap,
  onTileLongPress
}: WordleGridProps) {
  const pressedRef = useRef<{ key: string; longPressed: boolean } | null>(null);

  return (
    <section className="panel">
      <h2>Guess grid</h2>
      <p className="helper-text">
        Filled tiles cycle GREY → YELLOW → GREEN. Long-press a filled tile to clear it.
      </p>
      <div className="grid" role="grid" aria-label="Wordle clue grid">
        {grid.map((row, rowIdx) => (
          <div className="grid-row" role="row" key={`row-${rowIdx}`}>
            {row.map((cell, colIdx) => {
              const isActive = activeRow === rowIdx && activeCol === colIdx;
              return (
                <button
                  key={`cell-${rowIdx}-${colIdx}`}
                  type="button"
                  className={`tile ${feedbackClass(cell.feedback)} ${isActive ? 'tile-active' : ''}`}
                  aria-label={`Row ${rowIdx + 1} Column ${colIdx + 1} letter ${
                    cell.letter || 'blank'
                  } status ${feedbackLabel(cell.feedback)}`}
                  onPointerDown={() => {
                    const key = `${rowIdx}-${colIdx}`;
                    pressedRef.current = { key, longPressed: false };
                    window.setTimeout(() => {
                      if (pressedRef.current?.key !== key || pressedRef.current.longPressed) {
                        return;
                      }
                      if (cell.letter) {
                        pressedRef.current.longPressed = true;
                        onTileLongPress(rowIdx, colIdx);
                      }
                    }, 420);
                  }}
                  onPointerUp={() => {
                    const key = `${rowIdx}-${colIdx}`;
                    const pressed = pressedRef.current;
                    if (!pressed || pressed.key !== key) {
                      return;
                    }
                    if (!pressed.longPressed) {
                      onTileTap(rowIdx, colIdx);
                    }
                    pressedRef.current = null;
                  }}
                  onPointerLeave={() => {
                    pressedRef.current = null;
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    onTileLongPress(rowIdx, colIdx);
                  }}
                >
                  {cell.letter.toUpperCase() || ' '}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
