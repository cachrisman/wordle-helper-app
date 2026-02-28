import { CandidateStats, Constraints } from '../types';
import { ExplorationHints } from '../lib/hints';

interface ConflictFix {
  conflictId: string;
  actionLabel: string;
}

interface HintsPanelProps {
  constraints: Constraints;
  stats: CandidateStats;
  previousCandidateCount: number | null;
  explorationHints: ExplorationHints;
  conflictFixes: ConflictFix[];
  onApplyConflictFix: (conflictId: string) => void;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function HintsPanel({
  constraints,
  stats,
  previousCandidateCount,
  explorationHints,
  conflictFixes,
  onApplyConflictFix
}: HintsPanelProps) {
  return (
    <section className="panel">
      <h2>Hints (default)</h2>
      <p className="helper-text">
        This tool gives hints; it won&apos;t pick the answer for you.
      </p>

      <div className="metric-block">
        <h3>Remaining candidates</h3>
        <p className="metric-value">{stats.candidateCount}</p>
        {previousCandidateCount !== null && previousCandidateCount !== stats.candidateCount && (
          <p className="metric-delta">
            {previousCandidateCount} → {stats.candidateCount}
          </p>
        )}
      </div>

      <div className="hint-grid">
        <article>
          <h3>Letter frequency (overall)</h3>
          <ul className="chip-list">
            {stats.overallFrequency.slice(0, 10).map((entry) => (
              <li key={entry.letter} className="chip">
                <strong>{entry.letter.toUpperCase()}</strong>
                <span>{formatPercent(entry.ratio)}</span>
              </li>
            ))}
          </ul>
        </article>

        <article>
          <h3>Best letters to probe</h3>
          <ul className="chip-list">
            {explorationHints.lettersToProbe.map((letter) => (
              <li key={letter} className="chip chip-secondary">
                {letter.toUpperCase()}
              </li>
            ))}
          </ul>
          <ul className="guidance-list">
            {explorationHints.guidance.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="position-frequency">
        <h3>By position</h3>
        <div className="position-columns">
          {stats.positionFrequency.map((entries, idx) => (
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

      <div className="conflicts">
        <h3>Conflict checks</h3>
        {constraints.conflicts.length === 0 ? (
          <p>No contradictions detected.</p>
        ) : (
          <ul className="conflict-list">
            {constraints.conflicts.map((conflict) => {
              const fix = conflictFixes.find((item) => item.conflictId === conflict.id);
              return (
                <li key={conflict.id}>
                  <p>{conflict.message}</p>
                  {fix && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onApplyConflictFix(conflict.id)}
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
    </section>
  );
}
