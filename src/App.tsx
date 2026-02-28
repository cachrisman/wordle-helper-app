import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import words from './assets/words.json';
import { ActionBar } from './components/ActionBar';
import { CandidatesPanel } from './components/CandidatesPanel';
import { HintsPanel } from './components/HintsPanel';
import { LetterKeyboard } from './components/LetterKeyboard';
import { OfflineIndicator } from './components/OfflineIndicator';
import { WordleGrid } from './components/WordleGrid';
import { analyzeCandidates, buildConstraintsFromGrid, filterWords } from './lib/constraints';
import { buildExplorationHints, pickRandomCandidates } from './lib/hints';
import { cloneGrid, createEmptyGrid, cycleTileState, normalizeLetter } from './lib/grid';
import { loadPersistedState, savePersistedState } from './lib/storage';
import { Constraints, PersistedState } from './types';

const CONSTRAINTS_STORAGE_KEY = 'wordle-hint-coach:constraints:v1';

const ALL_WORDS = (words as string[]).map((word) => word.toLowerCase());

function nextCell(row: number, col: number, rowLimit: number, colLimit: number) {
  if (col < colLimit - 1) {
    return { row, col: col + 1 };
  }
  if (row < rowLimit - 1) {
    return { row: row + 1, col: 0 };
  }
  return { row, col };
}

function previousCell(row: number, col: number) {
  if (col > 0) {
    return { row, col: col - 1 };
  }
  if (row > 0) {
    return { row: row - 1, col: 4 };
  }
  return { row, col };
}

function getFixLabel(constraints: Constraints, conflictId: string): string | null {
  const conflict = constraints.conflicts.find((item) => item.id === conflictId);
  if (!conflict) {
    return null;
  }

  switch (conflict.type) {
    case 'positionExcluded':
      return 'Clear conflicting yellow exclusion';
    case 'minExceedsMax':
      return `Remove grey cap for "${conflict.letter?.toUpperCase()}"`;
    case 'greenPositionConflict':
      return 'Keep latest green letter';
    default:
      return null;
  }
}

function applyConflictFixToState(state: PersistedState, constraints: Constraints, conflictId: string) {
  const conflict = constraints.conflicts.find((item) => item.id === conflictId);
  if (!conflict) {
    return state;
  }

  const grid = cloneGrid(state.grid);
  let changed = false;

  if (conflict.type === 'positionExcluded' && conflict.letter && conflict.position !== undefined) {
    for (let row = 0; row < grid.length; row += 1) {
      const cell = grid[row][conflict.position];
      if (cell.letter.toLowerCase() === conflict.letter && cell.state === 'yellow') {
        grid[row][conflict.position] = { ...cell, state: 'unknown' };
        changed = true;
        break;
      }
    }
  } else if (conflict.type === 'minExceedsMax' && conflict.letter) {
    for (let row = 0; row < grid.length; row += 1) {
      for (let col = 0; col < grid[row].length; col += 1) {
        const cell = grid[row][col];
        if (cell.letter.toLowerCase() === conflict.letter && cell.state === 'grey') {
          grid[row][col] = { ...cell, state: 'unknown' };
          changed = true;
        }
      }
    }
  } else if (conflict.type === 'greenPositionConflict' && conflict.position !== undefined) {
    const greenRows: number[] = [];
    for (let row = 0; row < grid.length; row += 1) {
      if (grid[row][conflict.position].state === 'green') {
        greenRows.push(row);
      }
    }
    if (greenRows.length > 1) {
      const keepRow = greenRows[greenRows.length - 1];
      for (const row of greenRows) {
        if (row !== keepRow) {
          grid[row][conflict.position] = {
            ...grid[row][conflict.position],
            state: 'unknown'
          };
          changed = true;
        }
      }
    }
  }

  if (!changed) {
    return state;
  }

  return {
    ...state,
    grid
  };
}

export default function App() {
  const [state, setState] = useState<PersistedState>(() => loadPersistedState());
  const [history, setHistory] = useState<PersistedState[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [lastCandidateCount, setLastCandidateCount] = useState<number | null>(null);
  const [sampleSeed, setSampleSeed] = useState(0);

  const systemInputRef = useRef<HTMLInputElement>(null);
  const candidateCountRef = useRef(0);

  const constraints = useMemo(() => buildConstraintsFromGrid(state.grid), [state.grid]);
  const candidates = useMemo(() => filterWords(ALL_WORDS, constraints), [constraints]);
  const stats = useMemo(() => analyzeCandidates(candidates), [candidates]);
  const explorationHints = useMemo(
    () => buildExplorationHints(stats, constraints),
    [stats, constraints]
  );
  const sampledCandidates = useMemo(
    () => pickRandomCandidates(candidates, 20),
    [candidates, sampleSeed]
  );

  const shownCandidates = state.showAllCandidates ? candidates : sampledCandidates;

  useEffect(() => {
    candidateCountRef.current = candidates.length;
  }, [candidates.length]);

  useEffect(() => {
    savePersistedState(state);
  }, [state]);

  useEffect(() => {
    window.localStorage.setItem(CONSTRAINTS_STORAGE_KEY, JSON.stringify(constraints));
  }, [constraints]);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const commit = useCallback((updater: (prev: PersistedState) => PersistedState) => {
    setState((prev) => {
      const next = updater(prev);
      if (next === prev) {
        return prev;
      }
      setHistory((entries) => [...entries, prev].slice(-120));
      setLastCandidateCount(candidateCountRef.current);
      return next;
    });
  }, []);

  const handleTileTap = useCallback(
    (row: number, col: number) => {
      commit((prev) => {
        const nextGrid = cloneGrid(prev.grid);
        const current = nextGrid[row][col];
        if (current.letter) {
          nextGrid[row][col] = {
            ...current,
            state: cycleTileState(current.state)
          };
        }
        return {
          ...prev,
          grid: nextGrid,
          activeRow: row,
          activeCol: col
        };
      });

      systemInputRef.current?.focus();
    },
    [commit]
  );

  const handleLetter = useCallback(
    (value: string) => {
      const letter = normalizeLetter(value);
      if (!letter) {
        return;
      }

      commit((prev) => {
        const rowCount = prev.grid.length;
        const colCount = prev.grid[0]?.length ?? 5;
        const { activeRow, activeCol } = prev;
        const nextGrid = cloneGrid(prev.grid);
        const targetCell = nextGrid[activeRow][activeCol];
        if (targetCell.letter === letter) {
          return prev;
        }
        nextGrid[activeRow][activeCol] = {
          ...targetCell,
          letter
        };
        const cursor = nextCell(activeRow, activeCol, rowCount, colCount);
        return {
          ...prev,
          grid: nextGrid,
          activeRow: cursor.row,
          activeCol: cursor.col
        };
      });
    },
    [commit]
  );

  const handleBackspace = useCallback(() => {
    commit((prev) => {
      const nextGrid = cloneGrid(prev.grid);
      let { activeRow, activeCol } = prev;
      const currentCell = nextGrid[activeRow][activeCol];

      if (currentCell.letter) {
        nextGrid[activeRow][activeCol] = { letter: '', state: 'unknown' };
      } else {
        const previous = previousCell(activeRow, activeCol);
        activeRow = previous.row;
        activeCol = previous.col;
        const previousCellState = nextGrid[activeRow][activeCol];
        nextGrid[activeRow][activeCol] = { ...previousCellState, letter: '', state: 'unknown' };
      }

      return {
        ...prev,
        grid: nextGrid,
        activeRow,
        activeCol
      };
    });
  }, [commit]);

  const handleKeyboardKey = useCallback(
    (key: string) => {
      if (/^[a-zA-Z]$/.test(key)) {
        handleLetter(key);
      } else if (key === 'Backspace') {
        handleBackspace();
      } else if (key === 'ArrowLeft') {
        commit((prev) => {
          const position = previousCell(prev.activeRow, prev.activeCol);
          if (position.row === prev.activeRow && position.col === prev.activeCol) {
            return prev;
          }
          return {
            ...prev,
            activeRow: position.row,
            activeCol: position.col
          };
        });
      } else if (key === 'ArrowRight') {
        commit((prev) => {
          const position = nextCell(
            prev.activeRow,
            prev.activeCol,
            prev.grid.length,
            prev.grid[0]?.length ?? 5
          );
          if (position.row === prev.activeRow && position.col === prev.activeCol) {
            return prev;
          }
          return {
            ...prev,
            activeRow: position.row,
            activeCol: position.col
          };
        });
      }
    },
    [commit, handleBackspace, handleLetter]
  );

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key) || ['Backspace', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        handleKeyboardKey(event.key);
      }
    };

    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [handleKeyboardKey]);

  const handleUndo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) {
        return prevHistory;
      }
      const nextHistory = [...prevHistory];
      const snapshot = nextHistory.pop();
      if (snapshot) {
        setState(snapshot);
      }
      return nextHistory;
    });
  }, []);

  const handleReset = useCallback(() => {
    commit((prev) => ({
      ...prev,
      grid: createEmptyGrid(prev.grid.length, prev.grid[0]?.length ?? 5),
      activeRow: 0,
      activeCol: 0,
      showAllCandidates: false
    }));
    setSampleSeed((value) => value + 1);
  }, [commit]);

  const handleToggleView = useCallback(() => {
    commit((prev) => ({
      ...prev,
      viewMode: prev.viewMode === 'hints' ? 'candidates' : 'hints'
    }));
  }, [commit]);

  const handleToggleShowAllCandidates = useCallback(() => {
    commit((prev) => ({
      ...prev,
      showAllCandidates: !prev.showAllCandidates
    }));
  }, [commit]);

  const conflictFixes = useMemo(
    () =>
      constraints.conflicts
        .map((conflict) => ({
          conflictId: conflict.id,
          actionLabel: getFixLabel(constraints, conflict.id)
        }))
        .filter((item): item is { conflictId: string; actionLabel: string } => !!item.actionLabel),
    [constraints]
  );

  const handleApplyConflictFix = useCallback(
    (conflictId: string) => {
      commit((prev) => applyConflictFixToState(prev, constraints, conflictId));
    },
    [commit, constraints]
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Wordle Hint Coach</p>
        <h1>Hints-first puzzle assistant</h1>
        <p className="intro">This tool gives hints; it won&apos;t pick the answer for you.</p>
      </header>

      <OfflineIndicator isOffline={isOffline} />

      <div className="input-row">
        <label htmlFor="system-keyboard-input">Type letter</label>
        <input
          ref={systemInputRef}
          id="system-keyboard-input"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="system-input"
          placeholder="Use keyboard here"
          onKeyDown={(event) => {
            if (/^[a-zA-Z]$/.test(event.key) || ['Backspace', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
              event.preventDefault();
              handleKeyboardKey(event.key);
            }
          }}
          onChange={() => {
            // input remains uncontrolled via keydown handlers.
          }}
          value=""
        />
      </div>

      <WordleGrid
        grid={state.grid}
        activeRow={state.activeRow}
        activeCol={state.activeCol}
        onTileTap={handleTileTap}
      />

      <LetterKeyboard onLetter={handleLetter} onBackspace={handleBackspace} />

      {state.viewMode === 'hints' ? (
        <HintsPanel
          constraints={constraints}
          stats={stats}
          previousCandidateCount={lastCandidateCount}
          explorationHints={explorationHints}
          conflictFixes={conflictFixes}
          onApplyConflictFix={handleApplyConflictFix}
        />
      ) : (
        <CandidatesPanel
          totalCount={candidates.length}
          shownCandidates={shownCandidates}
          showingAll={state.showAllCandidates}
          onToggleShowAll={handleToggleShowAllCandidates}
          onRefreshSample={() => setSampleSeed((value) => value + 1)}
        />
      )}

      <ActionBar
        viewMode={state.viewMode}
        canUndo={history.length > 0}
        onUndo={handleUndo}
        onReset={handleReset}
        onToggleView={handleToggleView}
      />
    </main>
  );
}
