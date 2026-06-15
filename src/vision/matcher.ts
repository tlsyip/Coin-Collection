import type { Coin } from '../models/coin';
import type { Fingerprint } from './fingerprint';
import {
  compareEmbedding,
  compareHistogram,
  comparePhash,
  classifyMatch,
  scoreMatch,
} from './fingerprint';

export type CoinMatchResult = {
  score: number;
  classification: 'already in collection' | 'possible match' | 'new coin';
  phashScore: number;
  colorScore: number;
  embeddingScore: number;
  coin: Coin | null;
};

export function compareCoinFingerprints(
  newFront: Fingerprint,
  newBack: Fingerprint,
  storedFront: Fingerprint,
  storedBack: Fingerprint,
) {
  const phashScore =
    (comparePhash(newFront.pHash, storedFront.pHash) + comparePhash(newBack.pHash, storedBack.pHash)) / 2;

  const colorScore =
    (compareHistogram(newFront.colorHistogram, storedFront.colorHistogram) +
      compareHistogram(newBack.colorHistogram, storedBack.colorHistogram)) /
    2;

  const embeddingScore =
    (compareEmbedding(newFront.embedding, storedFront.embedding) +
      compareEmbedding(newBack.embedding, storedBack.embedding)) /
    2;

  const score = scoreMatch(phashScore, colorScore, embeddingScore);
  return {
    score,
    classification: classifyMatch(score),
    phashScore,
    colorScore,
    embeddingScore,
  };
}

export function findBestMatch(
  newFront: Fingerprint,
  newBack: Fingerprint,
  coins: Coin[],
): CoinMatchResult {
  let bestMatch: CoinMatchResult = {
    score: 0,
    classification: 'new coin',
    phashScore: 0,
    colorScore: 0,
    embeddingScore: 0,
    coin: null,
  };

  for (const coin of coins) {
    const storedFront: Fingerprint = {
      pHash: coin.pHashFront,
      colorHistogram: coin.colorHistogramFront,
      embedding: coin.frontEmbedding,
    };
    const storedBack: Fingerprint = {
      pHash: coin.pHashBack,
      colorHistogram: coin.colorHistogramBack,
      embedding: coin.backEmbedding,
    };

    const result = compareCoinFingerprints(newFront, newBack, storedFront, storedBack);
    if (result.score > bestMatch.score) {
      bestMatch = {
        ...result,
        coin,
      };
    }
  }

  return bestMatch;
}
