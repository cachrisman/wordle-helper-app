interface CandidatesPanelProps {
  totalCount: number;
  shownCandidates: Array<{ word: string; probability: number }>;
  showingAll: boolean;
  currentPage: number;
  totalPages: number;
  onToggleShowAll: () => void;
  onRefreshSample: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}

export function CandidatesPanel({
  totalCount,
  shownCandidates,
  showingAll,
  currentPage,
  totalPages,
  onToggleShowAll,
  onRefreshSample,
  onNextPage,
  onPrevPage
}: CandidatesPanelProps) {
  return (
    <section className="panel panel-secondary">
      <h2>Candidates (secondary)</h2>
      <p className="helper-text">
        Candidate words are shown for reference only. Use hints first for strategy.
      </p>

      <div className="candidate-controls">
        <button type="button" className="secondary-button" onClick={onToggleShowAll}>
          {showingAll ? 'Show random sample' : `Show paginated list (${totalCount})`}
        </button>
        {!showingAll && totalCount > 20 && (
          <button type="button" className="secondary-button" onClick={onRefreshSample}>
            New sample
          </button>
        )}
      </div>

      <ul className="candidate-list" aria-live="polite">
        {shownCandidates.map(({ word, probability }) => (
          <li key={word}>
            <span>{word.toUpperCase()}</span>
            <small>{(probability * 100).toFixed(2)}%</small>
          </li>
        ))}
      </ul>

      {showingAll && totalPages > 1 && (
        <div className="candidate-controls">
          <button
            type="button"
            className="secondary-button"
            disabled={currentPage <= 1}
            onClick={onPrevPage}
          >
            Prev page
          </button>
          <span className="helper-text">
            Page {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            className="secondary-button"
            disabled={currentPage >= totalPages}
            onClick={onNextPage}
          >
            Next page
          </button>
        </div>
      )}
      {shownCandidates.length === 0 && <p>No candidates to display.</p>}
    </section>
  );
}
