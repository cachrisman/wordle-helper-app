const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

interface LetterKeyboardProps {
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  letterState: Record<string, 'neutral' | 'grey' | 'yellow' | 'green'>;
}

function vibrate() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(8);
  }
}

export function LetterKeyboard({ onLetter, onEnter, onBackspace, letterState }: LetterKeyboardProps) {
  return (
    <section className="panel">
      <h2>Letter input</h2>
      <p className="helper-text">
        On-screen keyboard is primary for iPhone. Physical keyboard also works.
      </p>
      <div className="keyboard">
        {KEYBOARD_ROWS.map((row) => (
          <div className="keyboard-row" key={row}>
            {row.split('').map((letter) => (
              <button
                key={letter}
                type="button"
                className={`keyboard-key keyboard-${letterState[letter] ?? 'neutral'}`}
                onClick={() => {
                  vibrate();
                  onLetter(letter);
                }}
                aria-label={`Insert letter ${letter.toUpperCase()}`}
              >
                {letter.toUpperCase()}
              </button>
            ))}
            {row === 'zxcvbnm' && (
              <button
                type="button"
                className="keyboard-key keyboard-wide keyboard-backspace"
                onClick={() => {
                  vibrate();
                  onBackspace();
                }}
                aria-label="Backspace"
              >
                ⌫
              </button>
            )}
          </div>
        ))}
        <div className="keyboard-row">
          <button
            type="button"
            className="keyboard-key keyboard-wide"
            onClick={() => {
              vibrate();
              onEnter();
            }}
            aria-label="Enter"
          >
            Enter
          </button>
        </div>
      </div>
    </section>
  );
}
