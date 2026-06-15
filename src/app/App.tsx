import React, { useEffect, useState } from 'react';
import { addCoin, loadCoins, saveCoins } from '../storage/localStore';
import { processCoinImage, loadImageElement } from '../vision/imageProcessor';
import { generateFingerprint } from '../vision/fingerprint';
import { findBestMatch } from '../vision/matcher';
import { safeUUID } from '../utils/uuid';
import DebugPanel from './DebugPanel';
import { log } from '../logging';
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
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [status, setStatus] = useState<string>('');
  const [showCollection, setShowCollection] = useState(false);

  useEffect(() => {
    const loaded = loadCoins();
    setCoins(loaded);
  }, []);

  useEffect(() => {
    if (selectedCoin && !coins.some((coin) => coin.id === selectedCoin.id)) {
      setSelectedCoin(null);
    }
  }, [coins, selectedCoin]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!frontFile || !backFile) {
      return;
    }

    try {
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

      let match = null;
      if (coins.length === 0) {
        log('MATCHER: No coins in collection → NEW COIN');
        match = {
          score: 1,
          classification: 'new coin' as const,
          phashScore: 1,
          colorScore: 1,
          embeddingScore: 1,
          coin: null,
        };
      } else {
        log(`MATCHER: Proceeding with comparison (${coins.length} coins)`);
        match = findBestMatch(frontFingerprint, backFingerprint, coins);
      }

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
          id: safeUUID(),
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
    } catch (error) {
      log(`IMAGE PROCESSING ERROR: ${error instanceof Error ? error.message : String(error)}`);
      setStatus('An error occurred while processing the coin.');
    } finally {
      setStatus('');
    }
  };

  const handleAddAsNewCoin = () => {
    if (!pendingCoin) {
      return;
    }

    const newCoin: Coin = {
      id: safeUUID(),
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

  const handleSelectCoin = (coin: Coin) => {
    setSelectedCoin(coin);
    setShowCollection(true);
  };

  const handleCloseSelectedCoin = () => {
    setSelectedCoin(null);
  };

  const handleDeleteSelectedCoin = () => {
    if (!selectedCoin) {
      return;
    }

    const remainingCoins = coins.filter((coin) => coin.id !== selectedCoin.id);
    saveCoins(remainingCoins);
    setCoins(remainingCoins);
    setSelectedCoin(null);
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Coin Collection</h1>
        <p>Check if a coin is a new addition to your collection.</p>
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
          <button type="button" onClick={() => setShowCollection(true)} style={{ marginTop: '16px' }}>
            Show Collection ({coins.length})
          </button>
        </section>

        {result && (
          <section>
            <h2>Result</h2>
            <p>
              Status: <strong>{result}</strong>
            </p>
            <p>Score: {score?.toFixed(3)}</p>
            {bestMatch && pendingCoin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div>
                  <p>Uploaded coin</p>
                  <img
                    src={pendingCoin.frontImagePath}
                    alt="Uploaded coin"
                    style={{ width: '100%', maxWidth: '240px', borderRadius: '16px' }}
                  />
                </div>
                <div>
                  <p>Best match</p>
                  <img
                    src={bestMatch.frontImagePath}
                    alt={bestMatch.nickname || 'Best match'}
                    style={{ width: '100%', maxWidth: '240px', borderRadius: '16px' }}
                  />
                </div>
              </div>
            )}
            {bestMatch && !pendingCoin && (
              <div>
                <p>Best match:</p>
                <img
                  src={bestMatch.frontImagePath}
                  alt={bestMatch.nickname || 'Best match'}
                  style={{ maxWidth: '240px', maxHeight: '240px', borderRadius: '16px', marginTop: '8px' }}
                />
              </div>
            )}
          </section>
        )}

        {pendingCoin && result === 'possible match' && (
          <section>
            <button type="button" onClick={handleAddAsNewCoin}>
              Add as new coin anyway
            </button>
          </section>
        )}

        {showCollection && (
          <section
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '90vw',
                maxHeight: '90vh',
                overflow: 'auto',
                position: 'relative',
              }}
            >
              <button
                type="button"
                onClick={() => setShowCollection(false)}
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  padding: '8px 12px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Close
              </button>
              <h2 style={{ marginTop: 0 }}>My Collection ({coins.length} coins)</h2>
              {selectedCoin ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    minHeight: '60vh',
                  }}
                >
                  <img
                    src={selectedCoin.frontImagePath}
                    alt='Selected coin'
                    style={{
                      width: '100%',
                      maxWidth: '320px',
                      borderRadius: '16px',
                      objectFit: 'contain',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedCoin}
                      style={{
                        padding: '14px 18px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        minWidth: '120px',
                        fontSize: '16px',
                      }}
                    >
                      Delete Coin
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseSelectedCoin}
                      style={{
                        padding: '14px 18px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        minWidth: '120px',
                        fontSize: '16px',
                      }}
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : coins.length === 0 ? (
                <p>No coins in your collection yet.</p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: '16px',
                    marginTop: '16px',
                  }}
                >
                  {coins.map((coin) => (
                    <div key={coin.id} style={{ textAlign: 'center' }}>
                      <img
                        src={coin.frontImagePath}
                        alt='Coin image'
                        onClick={() => handleSelectCoin(coin)}
                        style={{
                          width: '100%',
                          height: '120px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <DebugPanel />
    </div>
  );
}

export default App;
