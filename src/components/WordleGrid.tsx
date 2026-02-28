import { GridState } from '../types';

interface WordleGridProps {
  grid: GridState;
  activeRow: number;
  activeCol: number;
  onTileTap: (row: number, col: number) => void;
}

export function WordleGrid({ grid, activeRow, activeCol, onTileTap }: WordleGridProps) {
  return (
    <section className="panel">
      <h2>Guess grid</h2>
      <p className="helper-text">
        Tap a filled tile to cycle: unknown → grey → yellow → green. Empty tiles are selected for
        typing.
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
                  className={`tile tile-${cell.state} ${isActive ? 'tile-active' : ''}`}
                  aria-label={`Row ${rowIdx + 1} Column ${colIdx + 1} letter ${
                    cell.letter || 'blank'
                  } status ${cell.state}`}
                  onClick={() => onTileTap(rowIdx, colIdx)}
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
