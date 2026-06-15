export type CoinFingerprint = {
  pHashFront: string;
  pHashBack: string;
  colorHistogramFront: number[];
  colorHistogramBack: number[];
  frontEmbedding: number[];
  backEmbedding: number[];
};

export type Coin = {
  id: string;
  nickname?: string;
  frontImagePath: string;
  backImagePath: string;
  dateAdded: string;
  visualFingerprintVersion: string;
} & CoinFingerprint;
