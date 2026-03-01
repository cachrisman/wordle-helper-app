const BRITISH_VARIANTS = new Set(['fibre', 'litre', 'metre', 'sulph']);
const NAME_LIKE_WORDS = new Set([
  'aaron',
  'davis',
  'dylan',
  'james',
  'jones',
  'kevin',
  'logan',
  'maria',
  'peter',
  'sarah',
  'susan'
]);

function zipfToWeight(zipf: number | undefined): number {
  const safeZipf = Number.isFinite(zipf) ? Number(zipf) : 0;
  return Math.max(1e-8, 10 ** (safeZipf - 6.5));
}

function applyWordlebotLikePenalty(word: string, baseWeight: number): number {
  let weight = baseWeight;

  if (word.endsWith('ed')) {
    weight *= 0.01;
  }

  const pluralLike =
    (word.endsWith('es') && !word.endsWith('sses')) ||
    (word.endsWith('s') && !word.endsWith('ss'));
  if (pluralLike) {
    weight *= 0.001;
  }

  if (BRITISH_VARIANTS.has(word)) {
    weight *= 0.7;
  }

  if (word.endsWith('ly') || word.endsWith('ish')) {
    weight *= 0.7;
  }

  if (NAME_LIKE_WORDS.has(word)) {
    weight *= 0.55;
  }

  return Math.max(1e-10, weight);
}

export function buildPriorScores(
  dictionaryWords: string[],
  frequencyByWord: Record<string, number>
): Record<string, number> {
  const scores: Record<string, number> = {};
  dictionaryWords.forEach((word) => {
    const base = zipfToWeight(frequencyByWord[word]);
    scores[word] = applyWordlebotLikePenalty(word, base);
  });
  return scores;
}

export function normalizeWeights(
  words: string[],
  priorScores: Record<string, number>
): Record<string, number> {
  const weights: Record<string, number> = {};
  let total = 0;

  words.forEach((word) => {
    const score = Math.max(0, priorScores[word] ?? 0);
    weights[word] = score;
    total += score;
  });

  if (total <= 0) {
    const uniform = words.length > 0 ? 1 / words.length : 0;
    words.forEach((word) => {
      weights[word] = uniform;
    });
    return weights;
  }

  words.forEach((word) => {
    weights[word] = weights[word] / total;
  });

  return weights;
}

export function effectiveCandidateCount(words: string[], weights: Record<string, number>): number {
  if (words.length === 0) {
    return 0;
  }
  let squaredMass = 0;
  words.forEach((word) => {
    const p = weights[word] ?? 0;
    squaredMass += p * p;
  });
  if (squaredMass <= 0) {
    return words.length;
  }
  return 1 / squaredMass;
}
