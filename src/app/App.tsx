import React, { useEffect, useState } from 'react';
import { addCoin, loadCoins } from '../storage/localStore';
import { processCoinImage, loadImageElement } from '../vision/imageProcessor';
import { generateFingerprint } from '../vision/fingerprint';
import { findBestMatch } from '../vision/matcher';
import type { Coin } from '../models/coin';
import type { Fingerprint } from '../vision/fingerprint';

type PendingCoin = {
  frontImagePath: string;
  backImagePath: string;
  frontFingerprint: Fingerprint;
  backFingerprint: Fingerprint;
};

const readDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function App() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [bestMatch, setBestMatch] = useState<Coin | null>(null);
  const [pendingCoin, setPendingCoin] = useState<PendingCoin | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    setCoins(loadCoins());
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!frontFile || !backFile) {
      return;
    }

    setStatus('Processing images...');
    const [frontDataUrl, backDataUrl] = await Promise.all([readDataUrl(frontFile), readDataUrl(backFile)]);

    const [normalizedFront, normalizedBack] = await Promise.all([
      processCoinImage(frontDataUrl),
      processCoinImage(backDataUrl),
    ]);

    const [frontImage, backImage] = await Promise.all([
      loadImageElement(normalizedFront.dataUrl),
      loadImageElement(normalizedBack.dataUrl),
    ]);

    const [frontFingerprint, backFingerprint] = await Promise.all([
      generateFingerprint(frontImage),
      generateFingerprint(backImage),
    ]);

    const match = findBestMatch(frontFingerprint, backFingerprint, coins);
    setResult(match.classification);
    setScore(match.score);
    setBestMatch(match.coin);

    const coinPayload: PendingCoin = {
      frontImagePath: normalizedFront.dataUrl,
      backImagePath: normalizedBack.dataUrl,
      frontFingerprint,
      backFingerprint,
    };

    if (match.classification === 'new coin') {
      const newCoin: Coin = {
        id: crypto.randomUUID(),
        nickname: '',
        frontImagePath: coinPayload.frontImagePath,
        backImagePath: coinPayload.backImagePath,
        dateAdded: new Date().toISOString(),
        visualFingerprintVersion: '1',
        pHashFront: coinPayload.frontFingerprint.pHash,
        pHashBack: coinPayload.backFingerprint.pHash,
        colorHistogramFront: coinPayload.frontFingerprint.colorHistogram,
        colorHistogramBack: coinPayload.backFingerprint.colorHistogram,
        frontEmbedding: coinPayload.frontFingerprint.embedding,
        backEmbedding: coinPayload.backFingerprint.embedding,
      };
      addCoin(newCoin);
      setCoins(loadCoins());
      setPendingCoin(null);
    } else {
      setPendingCoin(coinPayload);
    }

    setStatus('');
  };

  const handleAddAsNewCoin = () => {
    if (!pendingCoin) {
      return;
    }

    const newCoin: Coin = {
      id: crypto.randomUUID(),
      nickname: '',
      frontImagePath: pendingCoin.frontImagePath,
      backImagePath: pendingCoin.backImagePath,
      dateAdded: new Date().toISOString(),
      visualFingerprintVersion: '1',
      pHashFront: pendingCoin.frontFingerprint.pHash,
      pHashBack: pendingCoin.backFingerprint.pHash,
      colorHistogramFront: pendingCoin.frontFingerprint.colorHistogram,
      colorHistogramBack: pendingCoin.backFingerprint.colorHistogram,
      frontEmbedding: pendingCoin.frontFingerprint.embedding,
      backEmbedding: pendingCoin.backFingerprint.embedding,
    };

    addCoin(newCoin);
    setCoins(loadCoins());
    setPendingCoin(null);
    setResult('new coin');
    setBestMatch(null);
    setScore(null);
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Coin Collection</h1>
        <p>Offline duplicate detection for unique coin types.</p>
      </header>
      <main>
        <section>
          <h2>Check a coin</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <label>
                Front image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setFrontFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div>
              <label>
                Back image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setBackFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <button type="submit">Check coin</button>
          </form>
          {status && <p>{status}</p>}
        </section>

        {result && (
          <section>
            <h2>Result</h2>
            <p>
              Status: <strong>{result}</strong>
            </p>
            <p>Score: {score?.toFixed(3)}</p>
            {bestMatch && <p>Best match: {bestMatch.nickname || bestMatch.id}</p>}
          </section>
        )}

        {pendingCoin && result === 'possible match' && (
          <section>
            <button type="button" onClick={handleAddAsNewCoin}>
              Add as new coin anyway
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
