import { FeedbackValue } from '../types';

export function computeFeedback(guess: string, solution: string): FeedbackValue[] {
  const normalizedGuess = guess.toLowerCase();
  const normalizedSolution = solution.toLowerCase();
  const feedback: FeedbackValue[] = [0, 0, 0, 0, 0];
  const taken = [false, false, false, false, false];

  for (let idx = 0; idx < 5; idx += 1) {
    if (normalizedGuess[idx] === normalizedSolution[idx]) {
      feedback[idx] = 2;
      taken[idx] = true;
    }
  }

  for (let guessIdx = 0; guessIdx < 5; guessIdx += 1) {
    if (feedback[guessIdx] === 2) {
      continue;
    }

    const letter = normalizedGuess[guessIdx];
    let foundIdx = -1;

    for (let solutionIdx = 0; solutionIdx < 5; solutionIdx += 1) {
      if (!taken[solutionIdx] && normalizedSolution[solutionIdx] === letter) {
        foundIdx = solutionIdx;
        break;
      }
    }

    if (foundIdx >= 0) {
      feedback[guessIdx] = 1;
      taken[foundIdx] = true;
    }
  }

  return feedback;
}

export function encodePattern(pattern: FeedbackValue[]): string {
  return pattern.join('');
}
