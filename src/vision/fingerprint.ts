export type Fingerprint = {
  pHash: string;
  colorHistogram: number[];
  embedding: number[];
};

export function comparePhash(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) {
    return 0;
  }
  let same = 0;
  for (let i = 0; i < hashA.length; i += 1) {
    if (hashA[i] === hashB[i]) {
      same += 1;
    }
  }
  return same / hashA.length;
}

export function compareHistogram(histA: number[], histB: number[]): number {
  if (histA.length !== histB.length) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < histA.length; i += 1) {
    const diff = histA[i] - histB[i];
    sum += 1 - Math.abs(diff) / Math.max(histA[i], histB[i], 1);
  }
  return sum / histA.length;
}

export function compareEmbedding(embA: number[], embB: number[]): number {
  if (embA.length !== embB.length || embA.length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < embA.length; i += 1) {
    dot += embA[i] * embB[i];
    normA += embA[i] * embA[i];
    normB += embB[i] * embB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function scoreMatch(phashScore: number, colorScore: number, embeddingScore: number) {
  return phashScore * 0.2 + colorScore * 0.3 + embeddingScore * 0.5;
}
