import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import allowedGuessesRaw from './assets/allowed-guesses.txt?raw';
import dictionaryRaw from './assets/dictionary.txt?raw';
import frequencyByWord from './assets/frequency.json';
import { ActionBar } from './components/ActionBar';
import { CandidatesPanel } from './components/CandidatesPanel';
import { HintsPanel } from './components/HintsPanel';
import { LetterKeyboard } from './components/LetterKeyboard';
import { OfflineIndicator } from './components/OfflineIndicator';
import { WordleGrid } from './components/WordleGrid';
import {
  computeLetterStats,
  entropyBits,
  rankExplorationGuesses,
  suggestHighValueLetters
} from './lib/analysis';
import { buildConstraintsFromGrid, deriveKeyboardLetterState, filterWords } from './lib/constraints';
import { cloneGrid, createEmptyGrid, cycleTileFeedback, normalizeLetter } from './lib/grid';
import { buildPriorScores, effectiveCandidateCount, normalizeWeights } from './lib/prior';
import { loadPersistedState, savePersistedState } from './lib/storage';
import { Constraints, PersistedState, ThemePreference } from './types';

const PAGE_SIZE = 50;

const parseWordList = (raw: string) =>
  raw
    .split(/\s+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => /^[a-z]{5}$/.test(word));

const ALLOWED_GUESSES = parseWordList(allowedGuessesRaw);
const DICTIONARY_WORDS = parseWordList(dictionaryRaw);
const PRIOR_SCORES = buildPriorScores(
  DICTIONARY_WORDS,
  frequencyByWord as Record<string, number>
);

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

function getFilledCountForRow(grid: PersistedState['grid'], row: number) {
  return grid[row].filter((cell) => !!cell.letter).length;
}

function labelForConflict(constraints: Constraints, actionId: string): string {
  const conflict = constraints.conflicts.find((item) => item.id === actionId);
  if (!conflict) {
    return 'Relax this clue';
  }

  switch (conflict.type) {
    case 'positionExcluded':
      return 'Clear conflicting yellow tile';
    case 'minExceedsMax':
      return `Relax letter cap for "${conflict.letter?.toUpperCase()}"`;
    case 'greenPositionConflict':
      return 'Keep latest green letter';
    case 'feedbackMismatch':
      return 'Clear this row';
    default:
      return 'Relax this clue';
  }
}

function clearCell(state: PersistedState, row: number, col: number): PersistedState {
  const grid = cloneGrid(state.grid);
  grid[row][col] = { letter: '', feedback: null };
  return {
    ...state,
    grid,
    activeRow: row,
    activeCol: col
  };
}

function applyFixAction(state: PersistedState, constraints: Constraints, actionId: string): PersistedState {
  if (actionId.startsWith('rescue:clearCell:')) {
    const [, , rowStr, colStr] = actionId.split(':');
    const row = Number(rowStr);
    const col = Number(colStr);
    if (Number.isInteger(row) && Number.isInteger(col)) {
      return clearCell(state, row, col);
    }
  }

  const conflict = constraints.conflicts.find((item) => item.id === actionId);
  if (!conflict) {
    return state;
  }

  const grid = cloneGrid(state.grid);
  let changed = false;

  if (conflict.type === 'positionExcluded' && conflict.letter && conflict.position !== undefined) {
    for (let row = 0; row < grid.length; row += 1) {
      const cell = grid[row][conflict.position];
      if (cell.letter.toLowerCase() === conflict.letter && cell.feedback === 1) {
        grid[row][conflict.position] = { ...cell, feedback: 0 };
        changed = true;
        break;
      }
    }
  } else if (conflict.type === 'minExceedsMax' && conflict.letter) {
    for (let row = 0; row < grid.length; row += 1) {
      for (let col = 0; col < grid[row].length; col += 1) {
        const cell = grid[row][col];
        if (cell.letter.toLowerCase() === conflict.letter && cell.feedback === 0) {
          grid[row][col] = { ...cell, feedback: 1 };
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  } else if (conflict.type === 'greenPositionConflict' && conflict.position !== undefined) {
    const greenRows: number[] = [];
    for (let row = 0; row < grid.length; row += 1) {
      if (grid[row][conflict.position].feedback === 2) {
        greenRows.push(row);
      }
    }
    if (greenRows.length > 1) {
      const keepRow = greenRows[greenRows.length - 1];
      for (const row of greenRows) {
        if (row !== keepRow) {
          grid[row][conflict.position] = {
            ...grid[row][conflict.position],
            feedback: 1
          };
          changed = true;
        }
      }
    }
  } else if (conflict.type === 'feedbackMismatch' && conflict.row !== undefined) {
    for (let col = 0; col < grid[conflict.row].length; col += 1) {
      grid[conflict.row][col] = { letter: '', feedback: null };
    }
    changed = true;
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
  const [lastCounts, setLastCounts] = useState<{ valid: number; likely: number } | null>(null);
  const [sampleSeed, setSampleSeed] = useState(0);
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  const validCountRef = useRef(0);
  const likelyCountRef = useRef(0);

  const constraints = useMemo(() => buildConstraintsFromGrid(state.grid), [state.grid]);
  const validGuessesRemaining = useMemo(
    () => filterWords(ALLOWED_GUESSES, constraints),
    [constraints]
  );
  const likelySolutionsRemaining = useMemo(
    () => filterWords(DICTIONARY_WORDS, constraints),
    [constraints]
  );
  const likelyWeights = useMemo(
    () => normalizeWeights(likelySolutionsRemaining, PRIOR_SCORES),
    [likelySolutionsRemaining]
  );
  const weightedEffectiveRemaining = useMemo(
    () => effectiveCandidateCount(likelySolutionsRemaining, likelyWeights),
    [likelySolutionsRemaining, likelyWeights]
  );
  const letterStats = useMemo(
    () => computeLetterStats(likelySolutionsRemaining, likelyWeights),
    [likelySolutionsRemaining, likelyWeights]
  );
  const highValueLetters = useMemo(
    () => suggestHighValueLetters(likelySolutionsRemaining, likelyWeights, 10),
    [likelySolutionsRemaining, likelyWeights]
  );
  const keyboardLetterState = useMemo(
    () => deriveKeyboardLetterState(constraints, state.grid),
    [constraints, state.grid]
  );

  const rankedLikelySolutions = useMemo(
    () =>
      [...likelySolutionsRemaining]
        .map((word) => ({ word, probability: likelyWeights[word] ?? 0 }))
        .sort((a, b) => b.probability - a.probability),
    [likelySolutionsRemaining, likelyWeights]
  );

  const sampledCandidates = useMemo(() => {
    if (rankedLikelySolutions.length <= 20) {
      return rankedLikelySolutions;
    }
    const copy = [...rankedLikelySolutions];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, 20);
  }, [rankedLikelySolutions, sampleSeed]);

  const totalPages = Math.max(1, Math.ceil(rankedLikelySolutions.length / PAGE_SIZE));
  const pagedCandidates = useMemo(() => {
    const page = Math.min(state.candidatePage, totalPages);
    const start = (page - 1) * PAGE_SIZE;
    return rankedLikelySolutions.slice(start, start + PAGE_SIZE);
  }, [rankedLikelySolutions, state.candidatePage, totalPages]);

  const shownCandidates = state.showAllCandidates ? pagedCandidates : sampledCandidates;

  const entropy = useMemo(
    () => entropyBits(likelySolutionsRemaining, likelyWeights),
    [likelySolutionsRemaining, likelyWeights]
  );

  const explorationGuesses = useMemo(() => {
    if (!state.showExplorationGuesses || likelySolutionsRemaining.length === 0) {
      return [];
    }
    const letterValue = new Map(highValueLetters.map((entry) => [entry.letter, entry.score]));
    const guessPoolSource = state.hardMode ? validGuessesRemaining : ALLOWED_GUESSES;
    const topLikely = rankedLikelySolutions.slice(0, 35).map((entry) => entry.word);
    const exploratoryPool = [...guessPoolSource]
      .map((guess) => {
        const uniqueLetters = [...new Set(guess)];
        const diversityScore = uniqueLetters.reduce(
          (sum, letter) => sum + (letterValue.get(letter) ?? 0),
          0
        );
        return { guess, diversityScore };
      })
      .sort((a, b) => b.diversityScore - a.diversityScore)
      .slice(0, 45)
      .map((entry) => entry.guess);
    const mergedPool = [...new Set([...topLikely, ...exploratoryPool])].slice(0, 55);
    return rankExplorationGuesses(
      mergedPool,
      likelySolutionsRemaining,
      likelyWeights,
      state.hardMode,
      8
    );
  }, [
    ALLOWED_GUESSES,
    highValueLetters,
    likelySolutionsRemaining,
    likelyWeights,
    rankedLikelySolutions,
    state.hardMode,
    state.showExplorationGuesses,
    validGuessesRemaining
  ]);

  const resolvedTheme: ThemePreference = state.followSystemTheme
    ? systemPrefersDark
      ? 'dark'
      : 'light'
    : state.themePreference;

  useEffect(() => {
    validCountRef.current = validGuessesRemaining.length;
    likelyCountRef.current = likelySolutionsRemaining.length;
  }, [validGuessesRemaining.length, likelySolutionsRemaining.length]);

  useEffect(() => {
    savePersistedState({
      ...state,
      constraintsSnapshot: constraints
    });
  }, [state, constraints]);

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

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const commit = useCallback((updater: (prev: PersistedState) => PersistedState) => {
    setState((prev) => {
      const next = updater(prev);
      if (next === prev) {
        return prev;
      }
      setHistory((entries) => [...entries, prev].slice(-120));
      setLastCounts({
        valid: validCountRef.current,
        likely: likelyCountRef.current
      });
      return next;
    });
  }, []);

  const handleTileTap = useCallback(
    (row: number, col: number) => {
      commit((prev) => {
        const nextGrid = cloneGrid(prev.grid);
        const current = nextGrid[row][col];
        if (current.letter && current.feedback !== null) {
          nextGrid[row][col] = {
            ...current,
            feedback: cycleTileFeedback(current.feedback)
          };
        }
        return {
          ...prev,
          grid: nextGrid,
          activeRow: row,
          activeCol: col
        };
      });
    },
    [commit]
  );

  const handleTileLongPress = useCallback(
    (row: number, col: number) => {
      commit((prev) => clearCell(prev, row, col));
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
        nextGrid[activeRow][activeCol] = {
          ...targetCell,
          letter,
          feedback: targetCell.feedback ?? 0
        };
        const cursor =
          activeCol < colCount - 1
            ? { row: activeRow, col: activeCol + 1 }
            : { row: activeRow, col: activeCol };
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
        nextGrid[activeRow][activeCol] = { letter: '', feedback: null };
        const previous = previousCell(activeRow, activeCol);
        activeRow = previous.row;
        activeCol = previous.col;
      } else {
        const previous = previousCell(activeRow, activeCol);
        activeRow = previous.row;
        activeCol = previous.col;
        const previousCellState = nextGrid[activeRow][activeCol];
        nextGrid[activeRow][activeCol] = { ...previousCellState, letter: '', feedback: null };
      }

      return {
        ...prev,
        grid: nextGrid,
        activeRow,
        activeCol
      };
    });
  }, [commit]);

  const handleEnter = useCallback(() => {
    commit((prev) => {
      const rowFilled = getFilledCountForRow(prev.grid, prev.activeRow) === 5;
      if (!rowFilled) {
        return prev;
      }
      if (prev.activeRow >= prev.grid.length - 1) {
        return prev;
      }
      return {
        ...prev,
        activeRow: prev.activeRow + 1,
        activeCol: 0
      };
    });
  }, [commit]);

  const handleKeyboardKey = useCallback(
    (key: string) => {
      if (/^[a-zA-Z]$/.test(key)) {
        handleLetter(key);
      } else if (key === 'Backspace') {
        handleBackspace();
      } else if (key === 'Enter') {
        handleEnter();
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
    [commit, handleBackspace, handleEnter, handleLetter]
  );

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (
        /^[a-zA-Z]$/.test(event.key) ||
        ['Backspace', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)
      ) {
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
      showAllCandidates: false,
      candidatePage: 1
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
      showAllCandidates: !prev.showAllCandidates,
      candidatePage: 1
    }));
  }, [commit]);

  const conflictFixes = useMemo(
    () =>
      constraints.conflicts
        .map((conflict) => ({
          id: conflict.id,
          actionLabel: labelForConflict(constraints, conflict.id),
          summary: conflict.message
        }))
        .slice(0, 6),
    [constraints]
  );

  const rescueActions = useMemo(() => {
    if (likelySolutionsRemaining.length > 0) {
      return [];
    }
    const actions: Array<{ id: string; actionLabel: string; summary: string }> = [];
    for (let row = state.grid.length - 1; row >= 0; row -= 1) {
      for (let col = state.grid[row].length - 1; col >= 0; col -= 1) {
        const cell = state.grid[row][col];
        if (!cell.letter) {
          continue;
        }
        const label = cell.feedback === 2 ? 'Relax this green tile' : 'Relax this clue tile';
        actions.push({
          id: `rescue:clearCell:${row}:${col}`,
          actionLabel: label,
          summary: `Try clearing ${cell.letter.toUpperCase()} at row ${row + 1}, col ${col + 1}.`
        });
        if (actions.length >= 3) {
          return actions;
        }
      }
    }
    return actions;
  }, [likelySolutionsRemaining.length, state.grid]);

  const handleApplyFix = useCallback(
    (actionId: string) => {
      commit((prev) => applyFixAction(prev, constraints, actionId));
    },
    [commit, constraints]
  );

  const handleToggleTheme = useCallback(() => {
    commit((prev) => ({
      ...prev,
      followSystemTheme: false,
      themePreference: prev.themePreference === 'dark' ? 'light' : 'dark'
    }));
  }, [commit]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Wordle Hint Coach</p>
        <h1>Hints-first puzzle assistant</h1>
        <p className="intro">
          This tool gives hints and analysis; it won&apos;t pick the answer for you.
        </p>
      </header>

      <OfflineIndicator isOffline={isOffline} />

      <WordleGrid
        grid={state.grid}
        activeRow={state.activeRow}
        activeCol={state.activeCol}
        onTileTap={handleTileTap}
        onTileLongPress={handleTileLongPress}
      />

      <LetterKeyboard
        onLetter={handleLetter}
        onBackspace={handleBackspace}
        onEnter={handleEnter}
        letterState={keyboardLetterState}
      />

      {state.viewMode === 'hints' ? (
        <HintsPanel
          constraints={constraints}
          validGuessesRemaining={validGuessesRemaining.length}
          likelySolutionsRemaining={likelySolutionsRemaining.length}
          weightedEffectiveRemaining={weightedEffectiveRemaining}
          previousValidGuessesRemaining={lastCounts?.valid ?? null}
          previousLikelySolutionsRemaining={lastCounts?.likely ?? null}
          letterStats={letterStats}
          highValueLetters={highValueLetters}
          explorationGuesses={explorationGuesses}
          showExplorationGuesses={state.showExplorationGuesses}
          entropyBits={entropy}
          conflictFixes={conflictFixes}
          rescueActions={rescueActions}
          hardMode={state.hardMode}
          followSystemTheme={state.followSystemTheme}
          onApplyFix={handleApplyFix}
          onToggleExplorationGuesses={() =>
            commit((prev) => ({ ...prev, showExplorationGuesses: !prev.showExplorationGuesses }))
          }
          onToggleHardMode={() => commit((prev) => ({ ...prev, hardMode: !prev.hardMode }))}
          onToggleFollowSystemTheme={() =>
            commit((prev) => ({ ...prev, followSystemTheme: !prev.followSystemTheme }))
          }
        />
      ) : (
        <CandidatesPanel
          totalCount={likelySolutionsRemaining.length}
          shownCandidates={shownCandidates}
          showingAll={state.showAllCandidates}
          currentPage={Math.min(state.candidatePage, totalPages)}
          totalPages={totalPages}
          onToggleShowAll={handleToggleShowAllCandidates}
          onRefreshSample={() => setSampleSeed((value) => value + 1)}
          onPrevPage={() =>
            commit((prev) => ({
              ...prev,
              candidatePage: Math.max(1, prev.candidatePage - 1)
            }))
          }
          onNextPage={() =>
            commit((prev) => ({
              ...prev,
              candidatePage: Math.min(totalPages, prev.candidatePage + 1)
            }))
          }
        />
      )}

      <ActionBar
        viewMode={state.viewMode}
        resolvedTheme={resolvedTheme}
        canUndo={history.length > 0}
        onUndo={handleUndo}
        onReset={handleReset}
        onToggleView={handleToggleView}
        onToggleTheme={handleToggleTheme}
      />
    </main>
  );
}
