import { useMemo, useState } from 'react';
import { GuessInfoGainScore, LetterStats, Constraints } from '../types';
import { HighValueLetter } from '../lib/analysis';

interface FixAction {
  id: string;
  actionLabel: string;
  summary: string;
}

interface HintsPanelProps {
  constraints: Constraints;
  validGuessesRemaining: number;
  likelySolutionsRemaining: number;
  weightedEffectiveRemaining: number;
  previousValidGuessesRemaining: number | null;
  previousLikelySolutionsRemaining: number | null;
  letterStats: LetterStats;
  highValueLetters: HighValueLetter[];
  explorationGuesses: GuessInfoGainScore[];
  showExplorationGuesses: boolean;
  entropyBits: number;
  conflictFixes: FixAction[];
  rescueActions: FixAction[];
  hardMode: boolean;
  followSystemTheme: boolean;
  onApplyFix: (actionId: string) => void;
  onToggleExplorationGuesses: () => void;
  onToggleHardMode: () => void;
  onToggleFollowSystemTheme: () => void;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function HintsPanel({
  constraints,
  validGuessesRemaining,
  likelySolutionsRemaining,
  weightedEffectiveRemaining,
  previousValidGuessesRemaining,
  previousLikelySolutionsRemaining,
  letterStats,
  highValueLetters,
  explorationGuesses,
  showExplorationGuesses,
  entropyBits,
  conflictFixes,
  rescueActions,
  hardMode,
  followSystemTheme,
  onApplyFix,
  onToggleExplorationGuesses,
  onToggleHardMode,
  onToggleFollowSystemTheme
}: HintsPanelProps) {
  const [expandedLetter, setExpandedLetter] = useState<string | null>(null);

  const explanationByLetter = useMemo(() => {
    const map: Record<string, string> = {};
    letterStats.presenceFrequency.forEach((entry) => {
      const strongest = entry.topPositions.map((pos) => pos + 1).join('/');
      map[
        entry.letter
      ] = `${entry.letter.toUpperCase()} appears in ${formatPercent(entry.ratio)} of likely solutions, most often at positions ${strongest}.`;
    });
    return map;
  }, [letterStats.presenceFrequency]);

  return (
    <section className="panel">
      <h2>Hints (default)</h2>
      <p className="helper-text">
        This tool gives hints and analysis; it won&apos;t pick the answer for you. These are likely
        solutions, not guaranteed.
      </p>

      <div className="metric-block">
        <h3>Remaining words</h3>
        <p className="metric-value">{validGuessesRemaining} valid guesses</p>
        <p className="helper-text">
          {likelySolutionsRemaining} likely solutions ({weightedEffectiveRemaining.toFixed(1)} weighted
          effective)
        </p>
        {previousValidGuessesRemaining !== null &&
          previousLikelySolutionsRemaining !== null &&
          (previousValidGuessesRemaining !== validGuessesRemaining ||
            previousLikelySolutionsRemaining !== likelySolutionsRemaining) && (
          <p className="metric-delta">
            {previousValidGuessesRemaining} → {validGuessesRemaining} guesses,{' '}
            {previousLikelySolutionsRemaining} → {likelySolutionsRemaining} likely solutions
          </p>
        )}
        <p className="helper-text">Current uncertainty: {entropyBits.toFixed(2)} bits</p>
      </div>

      <div className="hint-grid">
        <article>
          <h3>Letter frequency (overall)</h3>
          <ul className="chip-list">
            {letterStats.presenceFrequency.slice(0, 10).map((entry) => (
              <li key={entry.letter} className="chip">
                <button
                  type="button"
                  className="chip-button"
                  onClick={() =>
                    setExpandedLetter((current) => (current === entry.letter ? null : entry.letter))
                  }
                >
                  <strong>{entry.letter.toUpperCase()}</strong>
                  <span>{formatPercent(entry.ratio)}</span>
                </button>
              </li>
            ))}
          </ul>
          {expandedLetter && <p className="helper-text">{explanationByLetter[expandedLetter]}</p>}
        </article>

        <article>
          <h3>High-value letters to try</h3>
          <ul className="chip-list">
            {highValueLetters.map((entry) => (
              <li key={entry.letter} className="chip chip-secondary">
                {entry.letter.toUpperCase()}
              </li>
            ))}
          </ul>
          <ul className="guidance-list">
            {highValueLetters.slice(0, 3).map((entry) => (
              <li key={entry.letter}>{entry.why}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="position-frequency">
        <h3>By position</h3>
        <div className="position-columns">
          {letterStats.byPosition.map((entries, idx) => (
            <article key={`pos-${idx}`} className="position-column">
              <h4>Pos {idx + 1}</h4>
              <ul>
                {entries.slice(0, 5).map((entry) => (
                  <li key={`${idx}-${entry.letter}`}>
                    {entry.letter.toUpperCase()} ({formatPercent(entry.ratio)})
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div className="hint-controls">
        <label className="toggle-row">
          <input type="checkbox" checked={hardMode} onChange={onToggleHardMode} />
          <span>Hard mode (exploration guesses must respect clues)</span>
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={followSystemTheme}
            onChange={onToggleFollowSystemTheme}
          />
          <span>Follow system theme</span>
        </label>
      </div>

      <div className="position-frequency">
        <button type="button" className="secondary-button" onClick={onToggleExplorationGuesses}>
          {showExplorationGuesses ? 'Hide example exploration guesses' : 'Show example exploration guesses'}
        </button>
        {showExplorationGuesses && (
          <ul className="candidate-list">
            {explorationGuesses.map((entry) => (
              <li key={entry.guess}>
                <span>{entry.guess.toUpperCase()}</span>
                <small>
                  {entry.meter}/100 info · {entry.bits.toFixed(2)} bits · exp {entry.expectedRemaining.toFixed(1)}
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="conflicts">
        <h3>Conflict checks</h3>
        {constraints.conflicts.length === 0 ? (
          <p>No contradictions detected.</p>
        ) : (
          <ul className="conflict-list">
            {constraints.conflicts.map((conflict) => {
              const fix = conflictFixes.find((item) => item.id === conflict.id);
              return (
                <li key={conflict.id}>
                  <p>{conflict.message}</p>
                  {fix && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onApplyFix(conflict.id)}
                    >
                      {fix.actionLabel}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {likelySolutionsRemaining === 0 && rescueActions.length > 0 && (
        <div className="conflicts">
          <h3>Zero candidates rescue mode</h3>
          <ul className="conflict-list">
            {rescueActions.slice(0, 3).map((action) => (
              <li key={action.id}>
                <p>{action.summary}</p>
                <button type="button" className="secondary-button" onClick={() => onApplyFix(action.id)}>
                  {action.actionLabel}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
