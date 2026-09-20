import { log } from '../logging';

export type Fingerprint = {
  pHash: string;
  colorHistogram: number[];
  embedding: number[];
};

function createCanvasData(image: HTMLImageElement, width: number, height: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create canvas context for fingerprint generation');
  }
  ctx.drawImage(image, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function toGrayscale(data: Uint8ClampedArray): Float32Array {
  const gray = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    gray[j] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  }
  return gray;
}

function normalizeVector(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    return vector.slice();
  }
  return vector.map((value) => value / norm);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : Math.max(0, Math.min(1, dot / denom));
}

export function generateDHash(image: HTMLImageElement, hashSize = 8): string {
  const width = hashSize + 1;
  const height = hashSize;
  const imageData = createCanvasData(image, width, height);
  const gray = toGrayscale(imageData.data);

  let hash = '';
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < hashSize; x += 1) {
      const left = gray[y * width + x];
      const right = gray[y * width + x + 1];
      hash += left > right ? '1' : '0';
    }
  }
  return hash;
}

export function generateColorHistogram(image: HTMLImageElement, bins = 4, sampleSize = 128): number[] {
  const imageData = createCanvasData(image, sampleSize, sampleSize);
  const histogram = new Array(bins * bins * bins).fill(0);
  const total = sampleSize * sampleSize;

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = Math.floor((imageData.data[i] / 255) * bins);
    const g = Math.floor((imageData.data[i + 1] / 255) * bins);
    const b = Math.floor((imageData.data[i + 2] / 255) * bins);
    const index = Math.min(bins - 1, r) * bins * bins + Math.min(bins - 1, g) * bins + Math.min(bins - 1, b);
    histogram[index] += 1;
  }

  return histogram.map((value) => value / total);
}

export function generateStructuredFeatureVector(
  image: HTMLImageElement,
  gridSize = 4,
  orientationBins = 8,
  sampleSize = 128,
): number[] {
  const imageData = createCanvasData(image, sampleSize, sampleSize);
  const gray = toGrayscale(imageData.data);
  const width = sampleSize;
  const height = sampleSize;
  const cellWidth = Math.floor(width / gridSize);
  const cellHeight = Math.floor(height / gridSize);
  const descriptor = new Array(gridSize * gridSize * orientationBins).fill(0);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = y * width + x;
      const gx = gray[center + 1] - gray[center - 1];
      const gy = gray[center + width] - gray[center - width];
      const magnitude = Math.hypot(gx, gy);
      if (magnitude === 0) {
        continue;
      }
      let angle = Math.atan2(gy, gx);
      if (angle < 0) {
        angle += Math.PI * 2;
      }
      const bin = Math.floor((angle / (Math.PI * 2)) * orientationBins) % orientationBins;
      const cellX = Math.min(gridSize - 1, Math.floor((x / width) * gridSize));
      const cellY = Math.min(gridSize - 1, Math.floor((y / height) * gridSize));
      const cellIndex = cellY * gridSize + cellX;
      descriptor[cellIndex * orientationBins + bin] += magnitude;
    }
  }

  for (let cell = 0; cell < gridSize * gridSize; cell += 1) {
    const offset = cell * orientationBins;
    let cellSum = 0;
    for (let bin = 0; bin < orientationBins; bin += 1) {
      cellSum += descriptor[offset + bin];
    }
    if (cellSum > 0) {
      for (let bin = 0; bin < orientationBins; bin += 1) {
        descriptor[offset + bin] /= cellSum;
      }
    }
  }

  return normalizeVector(descriptor);
}

export function comparePhash(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length || hashA.length === 0) {
    return 0;
  }
  let distance = 0;
  for (let i = 0; i < hashA.length; i += 1) {
    if (hashA[i] !== hashB[i]) {
      distance += 1;
    }
  }
  return 1 - distance / hashA.length;
}

export function compareHistogram(histA: number[], histB: number[]): number {
  return cosineSimilarity(histA, histB);
}

export function compareEmbedding(embA: number[], embB: number[]): number {
  return cosineSimilarity(embA, embB);
}

export function scoreMatch(phashScore: number, colorScore: number, embeddingScore: number) {
  return phashScore * 0.2 + colorScore * 0.3 + embeddingScore * 0.5;
}

export function classifyMatch(score: number): 'already in collection' | 'possible match' | 'new coin' {
  if (score >= 0.95) {
    return 'already in collection';
  }
  if (score >= 0.8) {
    return 'possible match';
  }
  return 'new coin';
}

export async function generateFingerprint(image: HTMLImageElement): Promise<Fingerprint> {
  log('FINGERPRINT START');
  try {
    const fingerprint = {
      pHash: generateDHash(image),
      colorHistogram: generateColorHistogram(image),
      embedding: generateStructuredFeatureVector(image),
    };
    log('FINGERPRINT SUCCESS');
    return fingerprint;
  } catch (error) {
    log(`IMAGE PROCESSING ERROR: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
