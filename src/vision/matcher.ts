import type { Coin } from '../models/coin';
import type { Fingerprint } from './fingerprint';
import { log } from '../logging';
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
  coins: Coin[] = [],
): CoinMatchResult {
  if (!coins || coins.length === 0) {
    log('MATCHER: No coins found, skipping comparison');
    return {
      score: 1,
      classification: 'new coin',
      phashScore: 1,
      colorScore: 1,
      embeddingScore: 1,
      coin: null,
    };
  }

  log(`MATCHER: Proceeding with comparison (${coins.length} coins)`);

  let bestMatch: CoinMatchResult | null = null;

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
    if (!bestMatch || result.score > bestMatch.score) {
      bestMatch = {
        ...result,
        coin,
      };
    }
  }

  const finalMatch = bestMatch ?? {
    score: 1,
    classification: 'new coin',
    phashScore: 1,
    colorScore: 1,
    embeddingScore: 1,
    coin: null,
  };

  log(`MATCH RESULT: ${finalMatch.classification.toUpperCase()} ${finalMatch.score.toFixed(3)}`);
  return finalMatch;
}
