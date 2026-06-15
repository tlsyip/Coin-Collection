import { Coin } from '../models/coin';
import { log } from '../logging';

const STORAGE_KEY = 'coin-collection';

export function loadCoins(): Coin[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    log('LOAD COINS: 0 coins loaded');
    return [];
  }

  try {
    const coins = JSON.parse(raw) as Coin[];
    log(`LOAD COINS: ${coins.length} coins loaded`);
    return coins;
  } catch (error) {
    log('ERROR: Could not parse saved coins');
    return [];
  }
}

export function saveCoins(coins: Coin[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coins));
  log(`SAVE COINS: ${coins.length} coins saved`);
}

export function addCoin(coin: Coin) {
  const coins = loadCoins();
  coins.push(coin);
  saveCoins(coins);
  log(`ADD COIN: ${coin.nickname || coin.id} saved`);
}
