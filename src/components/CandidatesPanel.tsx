interface CandidatesPanelProps {
  totalCount: number;
  shownCandidates: string[];
  showingAll: boolean;
  onToggleShowAll: () => void;
  onRefreshSample: () => void;
}

export function CandidatesPanel({
  totalCount,
  shownCandidates,
  showingAll,
  onToggleShowAll,
  onRefreshSample
}: CandidatesPanelProps) {
  return (
    <section className="panel panel-secondary">
      <h2>Candidates (secondary)</h2>
      <p className="helper-text">
        Candidate words are shown for reference only. Use hints first for strategy.
      </p>

      <div className="candidate-controls">
        <button type="button" className="secondary-button" onClick={onToggleShowAll}>
          {showingAll ? 'Show random 20' : `Show all (${totalCount})`}
        </button>
        {!showingAll && totalCount > 20 && (
          <button type="button" className="secondary-button" onClick={onRefreshSample}>
            New sample
          </button>
        )}
      </div>

      <ul className="candidate-list" aria-live="polite">
        {shownCandidates.map((word) => (
          <li key={word}>{word.toUpperCase()}</li>
        ))}
      </ul>
      {shownCandidates.length === 0 && <p>No candidates to display.</p>}
    </section>
  );
}
