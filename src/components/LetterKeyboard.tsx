const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

interface LetterKeyboardProps {
  onLetter: (letter: string) => void;
  onBackspace: () => void;
}

export function LetterKeyboard({ onLetter, onBackspace }: LetterKeyboardProps) {
  return (
    <section className="panel">
      <h2>Letter input</h2>
      <p className="helper-text">
        Use your phone keyboard or this on-screen keyboard. Backspace moves backward.
      </p>
      <div className="keyboard">
        {KEYBOARD_ROWS.map((row) => (
          <div className="keyboard-row" key={row}>
            {row.split('').map((letter) => (
              <button
                key={letter}
                type="button"
                className="keyboard-key"
                onClick={() => onLetter(letter)}
                aria-label={`Insert letter ${letter.toUpperCase()}`}
              >
                {letter.toUpperCase()}
              </button>
            ))}
          </div>
        ))}
        <div className="keyboard-row">
          <button
            type="button"
            className="keyboard-key keyboard-wide"
            onClick={onBackspace}
            aria-label="Backspace"
          >
            Backspace
          </button>
        </div>
      </div>
    </section>
  );
}
