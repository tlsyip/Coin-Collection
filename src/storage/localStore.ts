import { Coin } from '../models/coin';

const STORAGE_KEY = 'coin-collection';

export function loadCoins(): Coin[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as Coin[];
  } catch {
    return [];
  }
}

export function saveCoins(coins: Coin[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coins));
}

export function addCoin(coin: Coin) {
  const coins = loadCoins();
  coins.push(coin);
  saveCoins(coins);
}
